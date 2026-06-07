export interface LogLine {
    priority: number;
    classification: string;
    timestamp: string;
    message: string;
    protocol: string;
    sourceAddr: string;
    destAddr: string;
    signatureId: string;
    generatorId: string;
    revision: string;
}

export type TestResult = [number, number, number, boolean];


interface unitTestParser {
    run(rawLogLine: string | string[]): LogLine[];
    validate(parsedData?: LogLine[], check?: LogLine): boolean;
}

interface unitTestParserError {
    run(errorLine: string): boolean;
}

export class unitTestParserBuilder {
    static measure(
        task: unitTestParser,
        rawLogLine: string | string[],
        check?: LogLine
    ): TestResult {
        const memStart = process.memoryUsage().heapUsed;
        const cpuStart = process.cpuUsage();
        const startTime = performance.now();
        const parsedData = task.run(rawLogLine);
        const endTime = performance.now();
        const memEnd = process.memoryUsage().heapUsed;
        const cpuEnd = process.cpuUsage(cpuStart);
        return [
            endTime - startTime,
            (memEnd - memStart) / 1024,
            (cpuEnd.user + cpuEnd.system) / 1000,
            task.validate(parsedData, check),
        ];
    }
}

export class unitTestParserBuilderError {
    static measure(task: unitTestParserError, errorLine: string): TestResult {
        const startTime = performance.now();
        const memStart = process.memoryUsage().heapUsed;
        const cpuStart = process.cpuUsage();
        const passed = task.run(errorLine);
        const endTime = performance.now();
        const memEnd = process.memoryUsage().heapUsed;
        const cpuEnd = process.cpuUsage(cpuStart);
        return [
            endTime - startTime,
            (memEnd - memStart) / 1024,
            (cpuEnd.user + cpuEnd.system) / 1000,
            passed,
        ];
    }
}

export interface webhookData {
    webhookUrl: string;
    webhookToken: string;
    webhookPort: number;
}

interface unitTestWebhook {
    run(parsedLogLine: LogLine, webhookData: webhookData | webhookData[]): number;
    validate(checkStat: number): boolean;
};

interface unitTestWebhookError {
    run(errorLogLine: string, webhookData: webhookData | webhookData[]): number;
    validate(checkStat: number): boolean;
}

//TODO need to start the unit testing interfaces for webhooks