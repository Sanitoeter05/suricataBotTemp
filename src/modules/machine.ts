import os from 'os';
import dns from 'dns';
import {ipInterfaces} from "../types/types"

export default class machine {
public static getLocalIP() {
  const interfaces = os.networkInterfaces();

  const priority:ipInterfaces = {
    win32:  ['Ethernet', 'Wi-Fi'],
    darwin: ['en0', 'en1', 'en2'],
    linux:  ['eth0', 'eth1', 'wlan0'],
  };
  const names = priority.linux;

  // Check priority interfaces first
  for (const name of names) {
    const iface = (interfaces[name] || [])
      .find(i => i.family === 'IPv4' && !i.internal);
    if (iface) return iface.address;
  }

  // Fallback: any interface excluding virtual adapters
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (/VMware|VirtualBox|Hyper-V/i.test(name)) continue;
    const iface = addrs!.find(i => i.family === 'IPv4' && !i.internal);
    if (iface) return iface.address;
  }

  return null;
}

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
    public static async getIp(isInternal:boolean=true):Promise<string>{

        if (isInternal){
            const localIp = this.getLocalIP()
            if(localIp){
                return localIp;
            }
        }else {
            const {publicIpv4}  = await import('public-ip');
            const pubIp = await publicIpv4();
            if(pubIp){
                return pubIp;
            }
        };
        return "null";
    };
}
