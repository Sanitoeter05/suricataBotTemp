# Security Remediation Action Plan

**Priority:** URGENT  
**Timeline:** All CRITICAL issues should be fixed before any production deployment

---

## Phase 1: CRITICAL Fixes (Do First - Before Any Deployment)

### Task 1.1: Remove TLS Certificate Validation Bypass

**File:** [src/modules/webhook.ts](src/modules/webhook.ts#L5)

**Current Code:**
```typescript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable TLS certificate validation
```

**Action:** DELETE this line entirely.

**Verification:**
```bash
grep -r "NODE_TLS_REJECT_UNAUTHORIZED" src/
# Should return no results
```

---

### Task 1.2: Implement Secrets Manager

**Current Approach:** Environment variables (.env file)  
**Recommended:** Use one of:

**Option A: HashiCorp Vault** (Most enterprise)
```bash
npm install @hashicorp/vault-jwt-tool node-vault
```

**Option B: AWS Secrets Manager** (If on AWS)
```bash
npm install @aws-sdk/client-secrets-manager
```

**Option C: Azure Key Vault** (If on Azure)
```bash
npm install @azure/identity @azure/keyvault-secrets
```

**Option D: Kubernetes Secrets** (If containerized)
```yaml
# k8s deployment
env:
  - name: TELEGRAM_TOKEN
    valueFrom:
      secretKeyRef:
        name: suricate-secrets
        key: telegram-token
```

**Implementation Example (HashiCorp Vault):**
```typescript
// Create src/modules/secrets.ts
import vault from 'node-vault';

const vaultClient = vault({
    endpoint: process.env.VAULT_ADDR || 'https://vault.example.com:8200',
    token: process.env.VAULT_TOKEN
});

export async function getSecrets() {
    const result = await vaultClient.read('secret/data/suricate');
    return result.data.data; // { telegramToken, telegramChatId, webhookTokens }
}
```

**Update [src/index.ts](src/index.ts) to use secrets manager:**
```typescript
import { getSecrets } from './modules/secrets';

const secrets = await getSecrets();
process.env.telegramToken = secrets.telegramToken;
process.env.telegramChatId = secrets.telegramChatId;
```

**Timeline:** 1-2 hours  
**Blockers:** None

---

## Phase 2: HIGH Severity Fixes (1-2 days)

### Task 2.1: Validate Webhook URLs

**File:** [src/modules/webhook.ts](src/modules/webhook.ts)

**Add Validation Function:**
```typescript
private static validateWebhookUrl(webhookUrl: string, webhookPort: number): boolean {
    try {
        const url = new URL(`https://${webhookUrl}:${webhookPort}`);
        
        // Block internal addresses
        const internalHosts = [
            'localhost', '127.0.0.1', '::1', '0.0.0.0', '::',
            '169.254.169.254' // AWS metadata endpoint
        ];
        
        if (internalHosts.includes(url.hostname)) {
            logger.warn(`Blocked internal webhook URL: ${webhookUrl}`);
            return false;
        }
        
        // Block private IP ranges
        const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
        const match = url.hostname.match(ipv4Regex);
        
        if (match) {
            const [, octet1, octet2] = match.map(Number);
            // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
            if (octet1 === 10 || 
                (octet1 === 172 && octet2 >= 16 && octet2 <= 31) ||
                (octet1 === 192 && octet2 === 168)) {
                logger.warn(`Blocked private IP webhook URL: ${webhookUrl}`);
                return false;
            }
        }
        
        // Validate port
        const port = parseInt(webhookPort.toString());
        if (port < 1024 || port > 65535) {
            logger.warn(`Invalid port: ${port}`);
            return false;
        }
        
        return true;
    } catch (error) {
        logger.error('Invalid webhook URL format', { webhookUrl, error });
        return false;
    }
}
```

**Update Constructor/Initialization:**
```typescript
public static async checkWebhookHealthProccess(
    webhookData: webhookData[]
): Promise<boolean> {
    if (webhookData.length === 0) return true;
    
    for (const data of webhookData) {
        if (!this.validateWebhookUrl(data.webhookUrl, data.webhookPort)) {
            return false;
        }
    }
    
    const healthChecks = webhookData.map((data) =>
        this.checkWebhookHealth(
            data.webhookUrl,
            data.webhookToken,
            data.webhookPort
        )
    );
    const results = await Promise.all(healthChecks);
    return results.every((isHealthy) => isHealthy);
}
```

**Timeline:** 2-3 hours  
**Testing:** Add webhook validation tests

---

### Task 2.2: Implement Secure Logging

**Files:** 
- [src/modules/parser.ts](src/modules/parser.ts#L48-L50)
- [src/modules/webhook.ts](src/modules/webhook.ts#L192)
- [src/modules/bot.ts](src/modules/bot.ts)

**Changes to [src/modules/parser.ts](src/modules/parser.ts):**
```typescript
private static parseLogLine(internLogMassage: string): LogLine | null {
    const match = internLogMassage.match(this.LOG_REGEX);
    if (!match) {
        logger.error('Failed to parse log line - regex mismatch');
        return null;
    }

    const priority = parseInt(match[7]);

    // Log only the priority, not the full message
    if (priority <= 2) {
        logger.warn('High-priority security alert detected', {
            priority,
            signatureId: match[3],
            classification: match[6],
            // Don't log sensitive data like full message or IPs
        });
    }

    // ... rest of method
}
```

**Changes to [src/modules/webhook.ts](src/modules/webhook.ts):**
```typescript
// Instead of writing failed logs to file, use logger
} catch (error) {
    const cause = error instanceof Error
        ? (error.cause as NodeJS.ErrnoException)
        : null;
    const errorCode = cause?.code;
    
    if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED') {
        // Log minimal info only - don't store full payload
        logger.error('Webhook delivery failed - connection error', {
            signatureId: logData.signatureId,
            timestamp: logData.timestamp,
            errorCode,
            // Don't log: logData, webhookUrl, webhook token
        });
        
        // Optional: Use a dedicated failed messages queue/database
        // instead of writing to disk
        return 3;
    } else {
        logger.error('Webhook delivery failed - unknown error', {
            signatureId: logData.signatureId,
            errorCode: errorCode || 'UNKNOWN'
        });
        return 4;
    }
}
```

**Timeline:** 2-3 hours  
**Impact:** Improved security + better observability

---

## Phase 3: MEDIUM Severity Fixes (3-4 days)

### Task 3.1: Add Input Validation

**File:** [src/modules/parser.ts](src/modules/parser.ts)

```typescript
export default class Parser {
    private static readonly MAX_LINE_LENGTH = 10000;
    private static readonly MAX_MESSAGE_LENGTH = 1000;
    private static readonly MAX_IP_LENGTH = 45;
    private static readonly MAX_SIGNATURE_ID_LENGTH = 10;
    private static readonly MAX_LOG_INPUT_SIZE = 50_000_000; // 50MB max

