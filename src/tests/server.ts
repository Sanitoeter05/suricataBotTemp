import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

let server: http.Server | https.Server | null = null;
let receivedData: { endpoint: string; data: object; timestamp: number }[] = [];

interface ServerConfig {
    port?: number;
    https?: boolean;
}

export function createServer(config: ServerConfig = {}) {
    const { port = 3000, https: useHTTPS = true } = config;

    if (server) {
        console.warn('Server already running. Call stopServer() first.');
        return server;
    }

    const app = express();
    app.use(express.json());

    app.post('/webhook/health', (req, res) => {
        receivedData.push({
            endpoint: '/webhook/health',
            data: req.body,
            timestamp: Date.now(),
        });
        res.status(200).send('Webhook received');
    });

    app.post('/webhook', (req, res) => {
        receivedData.push({
            endpoint: '/webhook',
            data: req.body,
            timestamp: Date.now(),
        });
        res.status(200).send('Webhook received');
    });

    if (useHTTPS) {
        const options = {
            pfx: fs.readFileSync(path.join(__dirname, '../../certs/cert.pfx')),
            passphrase: 'password',
        };
        server = https.createServer(options, app);
        console.log(`🔒 HTTPS Server created on port ${port}`);
    } else {
        server = http.createServer(app);
        console.log(`🌐 HTTP Server created on port ${port}`);
    }

    return server;
}

export function startServer(port = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!server) {
            reject(new Error('Server not created. Call createServer() first.'));
            return;
        }

        server
            .listen(port, () => {
                console.log(`✅ Server is running on port ${port}`);
                resolve();
            })
            .on('error', reject);
    });
}

export function stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!server) {
            resolve();
            return;
        }

        server.close((err) => {
            if (err) reject(err);
            server = null;
            console.log('❌ Server stopped');
            resolve();
        });
    });
}

export function getServer() {
    return server;
}

export function getReceivedData() {
    return receivedData;
}

export function getReceivedDataByEndpoint(endpoint: string) {
    return receivedData.filter((d) => d.endpoint === endpoint);
}

export function clearReceivedData() {
    receivedData = [];
}

// Auto-start if run directly (not imported in tests)
if (require.main === module) {
    createServer({ https: true });
    startServer(3000).catch(console.error);
}
