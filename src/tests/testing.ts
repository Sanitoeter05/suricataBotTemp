import {
    testSingleProf,
    testMultiProf,
    testErrorParse,
    testNullParse,
    testSingleWebhook,
    testMultiWebhook,
    testErrorWebhook,
    testNullWebhook,
    testInterruptWebhook,
} from './testClasses';

import testModifier from './testModifier';

import { createServer, startServer } from './server';

import {
    LogLine,
    unitTestParserBuilder,
    TestResult,
    unitTestParserBuilderError,
    unitTestWebhookBuilder,
    unitTestWebhookBuilderError,
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
    public static async testWebhookProcess(
        parsedLogLine: LogLine,
        errorLine: LogLine,
        nullLine: LogLine
    ): Promise<{ [key: string]: TestResult }> {
        const parserValues: {
            [key: string]: [number, number, number, boolean];
        } = {};
        createServer();

        startServer(3000);
        parserValues['single'] = await unitTestWebhookBuilder.measure(
            new testSingleWebhook(),
            parsedLogLine,
            {
                webhookUrl: 'localhost',
                webhookPort: 3000,
                webhookToken: 'testToken',
            },
            200
        );

        parserValues['multiple'] = await unitTestWebhookBuilder.measure(
            new testMultiWebhook(),
            testModifier.multiplyArray(parsedLogLine, 10),
            [
                {
                    webhookUrl: 'localhost',
                    webhookPort: 3000,
                    webhookToken: 'testToken',
                },
            ],
            200
        );

        parserValues['stress'] = await unitTestWebhookBuilder.measure(
            new testMultiWebhook(),
            testModifier.multiplyArray(parsedLogLine, 1000),
            [
                {
                    webhookUrl: 'localhost',
                    webhookPort: 3000,
                    webhookToken: 'testToken',
                },
            ],
            200
        );

        parserValues['error'] = await unitTestWebhookBuilderError.measure(
            new testErrorWebhook(),
            errorLine,
            {
                webhookUrl: 'localhost',
                webhookPort: 3000,
                webhookToken: 'testToken',
            },
            1
        );

        parserValues['null'] = await unitTestWebhookBuilderError.measure(
            new testNullWebhook(),
            nullLine,
            {
                webhookUrl: 'localhost',
                webhookPort: 3000,
                webhookToken: 'testToken',
            },
            0
        );

        parserValues['interrupt'] = await unitTestWebhookBuilderError.measure(
            new testInterruptWebhook(),
            parsedLogLine,
            {
                webhookUrl: 'localhost',
                webhookPort: 3000,
                webhookToken: 'testToken',
            },
            3
        );

        return parserValues;
    }
}

async function runTests() {
    const testData = JSON.parse(
        readFileSync('./testData/payLoads.json', 'utf-8')
    );
    const testResults: { [key: string]: { [key: string]: TestResult } } = {};
    testResults['parser'] = testParser.testParserProcess(
        testData.parser.parseString,
        testData.parser.errorString,
        testData.parser.check
    );
    testResults['webhook'] = await testWebhook.testWebhookProcess(
        testData.webhook.parsedLog,
        testData.webhook.errorLog,
        testData.webhook.nullLog
    );
    console.log(testResults);
}

runTests();
