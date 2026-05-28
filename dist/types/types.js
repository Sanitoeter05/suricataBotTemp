"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitTestsBuilderError = exports.unitTestsBuilder = void 0;
class unitTestsBuilder {
    static measure(task, rawLogLine, check) {
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
exports.unitTestsBuilder = unitTestsBuilder;
class unitTestsBuilderError {
    static measure(task, errorLine) {
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
exports.unitTestsBuilderError = unitTestsBuilderError;
//# sourceMappingURL=types.js.map