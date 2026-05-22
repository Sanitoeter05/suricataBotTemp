export interface LogLine {
    priority: number;
    classification: string;
    timestamp: string;
    message: string;
    protocol: string;
    sourceAddr: string;
    destAddr: string;
    signatureId: number;
};