export interface LogLine {
    priority: number;
    classification: string;
    timestamp: string;
    message: string;
    protocol: string;
    sourceAddr: string;
    destAddr: string;
    signatureId: number;
};

export type TestResult = [number, number, boolean];

export interface unitTest {
    run(rawLogLine:string|string[]): LogLine[];
    validate(parsedData?:LogLine[], check?:LogLine): boolean;
};

export interface unitTestError {
    run(errorLine: string): boolean;
};

export class unitTestsBuilder {
    static measure (task: unitTest, rawLogLine:string|string[], check?:LogLine): TestResult {
        const startTime = performance.now();
        const memStart = process.memoryUsage().heapUsed;
        let parsedData = task.run(rawLogLine);
        const endTime = performance.now();
        const memEnd = process.memoryUsage().heapUsed;
        return [endTime - startTime, (memEnd - memStart)/1024, task.validate(parsedData, check)];
    };
};

export class unitTestsBuilderError {
    static measure (task: unitTestError, errorLine: string): TestResult {
        const startTime = performance.now();
        const memStart = process.memoryUsage().heapUsed;
        const passed = task.run(errorLine);
        const endTime = performance.now();
        const memEnd = process.memoryUsage().heapUsed;
        return [endTime - startTime, (memEnd - memStart)/1024, passed];
    };
}