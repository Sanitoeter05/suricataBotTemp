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
    if (logContent.length === 0) return;

    const parsed = Parser.parseFastLog(logContent);
    await sendAsyncMessages(parsed);
    fs.writeFileSync(filepath, '');
}

async function sendAsyncMessages(parsedMessageArray: LogLine[]) {
    await Promise.all(
        parsedMessageArray.map(async (logLine) => {
            await Bot.sendToTelegram(Bot.parseMessageTelegram(logLine));
        })
    );
}

if (checkIfReady()) {
    const filepath = process.env.fastFilePath as string;
    let processing = false;
    let debounceTimer: NodeJS.Timeout | null = null;

    FastLogProcess(filepath).catch(console.error);

    fs.watch(filepath, (eventType) => {
        if (eventType !== 'change') return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (processing) return;
            processing = true;
            try {
                await FastLogProcess(filepath);
            } catch (error) {
                logger.error(`Error processing log: ${error}`);
                console.error('Error processing log:', error);
            } finally {
                processing = false;
                debounceTimer = null;
            }
        }, 200);
    });

    logger.info(`Watching ${filepath} for changes...`);
} else {
    console.error('Please set the environment variables in .env file!');
    process.exit(1);
}
