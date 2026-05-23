import {
    LogLine,
    unitTestsBuilder,
    TestResult,
    unitTestsBuilderError,
} from '../types/types';
import parser from './../modules/parser';
import { readFileSync } from 'fs';

//TODO need to add type for response
function testParserProcess(
    rawLogLine: string,
    errorLine: string,
    check: LogLine
): { [key: string]: TestResult } {
    let parserValues: { [key: string]: [number, number, number, boolean] } = {};
    parserValues['single'] = unitTestsBuilder.measure(
        new testSingleProf(),
        rawLogLine,
        check
    );
    parserValues['multiple'] = unitTestsBuilder.measure(
        new testMultiProf(),
        multiplyString(rawLogLine, 30),
        check
    );
    parserValues['stress'] = unitTestsBuilder.measure(
        new testMultiProf(),
        multiplyString(rawLogLine, 1000),
        check
    );
    parserValues['error'] = unitTestsBuilderError.measure(
        new testErrorParse(),
        errorLine
    );
    parserValues['null'] = unitTestsBuilderError.measure(
        new testNullParse(),
        ''
    );
    return parserValues;
}

class testSingleProf implements unitTestsBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return isEqualResults(parsedData[0], check!);
    }
}

class testMultiProf implements unitTestsBuilder {
    run(rawLogLine: string): LogLine[] {
        return parser.parseFastLog(rawLogLine);
    }
    validate(parsedData: LogLine[], check?: LogLine): boolean {
        return validateParserData(parsedData, check!);
    }
}

class testErrorParse implements unitTestsBuilderError {
    run(errorLine: string): boolean {
        let passed = false;
        try {
            parser.parseFastLog(errorLine);
        } catch (error) {
            //@ts-ignore
            if (error.message === 'Failed to parse log line') {
                passed = true;
            }
        }
        return passed;
    }
}

class testNullParse implements unitTestsBuilderError {
    run(errorLine: string): boolean {
        return parser.parseFastLog(errorLine)[0] === undefined;
    }
}

function validateParserData(parsed: LogLine[], check: LogLine) {
    let passed = true;
    parsed.map((logLine) => {
        if (!isEqualResults(logLine, check)) {
            passed = false;
        }
    });
    return passed;
}

function multiplyString(str: string, times: number): string {
    let result = '';
    for (let i = 0; i < times; i++) {
        result += str + '\n';
    }
    return result;
}

function isEqualResults(result: LogLine, check: LogLine): boolean {
    return JSON.stringify(check) === JSON.stringify(result);
}

function runTests() {
    let testData = JSON.parse(
        readFileSync('./testData/payLoads.json', 'utf-8')
    );
    let testResults = testParserProcess(
        testData.parser.parseString,
        testData.parser.errorString,
        testData.parser.check
    );
    console.log(testResults);
}

runTests();
