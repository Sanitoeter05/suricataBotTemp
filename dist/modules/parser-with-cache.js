"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = __importDefault(require("./logging"));
class Parser {
    static LOG_REGEX = /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\]\s+\[Classification:\s+(.+?)\]\s+\[Priority:\s+(\d+)\]\s+\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;
    static LINE_SPLIT = /\r?\n/;
    static logCache = new Map();
    static parseMessageTelegram(logLine) {
        if (!logLine)
            return '';
        return `*New security alert with priority: ${logLine['priority']}*\n\n*Classification: ${logLine['classification']} Time Stamp: ${logLine['timestamp']}*\nAlert message: ${logLine['message'].replace('_', '')}\n\n${logLine['protocol']}: ${logLine['sourceAddr']} -> ${logLine['destAddr']}\n\nSID: ${logLine['signatureId']}`;
    }
    static clearCache() {
        this.logCache.clear();
    }
    static parseFastLog(logLines) {
        if (logLines.length === 0)
            return [];
        return logLines
            .split(this.LINE_SPLIT)
            .filter((line) => line.trim() !== '')
            .map((line) => {
            // Cache-Key: Index 28-46 (ID + Severity Level)
            const cacheKey = line.substring(28, 46);
            // Cache-Hit: gecachtes Objekt zurückgeben
            if (this.logCache.has(cacheKey)) {
                return this.logCache.get(cacheKey);
            }
            // Cache-Miss: parsen und cachen
            return this.parseLogLine(line);
        })
            .filter((log) => log !== null);
    }
    static parseLogLine(internLogMassage) {
        const match = internLogMassage.match(this.LOG_REGEX);
        if (!match)
            throw new Error('Failed to parse log line');
        const priority = parseInt(match[7]);
        if (priority <= 2) {
            logging_1.default.info('there is a priority log!:' + internLogMassage);
        }
        const logObject = {
            timestamp: match[1],
            signatureId: parseInt(match[3]),
            message: match[5],
            classification: match[6],
            priority: priority,
            protocol: match[8],
            sourceAddr: match[9],
            destAddr: match[10],
        };
        // Speichere im Cache
        const cacheKey = internLogMassage.substring(28, 46);
        this.logCache.set(cacheKey, logObject);
        return logObject;
    }
}
exports.default = Parser;
//# sourceMappingURL=parser-with-cache.js.map