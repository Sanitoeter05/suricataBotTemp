"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
const logDir = `${__dirname}/../../logs`;
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
const destination = pino_1.default.destination({
    dest: `${logDir}/app.log`,
    minLength: 4096,
    fsync: false,
    autoEnd: false,
});
const logger = (0, pino_1.default)({
    level: process.env.PINO_LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
}, destination);
exports.default = logger;
//# sourceMappingURL=logging.js.map