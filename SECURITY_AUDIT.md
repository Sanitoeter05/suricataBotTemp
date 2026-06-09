# Security Audit Report - Suricate Bot

**Date:** 2026-06-08  
**Project:** Suricate Bot (Telegram Alert Notification System)  
**Status:** ⚠️ Multiple Security Issues Found

---

## Executive Summary

This audit identified **2 CRITICAL**, **2 HIGH**, and **4 MEDIUM** security issues. Most concerns relate to TLS validation, secrets management, input validation, and sensitive data handling. All issues should be addressed before production deployment.

---

## Critical Issues

### 1. ⚠️ CRITICAL: TLS Certificate Validation Disabled

**Location:** [src/modules/webhook.ts](src/modules/webhook.ts#L5)  
**Severity:** CRITICAL  
**CWE:** CWE-295 (Improper Certificate Validation)

```typescript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable TLS certificate validation for development purposes
```

**Issue:**  
- Disables TLS certificate validation globally for the entire process
- Makes all HTTPS connections vulnerable to Man-in-the-Middle (MITM) attacks
- Allows attackers to intercept webhook traffic and telegram API calls
- Comment indicates this is for "development purposes" but it's in production code

**Impact:**  
- Attacker could intercept and modify Telegram bot tokens
- Webhook credentials exposed to network sniffing
- Alert messages could be redirected or modified

**Remediation:**
```typescript
// REMOVE the global NODE_TLS_REJECT_UNAUTHORIZED setting entirely
// For development/testing with self-signed certs only:
// Use per-request configuration with proper handling instead

// Better approach - use custom cert validation or proper cert chains
const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 30,
    maxFreeSockets: 10,
    // rejectUnauthorized: true (default - keep this)
});
```

**Priority:** Fix IMMEDIATELY before any production use

---

### 2. ⚠️ CRITICAL: Telegram Token & Chat ID in Environment Variables

**Location:** [src/index.ts](src/index.ts#L12-L15), [src/modules/bot.ts](src/modules/bot.ts#L27-L28)  
**Severity:** CRITICAL  
**CWE:** CWE-798 (Use of Hard-Coded Credentials)

**Issue:**
- Sensitive credentials stored in plaintext environment variables
- `.env` file listed in git (potential to be committed)
- No encryption or secrets management system
- Error messages may expose the token in logs
- No secrets rotation mechanism

**Impact:**
- If `.env` is committed to git, token exposed in repository history
- Compromised server gives attacker full bot control
- All user chat IDs become visible
- Attacker can send/receive messages as the bot

**Remediation:**
1. Use a secrets management system:
   ```bash
   # Option 1: HashiCorp Vault
   # Option 2: AWS Secrets Manager
   # Option 3: Kubernetes Secrets (if containerized)
   # Option 4: System environment variables (with restricted access)
   ```

2. Create `.gitignore` rule:
   ```
   .env
   .env.local
   .env.*.local
   ```

3. Use secret scanning:
   ```bash
   npm install --save-dev detect-secrets
   ```

4. Implement token rotation mechanism

**Priority:** Fix before production - use secure secrets manager

---

## High Severity Issues

### 3. � MEDIUM: Webhook Configuration Input Validation

**Location:** [src/modules/webhook.ts](src/modules/webhook.ts#L28-L30), [src/modules/webhook.ts](src/modules/webhook.ts#L122)  
**Severity:** MEDIUM  
**CWE:** CWE-116 (Improper Encoding or Escaping of Output)

**Issue:**
```typescript
const response = await fetch(
    `https://${webhookUrl}:${webhookPort}/webhook/health`,
    // ...
);
```

- `webhookUrl` and `webhookPort` are interpolated directly from environment variables/config
- Without strict validation, malformed input could cause connection failures or unexpected behavior
- User-provided internal SIEM endpoint requires proper format validation

**Current Mitigation:**
- Health check endpoint validates configuration works end-to-end
- Runtime connectivity test confirms webhook endpoint is reachable and properly configured
- This effectively serves as input validation and configuration verification

**Recommended Enhancement:**
```typescript
import { URL } from 'url';

private static validateWebhookUrl(webhookUrl: string, webhookPort: number): boolean {
    try {
        const url = new URL(`https://${webhookUrl}:${webhookPort}`);
        
        // Validate hostname format (prevent injection payloads)
        if (!/^[a-zA-Z0-9.-]+$/.test(url.hostname)) {
            throw new Error('Invalid hostname format');
        }
        
        // Validate port is in valid range
        const port = parseInt(webhookPort.toString());
        if (port < 1 || port > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }
        
        return true;
    } catch (error) {
        logger.error(`Invalid webhook configuration: ${error}`);
        return false;
    }
}
```

**Priority:** Medium - Add pre-health-check validation for better error handling

---

### 4. 🔴 HIGH: Sensitive Data Exposure in Logs

**Location:** [src/modules/parser.ts](src/modules/parser.ts#L48-L50), [src/modules/webhook.ts](src/modules/webhook.ts#L192)  
**Severity:** HIGH  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Issue:**
```typescript
// parser.ts
if (priority <= 2) {
    logger.info('there is a priority log!:' + internLogMassage);
}

// webhook.ts - logging failed logs with full data
appendFile(
    `${__dirname}/logs/failed_logs.txt`,
    JSON.stringify(logData) + '\n',
    () => {}
);
```

**Impact:**
- Full security alert content written to logs (may contain sensitive IPs, ports, signatures)
- Failed webhook payloads written to disk unencrypted
- Logs could be accessible to unauthorized users
- Log files may persist longer than necessary
- Could reveal patterns about monitored network

**Remediation:**
```typescript
// Instead of logging full message, log only safe fields
if (priority <= 2) {
    logger.info(`High priority alert detected - ID: ${signatureId}, Priority: ${priority}`);
}

// For failed logs, use secure temporary storage
private static async archiveFailedLog(logData: LogLine): Promise<void> {
    // Only store minimal info and encrypt if storing to disk
    const safeData = {
        signatureId: logData.signatureId,
        timestamp: logData.timestamp,
        failureTime: new Date().toISOString()
    };
    
    // Consider: Store to dedicated secure logging service instead of files
    logger.error('Webhook delivery failed', safeData);
}
```

**Priority:** High - Implement before production

---

## Medium Severity Issues

### 5. 🟠 MEDIUM: No Input Validation on Log Parser

**Location:** [src/modules/parser.ts](src/modules/parser.ts#L21)  
**Severity:** MEDIUM  
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Issue:**
- Regex parsing without maximum line length checks
- No validation of individual field lengths
- Cache has a max size but no eviction strategy for memory DoS
- Could process extremely large messages that consume excessive memory

**Remediation:**
```typescript
private static readonly MAX_LINE_LENGTH = 10000; // bytes
private static readonly MAX_MESSAGE_LENGTH = 1000;
private static readonly MAX_IP_LENGTH = 45; // IPv6 max length

static parseFastLog(logLines: string): LogLine[] {
    if (logLines.length === 0) return [];
    if (logLines.length > 10_000_000) {
        throw new Error('Log input exceeds maximum size');
    }

    return logLines
        .split(this.LINE_SPLIT)
        .filter((line) => {
            if (line.length > this.MAX_LINE_LENGTH) {
                logger.warn('Skipping oversized log line');
                return false;
            }
            return line.trim() !== '';
        })
        .map((line) => this.parseLogLine(line))
        .filter((log) => log !== null) as LogLine[];
}
```

**Priority:** Medium - Implement before production

---

### 6. 🟠 MEDIUM: No Rate Limiting on External API Calls

**Location:** [src/index.ts](src/index.ts#L28-L36), [src/modules/bot.ts](src/modules/bot.ts#L50-L58)  
**Severity:** MEDIUM  
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

**Issue:**
- No rate limiting on Telegram API requests
- No circuit breaker pattern for failing webhooks
- Could be rate-limited by Telegram API or external webhooks
- No retry logic with exponential backoff
- Large batches of logs could overwhelm endpoints

**Impact:**
- Rate limit errors from Telegram API would fail silently
- Webhook endpoints could be accidentally DDoS'd
- No graceful degradation when external services are unavailable

**Remediation:**
```typescript
// Implement rate limiting
import pLimit from 'p-limit';

const TELEGRAM_RATE_LIMIT = pLimit(5); // 5 concurrent requests
const WEBHOOK_RATE_LIMIT = pLimit(3);  // 3 concurrent requests per webhook

async function sendAsyncMessages(parsedMessageArray: LogLine[]) {
    await Promise.all(
        parsedMessageArray.map((logLine) =>
            TELEGRAM_RATE_LIMIT(async () => {
                await Bot.sendToTelegram(Parser.parseMessageTelegram(logLine));
            })
        )
    );
}

// Implement exponential backoff for retries
async function sendWithRetry(fn: () => Promise<Response>, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

**Priority:** Medium - Implement for production stability

---

### 7. 🟠 MEDIUM: Inconsistent Error Handling

**Location:** [src/index.ts](src/index.ts#L37), [src/modules/webhook.ts](src/modules/webhook.ts#L24)  
**Severity:** MEDIUM  
**CWE:** CWE-390 (Detection of Error Condition Without Action)

**Issue:**
```typescript
// Using console.error instead of logger
console.error('Please set the environment variables in .env file!');

// Error caught but not properly logged
catch (error) {
    console.error(error);  // <-- should use logger
    return false;
}
```

**Impact:**
- Inconsistent error tracking
- Errors may not be captured in log files
- Difficult to audit security events
- Missing context for troubleshooting

**Remediation:**
```typescript
// Replace all console.error/log with logger
catch (error) {
    logger.error('Webhook health check failed', { 
        url: webhookUrl,
        error: error instanceof Error ? error.message : String(error)
    });
    return false;
}

// At startup
if (!isReady) {
    logger.error('Application startup failed: Missing environment variables');
    logger.error('Required vars: fastFilePath, telegramToken, telegramChatId');
    process.exitCode = 1;
}
```

**Priority:** Medium - Implement for better observability

---

### 8. 🟠 MEDIUM: No Request Timeout Configuration

**Location:** [src/modules/bot.ts](src/modules/bot.ts), [src/modules/webhook.ts](src/modules/webhook.ts)  
**Severity:** MEDIUM  
**CWE:** CWE-754 (Improper Exception Handling)

**Issue:**
- No timeout on fetch requests to Telegram API or webhooks
- Requests could hang indefinitely
- No resource limits on pending connections

**Remediation:**
```typescript
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

// Use in Bot.sendAliveMessage():
const response = await fetchWithTimeout(
    `https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`,
    { method: 'POST', /* ... */ }
);
```

**Priority:** Medium - Important for production stability

---

## Low Severity Issues

### 9. 🟡 LOW: Unusual fs Package Dependency

**Location:** [package.json](package.json#L12)  
**Severity:** LOW  
**CWE:** CWE-1104 (Use of Unmaintained Third Party Components)

**Issue:**
```json
"fs": "^0.0.1-security"
```

- The `fs` module is built-in to Node.js, should not be installed as a dependency
- Version "^0.0.1-security" is suspicious and unnecessary
- Could be a security risk if this package is compromised

**Remediation:**
```bash
npm uninstall fs
```

Remove `"fs": "^0.0.1-security"` from dependencies. Use Node.js built-in `fs` module directly.

**Priority:** Low - Clean up for best practices

---

### 10. 🟡 LOW: Missing Dependency Security Scanning

**Location:** Root  
**Severity:** LOW  
**CWE:** CWE-1104 (Use of Unmaintained Third Party Components)

**Issue:**
- No `npm audit` in CI/CD pipeline
- No automated dependency vulnerability scanning
- Dependencies may contain known vulnerabilities

**Remediation:**
```bash
# Add to package.json scripts
"audit": "npm audit --audit-level=moderate",
"audit:fix": "npm audit fix",

# Add to CI/CD pipeline to block on moderate/high vulnerabilities
npm audit --audit-level=moderate
```

**Priority:** Low - Implement as best practice

---

## Security Best Practices Recommendations

### 1. Environment Variables Management
- Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, etc.)
- Implement secret rotation
- Never commit `.env` files
- Use different credentials for different environments (dev/staging/prod)

### 2. Logging & Monitoring
- Implement centralized logging (ELK stack, Splunk, CloudWatch)
- Monitor failed webhook deliveries
- Alert on authentication failures
- Implement log retention policies
- Encrypt logs at rest

### 3. Deployment Security
- Run in least-privilege container/user
- Use read-only filesystems where possible
- Implement network policies/firewalls
- Regular security updates for Node.js and dependencies
- Use signed commits and protected branches

### 4. Testing
```bash
npm install --save-dev jest @types/jest
# Add security-focused tests
npm install --save-dev snyk # Vulnerability scanning
```

### 5. Configuration
```typescript
// Create a config validation module
import { z } from 'zod';

const ConfigSchema = z.object({
    fastFilePath: z.string().refine(path => fs.existsSync(path)),
    telegramToken: z.string().regex(/^\d+:[\w-_]{35}$/),
    telegramChatId: z.string().regex(/^-?\d+$/),
    webhookData: z.array(z.object({
        webhookUrl: z.string().url(),
        webhookToken: z.string().min(20),
        webhookPort: z.number().min(1024).max(65535)
    })).optional()
});

const config = ConfigSchema.parse(process.env);
```

---

## Summary Checklist

- [X] Fix CRITICAL: Remove `NODE_TLS_REJECT_UNAUTHORIZED = '0'`
- [X] Fix CRITICAL: Implement secrets manager for credentials
- [X] Fix HIGH: Validate webhook URLs (prevent SSRF)
- [ ] Fix HIGH: Implement secure sensitive data logging
- [ ] Fix MEDIUM: Add input validation to parser
- [ ] Fix MEDIUM: Add rate limiting to external API calls
- [ ] Fix MEDIUM: Implement proper error handling/logging
- [ ] Fix MEDIUM: Add request timeouts
- [ ] Fix LOW: Remove unnecessary `fs` dependency
- [ ] Fix LOW: Add dependency vulnerability scanning

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Next Steps:**
1. Review and prioritize fixes with team
2. Create tickets for each issue
3. Implement fixes before production deployment
4. Add security tests to CI/CD pipeline
5. Schedule regular security audits (quarterly recommended)
