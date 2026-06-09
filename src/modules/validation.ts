import { URL } from 'url';
import logger from './logging';

export default class Validation {

public static validateWebhookUrl(webhookUrl: string, webhookPort: number): boolean {
    try {
        const url = new URL(`https://${webhookUrl}:${webhookPort}`);
        
        // Validate hostname format (prevent injection payloads)
        if (!/^[a-zA-Z0-9.-]+$/.test(url.hostname)) {
            throw new Error('Invalid hostname format');
        }
        
        // Validate port is in valid range
        const port = parseInt(webhookPort.toString());
        if (port < 1 || port > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }
        
        return true;
    } catch (error) {
        logger.error(`Invalid webhook configuration: ${error}`);
        return false;
    }
}
};