"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = __importDefault(require("./logging"));
class Parser {
    static LOG_REGEX = /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\]\s+\[Classification:\s+(.+?)\]\s+\[Priority:\s+(\d+)\]\s+\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;
    static TIMESTAMP_REGEX = /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)/;
    static ADDRESSES_REGEX = /\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;
    static LINE_SPLIT = /\r?\n/;
    static logCache = new Map();
    static CACHE_MAX_SIZE = 100; // Nach 100 Einträgen löschen
    static cacheEntryCount = 0;
    static parseMessageTelegram(logLine) {
        if (!logLine)
            return '';
        return `*New security alert with priority: ${logLine['priority']}*\n\n*Classification: ${logLine['classification']} Time Stamp: ${logLine['timestamp']}*\nAlert message: ${logLine['message'].replace('_', '')}\n\n${logLine['protocol']}: ${logLine['sourceAddr']} -> ${logLine['destAddr']}\n\nSID: ${logLine['signatureId']}`;
    }
    static clearCache() {
        this.logCache.clear();
        this.cacheEntryCount = 0;
    }
    static parseFastLog(logLines) {
        if (logLines.length === 0)
            return [];
        // Cache-Clearing: Größenlimit erreicht?
        if (this.cacheEntryCount > this.CACHE_MAX_SIZE) {
            this.clearCache();
            logging_1.default.info('Log cache cleared (size limit reached)');
        }
        return logLines
            .split(this.LINE_SPLIT)
            .filter((line) => line.trim() !== '')
            .map((line) => {
            // Cache-Key: Index 28-46 (generatorId:signatureId:revision)
            const cacheKey = line.substring(28, 46);
            // Cache-Hit: gecachtes Objekt + frische Daten (timestamp, IPs)
            if (this.logCache.has(cacheKey)) {
                const cached = this.logCache.get(cacheKey);
                const timestampMatch = line.match(this.TIMESTAMP_REGEX);
                const addressesMatch = line.match(this.ADDRESSES_REGEX);
                if (timestampMatch && addressesMatch) {
                    return {
                        timestamp: timestampMatch[1],
                        generatorId: cached.generatorId,
                        signatureId: cached.signatureId,
                        revision: cached.revision,
                        message: cached.message,
                        classification: cached.classification,
                        priority: cached.priority,
                        protocol: addressesMatch[1],
                        sourceAddr: addressesMatch[2],
                        destAddr: addressesMatch[3],
                    };
                }
            }
            // Cache-Miss: vollständig parsen
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
            generatorId: match[2],
            signatureId: match[3],
            revision: match[4],
            message: match[5],
            classification: match[6],
            priority: priority,
            protocol: match[8],
            sourceAddr: match[9],
            destAddr: match[10],
        };
        // Speichere im Cache (nur die statischen Felder)
        const cacheKey = internLogMassage.substring(28, 46);
        const cachedObject = {
            generatorId: match[2],
            signatureId: match[3],
            revision: match[4],
            message: match[5],
            classification: match[6],
            priority: priority,
        };
        this.logCache.set(cacheKey, cachedObject);
        return logObject;
    }
}
exports.default = Parser;
//# sourceMappingURL=parser.js.map