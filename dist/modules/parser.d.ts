import { LogLine } from '../types/types';
export default class Parser {
    private static readonly LOG_REGEX;
    private static readonly TIMESTAMP_REGEX;
    private static readonly ADDRESSES_REGEX;
    private static readonly LINE_SPLIT;
    private static logCache;
    private static readonly CACHE_MAX_SIZE;
    private static cacheEntryCount;
    static parseMessageTelegram(logLine: LogLine): string;
    static clearCache(): void;
    static parseFastLog(logLines: string): LogLine[];
    private static parseLogLine;
}
//# sourceMappingURL=parser.d.ts.map