import logger from './logging';
import { LogLine } from '../types/types';

export default class Parser {
    private static readonly LOG_REGEX =
        /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\]\s+\[Classification:\s+(.+?)\]\s+\[Priority:\s+(\d+)\]\s+\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;
    private static readonly LINE_SPLIT = /\r?\n/;

    static parseFastLog(logLines: string): LogLine[]  {
        return logLines
            .split(this.LINE_SPLIT)
            .filter((line) => line.trim() !== '')
            .map((line) => this.parseLogLine(line))
            .filter((log) => log !== null) as LogLine[];
    }

    private static parseLogLine(internLogMassage: string): object | null {
        const match = internLogMassage.match(this.LOG_REGEX);
        if (!match) throw new Error(`Failed to parse log line`);

        if (parseInt(match[7]) <= 2) {
            logger.info('there is a priority log!:' + internLogMassage);
        }
        return {
            timestamp: match[1],
            generatorId: match[2],
            signatureId: match[3],
            revision: match[4],
            message: match[5],
            classification: match[6],
            priority: parseInt(match[7]),
            protocol: match[8],
            sourceAddr: match[9],
            destAddr: match[10],
        };
    }
}
