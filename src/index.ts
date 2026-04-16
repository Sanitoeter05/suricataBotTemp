import fs from 'fs';
import dotenv from 'dotenv';
import logger from './modules/logging';

dotenv.config();

function getLogContent(path: string): string {
    if (!path) {
        throw new Error('Path is not defined or is not there!');
    }
    const logFile = fs.readFileSync(path, 'utf-8');
    return logFile;
}

function clearLogContent(path: string): void {
    if (!path) {
        throw new Error('Path is not defined or is not there!');
    }
    fs.writeFileSync(path, '');
}

function getFileSize(path: string): number {
    if (!path) {
        throw new Error('Path is not defined or is not there!');
    }
    const stats = fs.statSync(path);
    return stats.size;
}
function checkIfReady(): boolean {
    if (
        process.env.fastFilePath &&
        process.env.telegramToken &&
        process.env.telegramChatId
    ) {
        return true;
    }
    return false;
}

async function FastLogProcess(filepath: string): Promise<void> {
    const fileSize = getFileSize(filepath);
    if (fileSize > 0) {
        const logContent = parseFastLog(getLogContent(filepath));
        for (const  logLine of logContent) {
            const message = parseMessageTelegram(logLine);
            await sendToTelegram(message);
        }
        clearLogContent(filepath);
    }
}

async function main(): Promise<void> {
    await FastLogProcess(process.env.fastFilePath as string);
}

function parseFastLog(logLines: string): object[] {
    let logs = [];
    logs = logLines
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
        .map((line) => parseLogLine(line))
        .filter((log) => log !== null);
    return logs;
}

function parseLogLine(logLine: string): object | null {
    const regex =
        /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\]\s+\[Classification:\s+(.+?)\]\s+\[Priority:\s+(\d+)\]\s+\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;

    const match = logLine.match(regex);

    if (!match) {
        return null; // Skip invalid lines instead of throwing
    }
    if (parseInt(match[7]) == 1 || parseInt(match[7]) == 2) {
        logger.info('there is a priority log!:' + logLine);
    }
    return {
        timestamp: match[1],
        generatorId: match[2],
        signatureId: match[3],
        revision: match[4],
        message: match[5],
        classification: match[6],
        priority: parseInt(match[7]),
        protocol: match[8],
        sourceAddr: match[9],
        destAddr: match[10],
    };
}

function parseMessageTelegram(logLine: any): string {
    if (!logLine) {
        return '';
    }
    return `*New security alert with pritory: ${logLine['priority']}*\n\n*Classification: ${logLine['classification']} Time Stamp: ${logLine['timestamp']}*\nAlert message: ${logLine['message'].replace('_', '')}\n\n${logLine['protocol']}: ${logLine['sourceAddr']} -> ${logLine['destAddr']}\n\nSID: ${logLine['signatureId']}`;
}

async function sendToTelegram(message: string): Promise<boolean> {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: process.env.telegramChatId,
                    text: message,
                    parse_mode: 'Markdown',
                }),
            }
        );

        if (!response.ok) {
            console.error(
                'Failed to send message to Telegram:',
                response.statusText
            );
            logger.error(
                `Failed to send message to Telegram: ${response.statusText}\n Message: ${message}`
            );
            return false;
        } else {
            return true;
        }
    } catch (error) {
        logger.error(`Error sending message to Telegram: ${error}`);
        console.error('Error sending message to Telegram:', error);
        return false;
    }
}

if (checkIfReady()) {
    (async () => {
        while (true) {
            try {
                await main();
            } catch (error) {
                console.error('Error in main:', error);
            }
            await new Promise((resolve) => setTimeout(resolve, 60 * 1000)); // Wait for 1 second before checking the log file again
        }
    })().catch((error) => {
        console.error('Fatal error in main loop:', error);
    });
} else {
    console.error('Please set the environment variables in .env file!');
}
