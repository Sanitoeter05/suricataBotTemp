import logger from './logging';
import { LogLine } from '../types/types';
import https from 'https';

const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 30,
    maxFreeSockets: 10,
});

export default class Bot {
    static parseMessageTelegram(logLine: LogLine): string {
        if (!logLine) return '';
        return `*New security alert with priority: ${logLine['priority']}*\n\n*Classification: ${logLine['classification']} Time Stamp: ${logLine['timestamp']}*\nAlert message: ${logLine['message'].replace('_', '')}\n\n${logLine['protocol']}: ${logLine['sourceAddr']} -> ${logLine['destAddr']}\n\nSID: ${logLine['signatureId']}`;
    }

    static async sendToTelegram(message: string): Promise<boolean> {
        try {
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
                return false;
            }
            return true;
        } catch (error) {
            logger.error(`Error sending to Telegram: ${error}`);
            return false;
        }
    }
}