    static parseFastLog(logLines: string): LogLine[] {
        if (logLines.length === 0) return [];

        // Size validation
        if (logLines.length > this.MAX_LOG_INPUT_SIZE) {
            logger.error('Log input exceeds maximum size', {
                size: logLines.length,
                maxSize: this.MAX_LOG_INPUT_SIZE
            });
            throw new Error('Log input size exceeds maximum allowed');
        }

        if (this.cacheEntryCount > this.CACHE_MAX_SIZE) {
            this.clearCache();
        }

        return logLines
            .split(this.LINE_SPLIT)
            .filter((line) => {
                // Validate line length
                if (line.length > this.MAX_LINE_LENGTH) {
                    logger.warn('Skipping oversized log line', {
                        lineLength: line.length
                    });
                    return false;
                }
                return line.trim() !== '';
            })
            .map((line) => this.parseLogLine(line))
            .filter((log) => log !== null) as LogLine[];
    }

    private static parseLogLine(internLogMessage: string): LogLine | null {
        const match = internLogMessage.match(this.LOG_REGEX);
        if (!match) {
            logger.debug('Regex mismatch for log line');
            return null;
        }

        // Validate field lengths
        if (match[5].length > this.MAX_MESSAGE_LENGTH) {
            logger.warn('Message field exceeds maximum length');
            return null;
        }

        const priority = parseInt(match[7]);
        if (isNaN(priority) || priority < 1 || priority > 4) {
            logger.warn('Invalid priority value', { priority });
            return null;
        }

        // Validate IP address lengths
        const sourceAddr = match[9];
        const destAddr = match[10];
        if (sourceAddr.length > this.MAX_IP_LENGTH || 
            destAddr.length > this.MAX_IP_LENGTH) {
            logger.warn('IP address exceeds maximum length');
            return null;
        }

        const logObject: LogLine = {
            timestamp: match[1],
            generatorId: match[2],
            signatureId: match[3],
            revision: match[4],
            message: match[5],
            classification: match[6],
            priority,
            protocol: match[8],
            sourceAddr,
            destAddr,
        };

        const cacheKey = internLogMessage.substring(28, 46);
        const cachedObject = {
            generatorId: match[2],
            signatureId: match[3],
            revision: match[4],
            message: match[5],
            classification: match[6],
            priority,
        };

        this.logCache.set(cacheKey, cachedObject);
        this.cacheEntryCount++;

        return logObject;
    }
}
```

**Timeline:** 2-3 hours  
**Testing:** Add validation tests with edge cases

---

### Task 3.2: Add Rate Limiting

**New File:** [src/modules/rateLimiter.ts](src/modules/rateLimiter.ts)

```typescript
import pLimit from 'p-limit';

export class RateLimiter {
    private static telegramLimit = pLimit(3); // 3 concurrent Telegram requests
    private static webhookLimit = pLimit(2);  // 2 per webhook
    
    public static async sendTelegram<T>(
        fn: () => Promise<T>
    ): Promise<T> {
        return this.telegramLimit(fn);
    }

    public static async sendWebhook<T>(
        fn: () => Promise<T>
    ): Promise<T> {
        return this.webhookLimit(fn);
    }
}
```

**Update [src/modules/bot.ts](src/modules/bot.ts):**
```typescript
import { RateLimiter } from './rateLimiter';

