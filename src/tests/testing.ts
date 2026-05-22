import { LogLine } from '../types/types';
import parser from './../modules/parser';
import { performance } from 'perf_hooks';
import { readFileSync } from "fs"

function testParserProcess(rawLogLine: string, errorLine:string, check:LogLine, ):{[key: string]: [number, number, boolean]} {
    let parserValues:{[key: string]: [number,number ,boolean]} = {};
    parserValues["single"] = testSingleProf(rawLogLine, check);
    parserValues["multiple"] = testMultiProf(multiplyString(rawLogLine, 30), check);
    parserValues["stress"] = testMultiProf(multiplyString(rawLogLine, 1000), check);
    parserValues["error"] = testErrorParse(errorLine);
    return parserValues;
};

function testSingleProf(rawLogLine:string, check:LogLine):[number,number, boolean] {
    const memStart = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    let parsed = parser.parseFastLog(rawLogLine);
    let passed = isEqualResults(parsed[0], check);
    const endTime = performance.now();
    const memEnd = process.memoryUsage().heapUsed;
    return [endTime - startTime, (memEnd - memStart)/1024, passed];
};

function testMultiProf(rawLogLine:string, check:LogLine):[number,number, boolean ] {
    const startTime = performance.now();
    const memStart = process.memoryUsage().heapUsed;
    let parsed = parser.parseFastLog(rawLogLine);
    const endTime = performance.now();
    const memEnd = process.memoryUsage().heapUsed;
    return [endTime - startTime, (memEnd - memStart)/1024, validateParserData(parsed, check)];
};


function testErrorParse(errorLine:string):[number,number, boolean, ] {
    const startTime = performance.now();
    const memStart = process.memoryUsage().heapUsed;
    let passed = false;
    try {
        parser.parseFastLog(errorLine);
    } catch (error) {
        //@ts-ignore
        if (error.message === "Failed to parse log line") {
            passed = true;
        }
    };
    const endTime = performance.now();
    const memEnd = process.memoryUsage().heapUsed;
    return [endTime - startTime, (memEnd - memStart)/1024, passed];
};

function validateParserData(parsed:LogLine[], check:LogLine){
    let passed = true;
    parsed.map((logLine) => {
        if (!isEqualResults(logLine, check)) {
            passed = false;
        }
    });
    return passed;
};

function multiplyString(str: string, times: number): string {
    let result = "";
    for (let i = 0; i < times; i++) {
        result += str+ "\n";
    }
    return result;
};

function isEqualResults(result:LogLine, check:LogLine):boolean {
    return JSON.stringify(check) === JSON.stringify(result);
};

function runTests(){
    let testData = JSON.parse(readFileSync("./testData/payLoads.json", "utf-8"));
    let testResults = testParserProcess(testData.parser.parseString, testData.parser.errorString, testData.parser.check);
    console.log(testResults);
};


runTests();