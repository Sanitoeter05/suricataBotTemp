import fs from 'fs';
import dotenv from 'dotenv';
import logger from './modules/logging';
import Bot from './modules/bot';
import Parser from './modules/parser';
import { LogLine } from './types/types';

dotenv.config();

function checkIfReady(): boolean {
    return !!(
        process.env.fastFilePath &&
        process.env.telegramToken &&
        process.env.telegramChatId
    );
}

async function FastLogProcess(filepath: string): Promise<void> {
    const logContent = fs.readFileSync(filepath, 'utf-8');
    fs.writeFileSync(filepath, '');
    if (logContent.length === 0) return;
    const parsed = Parser.parseFastLog(logContent);
    try {
        await sendAsyncMessages(parsed);
    } catch (error) {
        logger.error(`Error sending messages: ${error}`);
        fs.appendFileSync(`${__dirname}/failed_logs.txt`, logContent);
    }
}

async function sendAsyncMessages(parsedMessageArray: LogLine[]) {
    await Promise.all(
        parsedMessageArray.map(async (logLine) => {
            await Bot.sendToTelegram(Parser.parseMessageTelegram(logLine));
        })
    );
}

if (checkIfReady()) {
    const filepath = process.env.fastFilePath as string;
    initialFilePull(filepath);
    watchFile(filepath);

    logger.info(`Watching ${filepath} for changes...`);
} else {
    console.error('Please set the environment variables in .env file!');
    process.exit(1);
}

function watchFile(filepath: string) {
    let processing = false;
    let debounceTimer: NodeJS.Timeout | null = null;

    fs.watch(filepath, (eventType) => {
        if (eventType !== 'change') return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            [processing, debounceTimer] = await handleFileChange(
                filepath,
                processing,
                debounceTimer
            );
        }, 200);
    });
}

async function handleFileChange(
    filepath: string,
    processing: boolean,
    debounceTimer: NodeJS.Timeout | null
): Promise<[boolean, NodeJS.Timeout | null]> {
    if (processing) return [processing, debounceTimer];
    try {
        await FastLogProcess(filepath);
    } catch (error) {
        logger.error(`Error processing log: ${error}`);
        console.error('Error processing log:', error);
    }
    return [false,null];
}

function initialFilePull(filepath: string) {
    try {
        FastLogProcess(filepath).catch(console.error);
    } catch (error) {
        console.error('Error processing log:', error);
    }
}
