import { LogLine } from '../types/types';
export default class Parser {
    private static readonly LOG_REGEX;
    private static readonly LINE_SPLIT;
    private static logCache;
    static parseMessageTelegram(logLine: LogLine): string;
    static clearCache(): void;
    static parseFastLog(logLines: string): LogLine[];
    private static parseLogLine;
}
//# sourceMappingURL=parser-with-cache.d.ts.map