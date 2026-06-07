import parser from '../modules/parser';
import {
    LogLine,
    unitTestParserBuilder,
    unitTestParserBuilderError,
} from '../types/types';
import validation from './testValidation';
import webhook from '../modules/webhook';



export class testSingleProf implements unitTestParserBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validation.isEqualResults(parsedData[0], check!);
    }
}

export class testMultiProf implements unitTestParserBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validation.validateParserData(parsedData, check!);
    }
}

export class testErrorParse implements unitTestParserBuilderError {
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

export class testNullParse implements unitTestParserBuilderError {
    run(errorLine: string): boolean {
        return parser.parseFastLog(errorLine)[0] === undefined;
    }
}

// webhook classes

export class testSingleWebhook implements unitTestParserBuilder {
    run(parsedLogLine: LogLine): LogLine {
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validation.isEqualResults(parsedData[0], check!);
    }
};
