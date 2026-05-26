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

    public static canConnectToTelegram(): Promise<boolean> {
        return new Promise((resolve) => {
            dns.resolve('api.telegram.org', (err) => {
                resolve(!err);
            });
        });
    }
}
