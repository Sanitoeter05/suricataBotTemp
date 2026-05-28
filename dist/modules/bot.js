"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = __importDefault(require("./logging"));
const https_1 = __importDefault(require("https"));
const machine_1 = __importDefault(require("./machine"));
const agent = new https_1.default.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 30,
    maxFreeSockets: 10,
});
class Bot {
    static async botIsHealthy() {
        if (machine_1.default.hasInterface() && await machine_1.default.canConnectToTelegram() && await this.sendAliveMessage()) {
            return true;
        }
        return false;
    }
    ;
    static async sendAliveMessage() {
        const response = await fetch(`https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.telegramChatId,
                text: "Started SuricataBot",
                parse_mode: 'Markdown',
            }),
            //@ts-expect-error it is nessesery becaurse TS doesnt know it
            agent: agent,
        });
        if (!response.ok) {
            return false;
        }
        else {
            return true;
        }
    }
    ;
    static async sendToTelegram(message) {
        const response = await fetch(`https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.telegramChatId,
                text: message,
                parse_mode: 'Markdown',
            }),
            //@ts-expect-error it is nessesery becaurse TS doesnt know it
            agent: agent,
        });
        if (!response.ok) {
            logging_1.default.error(`Failed to send to Telegram: ${response.statusText}\nMessage: ${message}`);
            throw new Error(`Failed to send to Telegram: ${response.statusText}`);
        }
    }
}
exports.default = Bot;
//# sourceMappingURL=bot.js.map