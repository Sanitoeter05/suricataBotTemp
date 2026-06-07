import { LogLine, webhookData } from '../types/types';
export default class Webhook {

    public static async checkWebhookHealthProccess(webhookData:webhookData[]): Promise<boolean> {
        if(webhookData.length === 0) return true; // If no webhook data is provided, consider it healthy by default
        const healthChecks = webhookData.map(data => 
            Webhook.checkWebhookHealth(
                data.webhookUrl,
                data.webhookToken,
                data.webhookPort
            )
        );
        const results = await Promise.all(healthChecks);
        return results.every(isHealthy => isHealthy);
    }

    private static async checkWebhookHealth(
        webhookUrl: string,
        webhookToken: string,
        webhookPort: number
    ): Promise<boolean> {
        try {
            const response = await fetch(`https://${webhookUrl}:${webhookPort}/webhook/health`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: webhookToken }),
            });
            
            if (!response.ok || response.body === null) {
                throw new Error('Webhook health check failed');
            }
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    public static async sendMessageToWebhookProcess(logData: LogLine, webhookData: webhookData[]): Promise<void> {
        if (webhookData.length === 0) return;
        const sendPromises = webhookData.map(data =>
            Webhook.sendMessageToWebhook(logData, data.webhookUrl, data.webhookPort, data.webhookToken)
        );
        await Promise.all(sendPromises);
    };

    private static async sendMessageToWebhook(logData: LogLine, webhookUrl: string, webhookPort: number, webhookToken: string): Promise<void> {
        try {
            await fetch(
                `https://${webhookUrl}:${webhookPort}/webhook`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: webhookToken,
                        data: logData,
                    }),
                }
            );
        } catch (error) {
            console.error(error);
        }
    }
}