public static async sendToTelegram(message: string): Promise<void> {
    return RateLimiter.sendTelegram(async () => {
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
                agent: agent,
            }
        );

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }
    });
}
```

**Timeline:** 2-3 hours  
**Installation:** `npm install p-limit @types/p-limit`

---

### Task 3.3: Add Request Timeouts

**Update [src/modules/bot.ts](src/modules/bot.ts) and [src/modules/webhook.ts](src/modules/webhook.ts):**

```typescript
const FETCH_TIMEOUT_MS = 15000; // 15 seconds

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

// Usage in Bot.sendAliveMessage():
private static async sendAliveMessage(): Promise<boolean> {
    try {
        const response = await fetchWithTimeout(
            `https://api.telegram.org/bot${process.env.telegramToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: process.env.telegramChatId,
                    text: 'Started SuricataBot',
                    parse_mode: 'Markdown',
                }),
                agent: agent,
            },
            10000 // 10 second timeout for this endpoint
        );
        return response.ok;
    } catch (error) {
        logger.error('Health check failed', error instanceof Error ? error.message : String(error));
        return false;
    }
}
```

**Timeline:** 2 hours

---

### Task 3.4: Consistent Error Handling

**Update all files to use logger instead of console:**

**[src/index.ts](src/index.ts):**
```typescript
(async () => {
    if (await checkIfReady()) {
        const filepath = process.env.fastFilePath as string;
        initialFilePull(filepath);
        watchFile(filepath);

        logger.info(`Watching ${filepath} for changes...`);
    } else {
        logger.error('Application startup failed', {
            reason: 'Environment variables missing or health checks failed'
        });
        logger.error('Required environment variables:', {
            fastFilePath: !!process.env.fastFilePath,
            telegramToken: !!process.env.telegramToken,
            telegramChatId: !!process.env.telegramChatId
        });
        process.exitCode = 1;
    }
})();

function initialFilePull(filepath: string) {
    try {
        FastLogProcess(filepath).catch((error) => {
            logger.error('Initial file pull failed', error instanceof Error ? error.message : String(error));
        });
    } catch (error) {
        logger.error('Unexpected error in initial file pull', error instanceof Error ? error.message : String(error));
    }
}
```

**[src/modules/webhook.ts](src/modules/webhook.ts):**
```typescript
private static async checkWebhookHealth(
    webhookUrl: string,
    webhookToken: string,
    webhookPort: number
): Promise<boolean> {
    try {
        const response = await fetch(
            `https://${webhookUrl}:${webhookPort}/webhook/health`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: webhookToken }),
            }
        );

        if (!response.ok || response.body === null) {
            logger.warn('Webhook health check returned non-ok status', {
                url: webhookUrl,
                status: response.status
            });
            return false;
        }
        return true;
    } catch (error) {
        logger.warn('Webhook health check connection failed', {
            url: webhookUrl,
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}
```

**Timeline:** 2 hours

---

## Phase 4: LOW Severity Fixes (Clean-up, 1 hour)

### Task 4.1: Remove fs Dependency

```bash
npm uninstall fs
```

Verify [package.json](package.json) no longer contains `"fs"` in dependencies.

---

### Task 4.2: Add npm audit to CI/CD

**Update [package.json](package.json):**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "watch": "tsc --watch",
    "test": "node dist/index.js",
    "security-audit": "npm audit --audit-level=moderate",
    "security-fix": "npm audit fix"
  }
}
```

**If using GitHub Actions, add to .github/workflows/security.yml:**
```yaml
name: Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '25'
      - run: npm install
      - run: npm run security-audit
```

---

## Testing Checklist

- [ ] All CRITICAL fixes applied and tested
- [ ] Secrets manager integrated and working
- [ ] TLS validation enabled (no NODE_TLS_REJECT_UNAUTHORIZED)
- [ ] Webhook URL validation blocking internal addresses
- [ ] Sensitive data not logged
- [ ] Input validation preventing oversized payloads
- [ ] Rate limiting preventing API overload
- [ ] Request timeouts preventing hangs
- [ ] Error logging consistent across codebase
- [ ] fs dependency removed
- [ ] npm audit passing

---

## Deployment Readiness

Before deploying to production, ensure:

1. [ ] All CRITICAL issues resolved
2. [ ] All HIGH issues resolved
3. [ ] Security tests added to CI/CD
4. [ ] Secrets manager configured
5. [ ] Logs monitoring in place
6. [ ] Incident response plan documented
7. [ ] Security review meeting completed
8. [ ] Compliance requirements verified

---

## Timeline Summary

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: CRITICAL | 2-3 hours | DO FIRST |
| Phase 2: HIGH | 1-2 days | Before deployment |
| Phase 3: MEDIUM | 3-4 days | Week 1 of production |
| Phase 4: LOW | 1 hour | Week 1 of production |

**Total Estimated Time:** 6-9 days

---

## Questions?

For specific implementation questions, refer to:
- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) - Detailed issue descriptions
- [Node.js Security Handbook](https://nodejs.org/en/docs/guides/security/)
- Your organization's security policies
