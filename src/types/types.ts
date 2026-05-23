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

export interface unitTest {
    run(rawLogLine: string | string[]): LogLine[];
    validate(parsedData?: LogLine[], check?: LogLine): boolean;
}

export interface unitTestError {
    run(errorLine: string): boolean;
}

export class unitTestsBuilder {
    static measure(
        task: unitTest,
        rawLogLine: string | string[],
        check?: LogLine
    ): TestResult {
        const memStart = process.memoryUsage().heapUsed;
        const cpuStart = process.cpuUsage();
        const startTime = performance.now();
        let parsedData = task.run(rawLogLine);
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

export class unitTestsBuilderError {
    static measure(task: unitTestError, errorLine: string): TestResult {
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
