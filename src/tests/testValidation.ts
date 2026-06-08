import { LogLine } from '../types/types';

export default class validationTests {
    public static validateParserData(parsed: LogLine[], check: LogLine) {
        let passed = true;
        parsed.map((logLine) => {
            if (!this.isEqualResults(logLine, check)) {
                passed = false;
            }
        });
        return passed;
    }

    public static isEqualResults(result: LogLine, check: LogLine): boolean {
        return JSON.stringify(check) === JSON.stringify(result);
    }
}
