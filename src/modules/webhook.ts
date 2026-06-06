export default class Webhook {

    public static async checkWebhookHealth(): Promise<void> {};

    private static checkWebhookHealth(
        webhookUrl: string,
        webhookToken: string,
        webhookPort: number
    ): boolean {
        try {
            fetch(`https://${webhookUrl}:${webhookPort}/webhook/health`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: webhookToken }),
            }).then((response: Response) => {
                if (!response.ok || response.body === null) {
                    throw new Error('Webhook health check failed');
                }
            });
        } catch (error) {
            console.error(error);
            return false;
        }
        return true;
    }
    public static async sendToWebhook(markdownData: string): Promise<void> {
        try {
            await fetch(
                `https://${process.env.webhookUrl}:${process.env.webhookPort}/webhook`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: process.env.webhookToken,
                        data: markdownData,
                    }),
                }
            );
        } catch (error) {
            console.error(error);
        }
    }
}
