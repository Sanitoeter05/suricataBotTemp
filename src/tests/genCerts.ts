import fs from 'fs';
import path from'path';
import { exec } from'child_process';

// Using PowerShell to generate self-signed cert
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

const psCommand = `$cert = New-SelfSignedCertificate -DnsName localhost -CertStoreLocation cert:\\CurrentUser\\My -NotAfter (Get-Date).AddYears(1); Export-PfxCertificate -Cert $cert -FilePath "${path.join(certDir, 'cert.pfx')}" -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)`;

exec(`powershell -Command "${psCommand}"`, (error) => {
    if (error) console.error('Cert generation failed:', error);
    else console.log('Certificates generated in ./certs/');
});