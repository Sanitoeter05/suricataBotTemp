import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.json());

app.post("/webhook/health", (req, res) => {
    console.log(req.body);
    res.status(200).send("Webhook received");
});

app.post("/webhook", (req, res) => {
    console.log(req.body);
    res.status(200).send("Webhook received");
});

const options = {
    pfx: fs.readFileSync(path.join(__dirname, '../../certs/cert.pfx')),
    passphrase: 'password'
};

https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS Server is running on port ${port}`);
});