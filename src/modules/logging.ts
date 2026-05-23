import pino from 'pino';
import fs from 'fs';

const logDir = `${__dirname}/../../logs`;
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const destination = pino.destination({
    dest: `${logDir}/app.log`,
    minLength: 4096,
    fsync: false,
    autoEnd: false,
});

const logger = pino(
    {
        level: process.env.PINO_LOG_LEVEL || 'info',
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination
);

export default logger;
