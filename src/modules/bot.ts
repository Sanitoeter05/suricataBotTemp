import logger from './logging';
import https from 'https';

const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 30,
    maxFreeSockets: 10,
});

export default class Bot {

    static async sendToTelegram(message: string): Promise<void> {
        const response = await fetch(
            `https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: process.env.telegramChatId,
                    text: message,
                    parse_mode: 'Markdown',
                }),
                //@ts-ignore
                agent: agent,
            }
        );

        if (!response.ok) {
            logger.error(
                `Failed to send to Telegram: ${response.statusText}\nMessage: ${message}`
            );
            throw new Error(
                `Failed to send to Telegram: ${response.statusText}`
            );
        }
    }
}
