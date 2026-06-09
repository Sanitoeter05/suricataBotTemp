import parser from '../modules/parser';
import {
    LogLine,
    unitTestParserBuilder,
    unitTestParserBuilderError,
    unitTestWebhookBuilder,
    unitTestWebhookBuilderError,
    webhookData,
} from '../types/types';
import validation from './testValidation';
import webhook from '../modules/webhook';
import { stopServer } from './server';

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

export class testSingleWebhook implements unitTestWebhookBuilder {
    async run(
        parsedLogLine: LogLine,
        webhookData: webhookData
    ): Promise<number> {
        return webhook.sendMessageToWebhook(
            parsedLogLine,
            webhookData.webhookUrl,
            webhookData.webhookPort,
        );
    }
    validate(result: number, check?: number): boolean {
        console.log(result, check);
        return result === check;
    }
}

export class testMultiWebhook implements unitTestWebhookBuilder {
    async run(
        parsedLogLine: LogLine[],
        webhookData: webhookData[]
    ): Promise<number[]> {
        return webhook.sendMessageToWebhookProcess(parsedLogLine, webhookData);
    }
    validate(result: number[], check?: number): boolean {
        console.log(result, check);
        return result.every((code) => code === check);
    }
}

export class testErrorWebhook implements unitTestWebhookBuilderError {
    async run(
        misMatchErrorLogLine: LogLine,
        webhookData: webhookData
    ): Promise<number> {
        return webhook.sendMessageToWebhook(
            misMatchErrorLogLine,
            webhookData.webhookUrl,
            webhookData.webhookPort,
        );
    }
    validate(result: number, check?: number): boolean {
        console.log(result, check);
        return result === check;
    }
}

export class testNullWebhook implements unitTestWebhookBuilderError {
    async run(nullLog: LogLine, webhookData: webhookData): Promise<number> {
        return webhook.sendMessageToWebhook(
            nullLog,
            webhookData.webhookUrl,
            webhookData.webhookPort,
        );
    }
    validate(result: number, check?: number): boolean {
        console.log(result, check);
        return result === check;
    }
}

export class testInterruptWebhook implements unitTestWebhookBuilderError {
    async run(parsedLog: LogLine, webhookData: webhookData): Promise<number> {
        stopServer();
        return webhook.sendMessageToWebhook(
            parsedLog,
            webhookData.webhookUrl,
            webhookData.webhookPort,
        );
    }

    validate(result: number, check?: number): boolean {
        console.log(result, check);
        return result === check;
    }
}
