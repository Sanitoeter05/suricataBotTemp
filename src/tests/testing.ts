import {
    testSingleProf,
    testMultiProf,
    testErrorParse,
    testNullParse,
} from './testClasses';

import testModifier from './testModifier';

import { createServer, startServer, stopServer, getReceivedData, getReceivedDataByEndpoint, clearReceivedData } from './server';


import {
    LogLine,
    unitTestParserBuilder,
    TestResult,
    unitTestParserBuilderError,
} from '../types/types';
import parser from './../modules/parser';
import { readFileSync } from 'fs';

class testParser {
    //TODO need to add type for response
    public static testParserProcess(
        rawLogLine: string,
        errorLine: string,
        check: LogLine
    ): { [key: string]: TestResult } {
        const parserValues: {
            [key: string]: [number, number, number, boolean];
        } = {};

        parser.clearCache();
        parserValues['single'] = unitTestParserBuilder.measure(
            new testSingleProf(),
            rawLogLine,
            check
        );

        parser.clearCache();
        parserValues['multiple'] = unitTestParserBuilder.measure(
            new testMultiProf(),
            testModifier.multiplyString(rawLogLine, 30),
            check
        );

        parser.clearCache();
        parserValues['stress'] = unitTestParserBuilder.measure(
            new testMultiProf(),
            testModifier.multiplyString(rawLogLine, 1000),
            check
        );

        parser.clearCache();
        parserValues['error'] = unitTestParserBuilderError.measure(
            new testErrorParse(),
            errorLine
        );

        parser.clearCache();
        parserValues['null'] = unitTestParserBuilderError.measure(
            new testNullParse(),
            ''
        );
        return parserValues;
    }
}


class testWebhook {
    public static testWebhookProcess(
        rawLogLine: string,
        errorLine: string,
        check: LogLine
    ): { [key: string]: TestResult } {
        const parserValues: {
            [key: string]: [number, number, number, boolean];
        } = {};

        parser.clearCache();
        startServer(3000);
        parserValues['single'] = unitTestParserBuilder.measure(
            new testSingleWebhook(),
            rawLogLine,
            check
        );

        parser.clearCache();
        parserValues['multiple'] = unitTestParserBuilder.measure(
            new testMultiWebhook(),
            testModifier.multiplyString(rawLogLine, 30),
            check
        );

        parser.clearCache();
        parserValues['stress'] = unitTestParserBuilder.measure(
            new testMultiWebhook(),
            testModifier.multiplyString(rawLogLine, 1000),
            check
        );

        parser.clearCache();
        parserValues['error'] = unitTestParserBuilderError.measure(
            new testErrorWebhook(),
            errorLine
        );

        parser.clearCache();
        parserValues['null'] = unitTestParserBuilderError.measure(
            new testNullWebhook(),
            ''
        );

        parser.clearCache();
        parserValues["interrupt"] = unitTestParserBuilderError.measure(
            new testInterruptWebhook(),
            testModifier.multiplyString(rawLogLine, 1000)
        );

        return parserValues;
    }
};
function runTests() {
    const testData = JSON.parse(
        readFileSync('./testData/payLoads.json', 'utf-8')
    );
    const testResults: { [key: string]: { [key: string]: TestResult } } = {};
    testResults['parser'] = testParser.testParserProcess(
        testData.parser.parseString,
        testData.parser.errorString,
        testData.parser.check
    );
    console.log(testResults);
}

runTests();
