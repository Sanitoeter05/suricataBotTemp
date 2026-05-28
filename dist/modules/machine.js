"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const dns_1 = __importDefault(require("dns"));
class machine {
    static hasInterface() {
        const interfaces = os_1.default.networkInterfaces();
        for (const name in interfaces) {
            for (const iface of interfaces[name]) {
                if (!iface.internal &&
                    (iface.family === 'IPv6' || iface.family === 'IPv4')) {
                    return true;
                }
            }
        }
        return false;
    }
    static lastTelegramCheck = null;
    static DNS_CACHE_TIME = 5000; // 5 Sekunden Cache
    static canConnectToTelegram() {
        const now = Date.now();
        if (this.lastTelegramCheck &&
            now - this.lastTelegramCheck.time < this.DNS_CACHE_TIME) {
            return Promise.resolve(this.lastTelegramCheck.result);
        }
        // Cache abgelaufen: Explizit löschen
        if (this.lastTelegramCheck) {
            this.lastTelegramCheck = null;
        }
        return new Promise((resolve) => {
            dns_1.default.resolve('api.telegram.org', (err) => {
                const result = !err;
                this.lastTelegramCheck = { time: now, result };
                resolve(result);
            });
        });
    }
}
exports.default = machine;
//# sourceMappingURL=machine.js.map