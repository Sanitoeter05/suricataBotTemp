import { readFileSync, writeFile, appendFile, watch } from 'fs';
import dotenv from 'dotenv';
import logger from './modules/logging';
import Bot from './modules/bot';
import Parser from './modules/parser';
import { LogLine } from './types/types';
import machine from './modules/machine';
import webhook from './modules/webhook';

dotenv.config({ quiet: true });

async function checkIfReady(): Promise<boolean> {
    return !!(
        process.env.fastFilePath &&
        process.env.telegramToken &&
        process.env.telegramChatId &&
        await Bot.botIsHealthy() && 
        await webhook.checkWebhookHealthProccess(process.env.webhookData ? JSON.parse(process.env.webhookData) : [])
        
    );
}

async function FastLogProcess(filepath: string): Promise<void> {
    const logContent = readFileSync(filepath, 'utf-8');
    writeFile(filepath, '', () => {});
    if (logContent.length === 0) return;
    const parsed = Parser.parseFastLog(logContent);
    try {
        await sendAsyncMessages(parsed);
    } catch (error) {
        logger.error(`Error sending messages: ${error}`);
        appendFile(`${__dirname}/logs/failed_logs.txt`, logContent, () => {});
    }
}

async function sendAsyncMessages(parsedMessageArray: LogLine[]) {
    await Promise.all(
        parsedMessageArray.map( async (logLine) => {
            await Bot.sendToTelegram(Parser.parseMessageTelegram(logLine));
            if(process.env.webhookData) {
                await webhook.sendMessageToWebhookProcess(logLine, JSON.parse(process.env.webhookData));
            };
        })
    );
}
(async () => {
    if (await checkIfReady()) {
        const filepath = process.env.fastFilePath as string;
        initialFilePull(filepath);
        watchFile(filepath);

        logger.info(`Watching ${filepath} for changes...`);
    } else {
        console.error('Please set the environment variables in .env file!');
        process.exitCode = 1;
    }
})();

function watchFile(filepath: string) {
    let processing = false;
    let debounceTimer: NodeJS.Timeout | null = null;
    let failCounter = 0;
    watch(filepath, async (eventType) => {
        if (eventType !== 'change') return;

        if (failCounter >= 5 && (await machine.canConnectToTelegram())) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            failCounter = 0;
        }

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            [processing, debounceTimer, failCounter] = await handleFileChange(
                filepath,
                processing,
                debounceTimer,
                failCounter
            );
        }, 200);
    });
}

async function handleFileChange(
    filepath: string,
    processing: boolean,
    debounceTimer: NodeJS.Timeout | null,
    failCounter: number
): Promise<[boolean, NodeJS.Timeout | null, number]> {
    if (processing) return [processing, debounceTimer, failCounter];
    try {
        await FastLogProcess(filepath);
    } catch (error) {
        failCounter++;
        logger.error(`Error processing log: ${error}`);
    }
    return [false, null, failCounter];
}

function initialFilePull(filepath: string) {
    try {
        FastLogProcess(filepath).catch(console.error);
    } catch (error) {
        console.error('Error processing log:', error);
    }
}
