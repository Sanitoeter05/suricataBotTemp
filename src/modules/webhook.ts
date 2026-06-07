import { LogLine, webhookData } from '../types/types';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable TLS certificate validation for development purposes

export default class Webhook {
    public static async checkWebhookHealthProccess(
        webhookData: webhookData[]
    ): Promise<boolean> {
        if (webhookData.length === 0) return true; // If no webhook data is provided, consider it healthy by default
        const healthChecks = webhookData.map((data) =>
            Webhook.checkWebhookHealth(
                data.webhookUrl,
                data.webhookToken,
                data.webhookPort
            )
        );
        const results = await Promise.all(healthChecks);
        return results.every((isHealthy) => isHealthy);
    }

    private static async checkWebhookHealth(
        webhookUrl: string,
        webhookToken: string,
        webhookPort: number
    ): Promise<boolean> {
        try {
            const response = await fetch(
                `https://${webhookUrl}:${webhookPort}/webhook/health`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: webhookToken }),
                }
            );

            if (!response.ok || response.body === null) {
                throw new Error('Webhook health check failed');
            }
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    public static async sendMessageToWebhookProcess(
        logData: LogLine | LogLine[],
        webhookData: webhookData[]
    ): Promise<number[]> {
        if (webhookData.length === 0) {
            throw new Error('No webhook data provided');
        }
        const responseArray: number[] = [];
        const sendPromises = webhookData.map(async (data) => {
            if (Array.isArray(logData)) {
                if(logData.length >= 200){
                   const logChunks: LogLine[][] = [];
                   for(let i = 0; i < logData.length; i += 200){
                    logChunks.push(logData.slice(i, i + 200));
                   }

                   for (const chunk of logChunks){
                    const logPromises = chunk.map((log) =>
                        Webhook.sendMessageToWebhook(
                            log,
                            data.webhookUrl,
                            data.webhookPort,
                            data.webhookToken
                        )
                    );
                    const results = await Promise.all(logPromises);
                    responseArray.push(...results);
                    await new Promise(resolve => setTimeout(resolve, 200)); // Short delay between chunks to prevent overwhelming the server
                   }
                } else {
                    const logPromises = logData.map((log) =>
                        Webhook.sendMessageToWebhook(
                            log,
                            data.webhookUrl,
                        data.webhookPort,
                        data.webhookToken
                    )
                );
                const results = await Promise.all(logPromises);
                responseArray.push(...results);
            }
        } else {
            const result = await Webhook.sendMessageToWebhook(
                logData,
                data.webhookUrl,
                data.webhookPort,
                data.webhookToken
                );
                responseArray.push(result);
            }
        });
        await Promise.all(sendPromises);
        return responseArray;
    }

    public static async sendMessageToWebhook(
        logData: LogLine,
        webhookUrl: string,
        webhookPort: number,
        webhookToken: string
    ): Promise<number> {
        try {
            const response = await fetch(
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
            return response.status;
        } catch (error) {
            console.error(error);
            return 0;
        }
    }
}
