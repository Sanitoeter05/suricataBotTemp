import os from 'os';
import dns from 'dns';

export default class machine {
    public static hasInterface(): boolean {
        const interfaces = os.networkInterfaces();
        for (const name in interfaces) {
            for (const iface of interfaces[name]!) {
                if (
                    !iface.internal &&
                    (iface.family === 'IPv6' || iface.family === 'IPv4')
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    private static lastTelegramCheck: { time: number; result: boolean } | null =
        null;
    private static readonly DNS_CACHE_TIME = 5000; // 5 Sekunden Cache

    public static canConnectToTelegram(): Promise<boolean> {
        const now = Date.now();
        if (
            this.lastTelegramCheck &&
            now - this.lastTelegramCheck.time < this.DNS_CACHE_TIME
        ) {
            return Promise.resolve(this.lastTelegramCheck.result);
        }

        // Cache abgelaufen: Explizit löschen
        if (this.lastTelegramCheck) {
            this.lastTelegramCheck = null;
        }

        return new Promise((resolve) => {
            dns.resolve('api.telegram.org', (err) => {
                const result = !err;
                this.lastTelegramCheck = { time: now, result };
                resolve(result);
            });
        });
    }
}
