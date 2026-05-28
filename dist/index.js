"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const dotenv_1 = __importDefault(require("dotenv"));
const logging_1 = __importDefault(require("./modules/logging"));
const bot_1 = __importDefault(require("./modules/bot"));
const parser_1 = __importDefault(require("./modules/parser"));
const machine_1 = __importDefault(require("./modules/machine"));
dotenv_1.default.config({ quiet: true });
async function checkIfReady() {
    return !!(process.env.fastFilePath &&
        process.env.telegramToken &&
        process.env.telegramChatId &&
        (await bot_1.default.botIsHealthy()));
}
async function FastLogProcess(filepath) {
    const logContent = (0, fs_1.readFileSync)(filepath, 'utf-8');
    (0, fs_1.writeFile)(filepath, '', () => { });
    if (logContent.length === 0)
        return;
    const parsed = parser_1.default.parseFastLog(logContent);
    try {
        await sendAsyncMessages(parsed);
    }
    catch (error) {
        logging_1.default.error(`Error sending messages: ${error}`);
        (0, fs_1.appendFile)(`${__dirname}/logs/failed_logs.txt`, logContent, () => { });
    }
}
async function sendAsyncMessages(parsedMessageArray) {
    await Promise.all(parsedMessageArray.map(async (logLine) => {
        await bot_1.default.sendToTelegram(parser_1.default.parseMessageTelegram(logLine));
    }));
}
(async () => {
    if (await checkIfReady()) {
        const filepath = process.env.fastFilePath;
        initialFilePull(filepath);
        watchFile(filepath);
        logging_1.default.info(`Watching ${filepath} for changes...`);
    }
    else {
        console.error('Please set the environment variables in .env file!');
        process.exitCode = 1;
    }
})();
function watchFile(filepath) {
    let processing = false;
    let debounceTimer = null;
    let failCounter = 0;
    (0, fs_1.watch)(filepath, async (eventType) => {
        if (eventType !== 'change')
            return;
        if (failCounter >= 5 && await machine_1.default.canConnectToTelegram()) {
            await new Promise(resolve => setTimeout(resolve, 500));
            failCounter = 0;
        }
        ;
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            [processing, debounceTimer, failCounter] = await handleFileChange(filepath, processing, debounceTimer, failCounter);
        }, 200);
    });
}
async function handleFileChange(filepath, processing, debounceTimer, failCounter) {
    if (processing)
        return [processing, debounceTimer, failCounter];
    try {
        await FastLogProcess(filepath);
    }
    catch (error) {
        failCounter++;
        logging_1.default.error(`Error processing log: ${error}`);
    }
    return [false, null, failCounter];
}
function initialFilePull(filepath) {
    try {
        FastLogProcess(filepath).catch(console.error);
    }
    catch (error) {
        console.error('Error processing log:', error);
    }
}
//# sourceMappingURL=index.js.map