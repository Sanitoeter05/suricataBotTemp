import logger from './logging';
import { LogLine } from '../types/types';

export default class Parser {
    private static readonly LOG_REGEX =
        /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\]\s+\[Classification:\s+(.+?)\]\s+\[Priority:\s+(\d+)\]\s+\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;
    private static readonly TIMESTAMP_REGEX = /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)/;
    private static readonly ADDRESSES_REGEX = /\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;
    private static readonly LINE_SPLIT = /\r?\n/;

    private static logCache = new Map<string, object>();
    private static readonly CACHE_MAX_SIZE = 100; // Nach 100 Einträgen löschen
    private static cacheEntryCount = 0;

    
    static parseMessageTelegram(logLine: LogLine): string {
        if (!logLine) return '';
        return `*New security alert with priority: ${logLine['priority']}*\n\n*Classification: ${logLine['classification']} Time Stamp: ${logLine['timestamp']}*\nAlert message: ${logLine['message'].replace('_', '')}\n\n${logLine['protocol']}: ${logLine['sourceAddr']} -> ${logLine['destAddr']}\n\nSID: ${logLine['signatureId']}`;
    }

    static clearCache(): void {
        this.logCache.clear();
        this.cacheEntryCount = 0;
    }

    static parseFastLog(logLines: string): LogLine[] {
        if (logLines.length === 0) return [];
        
        // Cache-Clearing: Größenlimit erreicht?
        if (this.cacheEntryCount > this.CACHE_MAX_SIZE) {
            this.clearCache();
            logger.info('Log cache cleared (size limit reached)');
        }
        
        return logLines
            .split(this.LINE_SPLIT)
            .filter((line) => line.trim() !== '')
            .map((line) => {
                // Cache-Key: Index 28-46 (generatorId:signatureId:revision)
                const cacheKey = line.substring(28, 46);
                
                // Cache-Hit: gecachtes Objekt + frische Daten (timestamp, IPs)
                if (this.logCache.has(cacheKey)) {
                    const cached = this.logCache.get(cacheKey) as { [key: string]: string | number  };
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
            .filter((log) => log !== null) as LogLine[];
    }

    private static parseLogLine(internLogMassage: string): LogLine | null {
        const match = internLogMassage.match(this.LOG_REGEX);
        if (!match) throw new Error('Failed to parse log line');

        const priority = parseInt(match[7]);

        if (priority <= 2) {
            logger.info('there is a priority log!:' + internLogMassage);
        }

        const logObject: LogLine = {
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
