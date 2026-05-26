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
    const parserValues: { [key: string]: [number, number, number, boolean] } = {};
    
    parser.clearCache();
    parserValues['single'] = unitTestsBuilder.measure(
        new testSingleProf(),
        rawLogLine,
        check
    );
    
    parser.clearCache();
    parserValues['multiple'] = unitTestsBuilder.measure(
        new testMultiProf(),
        multiplyString(rawLogLine, 30),
        check
    );
    
    parser.clearCache();
    parserValues['stress'] = unitTestsBuilder.measure(
        new testMultiProf(),
        multiplyString(rawLogLine, 1000),
        check
    );
    
    parser.clearCache();
    parserValues['error'] = unitTestsBuilderError.measure(
        new testErrorParse(),
        errorLine
    );
    
    parser.clearCache();
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
            //@ts-expect-error it is nessesery becaurse TS doesnt know it

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
    const testData = JSON.parse(
        readFileSync('./testData/payLoads.json', 'utf-8')
    );
    const testResults: { [key: string]: { [key: string]: TestResult } } = {};
    testResults["parser"] = testParserProcess(
        testData.parser.parseString,
        testData.parser.errorString,
        testData.parser.check
    );
    console.log(testResults);
}

runTests();
