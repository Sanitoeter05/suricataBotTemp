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
export declare class unitTestsBuilder {
    static measure(task: unitTest, rawLogLine: string | string[], check?: LogLine): TestResult;
}
export declare class unitTestsBuilderError {
    static measure(task: unitTestError, errorLine: string): TestResult;
}
//# sourceMappingURL=types.d.ts.map