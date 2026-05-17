import fs from 'fs';
import dotenv from 'dotenv';
import logger from './modules/logging';

dotenv.config();

const LOG_REGEX =
    /^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(\d+):(\d+):(\d+)\]\s+(.+?)\s+\[\*\*\]\s+\[Classification:\s+(.+?)\]\s+\[Priority:\s+(\d+)\]\s+\{(.+?)\}\s+(.+?)\s+->\s+(.+)$/;

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

    const parsed = parseFastLog(logContent);
    for (const logLine of parsed) {
        await sendToTelegram(parseMessageTelegram(logLine));
    }

    fs.writeFileSync(filepath, '');
}

function parseFastLog(logLines: string): object[] {
    return logLines
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
        .map((line) => parseLogLine(line))
        .filter((log) => log !== null);
}

function parseLogLine(logLine: string): object | null {
    const match = logLine.match(LOG_REGEX); // ← pre-compiled Regex
    if (!match) return null;

    if (parseInt(match[7]) <= 2) {
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
    if (!logLine) return '';
    return `*New security alert with priority: ${logLine['priority']}*\n\n*Classification: ${logLine['classification']} Time Stamp: ${logLine['timestamp']}*\nAlert message: ${logLine['message'].replace('_', '')}\n\n${logLine['protocol']}: ${logLine['sourceAddr']} -> ${logLine['destAddr']}\n\nSID: ${logLine['signatureId']}`;
}

async function sendToTelegram(message: string): Promise<boolean> {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: process.env.telegramChatId,
                    text: message,
                    parse_mode: 'Markdown',
                }),
            }
        );

        if (!response.ok) {
            logger.error(
                `Failed to send to Telegram: ${response.statusText}\nMessage: ${message}`
            );
            return false;
        }
        return true;
    } catch (error) {
        logger.error(`Error sending to Telegram: ${error}`);
        return false;
    }
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
