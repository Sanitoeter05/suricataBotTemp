import { LogLine } from '../types/types';

export default class testModifier {
    public static multiplyString(str: string, times: number): string {
        let result = '';
        for (let i = 0; i < times; i++) {
            result += str + '\n';
        }
        return result;
    }

    public static multiplyArray(logLine: LogLine, times: number): LogLine[] {
        const result: LogLine[] = [];
        for (let i = 0; i < times; i++) {
            result.push(logLine);
        }
        return result;
    }
}
