import parser from '../modules/parser';
import {
    LogLine,
    unitTestsBuilder,
    unitTestsBuilderError,
} from '../types/types';
import validation from './testValidation';



export class testSingleProf implements unitTestsBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validation.isEqualResults(parsedData[0], check!);
    }
}

export class testMultiProf implements unitTestsBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validation.validateParserData(parsedData, check!);
    }
}

export class testErrorParse implements unitTestsBuilderError {
    run(errorLine: string): boolean {
        let passed = false;
        try {
            parser.parseFastLog(errorLine);
        } catch (error) {
            //@ts-expect-error it is nessesery becaurse TS doesnt know it

            if (error.message === 'Failed to parse log line') {
                passed = true;
            }
        }
        return passed;
    }
}

export class testNullParse implements unitTestsBuilderError {
    run(errorLine: string): boolean {
        return parser.parseFastLog(errorLine)[0] === undefined;
    }
}

// webhook classes

export class testSingleWebhook implements unitTestsBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validation.isEqualResults(parsedData[0], check!);
    }
};
