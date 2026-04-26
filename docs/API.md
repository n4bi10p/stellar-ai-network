# Stellar AI Agent Network — API Reference

> **Base URL:** `https://stellar-ai-network.vercel.app`  
> **Protocol:** HTTPS · JSON request/response bodies  
> **Auth:** Wallet-address ownership (most write endpoints require `owner` in body)

---

## Public API

No authentication required. Rate-limited at **30 requests/minute per IP**.

### `GET /api/public/agents`

List all available agent templates.

**Response**
```json
{
  "templates": [
    {
      "id": "bill_scheduler",
      "name": "Bill Scheduler",
      "description": "Automate recurring payments on a fixed schedule",
      "strategy": "recurring_payment",
      "icon": "📅",
      "defaultConfig": {
        "intervalSeconds": 604800,
        "maxExecutions": 4
      }
    }
  ],
  "count": 6,
  "generatedAt": "2026-04-27T00:00:00.000Z",
  "version": "1.0",
  "docs": "https://stellar-ai-network.vercel.app/docs"
}
```

---

## Agent Management

### `GET /api/agents`

List all agents for a wallet address.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `owner` | `string` | Wallet address (required) |

**Response**
```json
{
  "agents": [
    {
      "id": "uuid-...",
      "contractId": "C...",
      "owner": "G...",
      "name": "BILL_PAY_01",
      "strategy": "recurring_payment",
      "templateId": "bill_scheduler",
      "createdAt": "2026-04-01T00:00:00.000Z",
      "txHash": "abc123...",
      "autoExecuteEnabled": true,
      "executionMode": "full_auto",
      "executionCount": 4,
      "lastExecutionAt": "2026-04-26T00:00:00.000Z",
      "nextExecutionAt": "2026-05-03T00:00:00.000Z",
      "governance": {
        "paused": false,
        "perExecutionLimitXlm": 20,
        "dailySpendLimitXlm": 100,
        "dryRunMode": false
      }
    }
  ]
}
```

---

### `POST /api/agents`

Deploy a new agent (build Soroban contract + store agent record).

**Request Body**
```json
{
  "owner": "G...",
  "name": "BILL_PAY_01",
  "strategy": "recurring_payment",
  "templateId": "bill_scheduler",
  "strategyConfig": {
    "recipient": "G...",
    "amount": 10,
    "intervalSeconds": 604800,
    "maxExecutions": 4
  }
}
```

**Response**
```json
{
  "success": true,
  "agentId": "uuid-...",
  "contractId": "C...",
  "xdr": "AAAAAgAAAAD..."
}
```

> The returned `xdr` must be signed by the user's wallet and submitted via `/api/stellar/submit-soroban`.

---

### `GET /api/agents/{id}`

Fetch a single agent by ID.

---

### `PATCH /api/agents/{id}`

Update agent metadata after a successful deployment or execution.

**Request Body**
```json
{
  "txHash": "abc123...",
  "recordExecution": true,
  "nextExecutionAt": "2026-05-03T00:00:00.000Z",
  "owner": "G..."
}
```

---

## Agent Governance

### `POST /api/agents/{id}/pause`

Emergency-pause an agent. Blocks all further auto-executions.

**Request Body**
```json
{
  "owner": "G...",
  "reason": "Suspicious activity detected"
}
```

**Response**
```json
{
  "success": true,
  "message": "Agent paused. No further executions will run until resumed."
}
```

---

### `POST /api/agents/{id}/resume`

Resume a paused agent.

**Request Body**
```json
{ "owner": "G..." }
```

---

### `GET /api/agents/{id}/governance`

Fetch current governance configuration and recent audit log.

**Response**
```json
{
  "governance": {
    "paused": false,
    "pauseReason": null,
    "perExecutionLimitXlm": 20,
    "dailySpendLimitXlm": 100,
    "dryRunMode": false,
    "requiresApproval": false
  },
  "auditLog": [
    {
      "id": "...",
      "agentId": "...",
      "owner": "G...",
      "action": "governance_updated",
      "details": { "changes": { "perExecutionLimitXlm": 20 } },
      "createdAt": "2026-04-27T00:00:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/agents/{id}/governance`

Update governance settings.

**Request Body**
```json
{
  "owner": "G...",
  "perExecutionLimitXlm": 50,
  "dailySpendLimitXlm": 200,
  "dryRunMode": false,
  "requiresApproval": false
}
```
All fields except `owner` are optional.

---

### `POST /api/agents/{id}/dry-run`

Simulate an execution without submitting any transaction.

**Request Body**
```json
{
  "owner": "G...",
  "amountXlm": 10,
  "recipient": "G..."
}
```

**Response**
```json
{
  "dryRun": true,
  "wouldExecute": true,
  "blockedReason": null,
  "governance": {
    "paused": false,
    "perExecutionLimitXlm": 50,
    "dailySpendLimitXlm": 200,
    "dryRunMode": false,
    "requiresApproval": false
  },
  "todaySpentXlm": 0,
  "simulatedAction": {
    "agentId": "...",
    "amountXlm": 10,
    "recipient": "G...",
    "strategy": "recurring_payment"
  }
}
```

---

## AI Command Parsing

### `POST /api/ai/parse`

Parse a natural language command into a structured agent action.

**Rate limit:** 20 req/min per IP.

**Request Body**
```json
{
  "command": "Send 10 XLM to GDEST every week for 4 weeks",
  "walletAddress": "G..."
}
```

**Response**
```json
{
  "action": "create_agent",
  "strategy": "recurring_payment",
  "templateId": "bill_scheduler",
  "config": {
    "recipient": "GDEST...",
    "amount": 10,
    "intervalSeconds": 604800,
    "maxExecutions": 4
  },
  "confidence": 0.95,
  "rawIntent": "Send 10 XLM to GDEST every week for 4 weeks"
}
```

---

## Stellar Operations

### `POST /api/stellar/send`

Build an unsigned XLM transfer transaction.

**Request Body**
```json
{
  "sourceAddress": "G...",
  "destinationAddress": "G...",
  "amount": "10"
}
```

**Response**
```json
{
  "xdr": "AAAAAgAAAAD...",
  "fee": "100"
}
```

---

### `POST /api/stellar/submit`

Submit a signed XDR transaction to Stellar network.

**Request Body**
```json
{ "signedXDR": "AAAAAgAAAAD..." }
```

**Response**
```json
{
  "hash": "abc123...",
  "ledger": 12345,
  "status": "SUCCESS"
}
```

---

### `POST /api/stellar/submit-soroban`

Submit a signed Soroban contract transaction.

Same request/response shape as `/api/stellar/submit`.

---

### `GET /api/stellar/balance`

Fetch XLM balance for a wallet address.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `address` | `string` | Stellar wallet address |

**Response**
```json
{
  "address": "G...",
  "balance": "1250.4500000",
  "xlm": 1250.45
}
```

---

## Analytics

### `GET /api/analytics/metrics`

Fetch platform analytics — DailyStats series + live summary.

**Rate limit:** 60 req/min. **Cache:** 60s.

**Query Parameters**

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `period` | `7d`, `30d`, `90d` | `7d` | Historical window |
| `owner` | wallet address | — | Filter to specific owner |

**Response**
```json
{
  "period": "7d",
  "owner": null,
  "summary": {
    "avgDAU": 12,
    "peakDAU": 18,
    "latestWAU": 35,
    "latestMAU": 89,
    "totalExecutions": 420,
    "successfulExecutions": 398,
    "failedExecutions": 22,
    "successRate": 94.76,
    "totalTxVolume": 8420.5
  },
  "series": [
    {
      "date": "2026-04-21",
      "dau": 12,
      "wau": 35,
      "mau": 89,
      "executions": 65,
      "successRate": 96.9,
      "txVolume": 1250.5,
      "newUsers": 3,
      "totalAgents": 24,
      "runningAgents": 18,
      "retention7d": 0.82
    }
  ],
  "generatedAt": "2026-04-27T00:00:00.000Z"
}
```

---

## Health & Infrastructure

### `GET /api/health`

System health check — database, agent store, scheduler, and cache.

**Response**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-27T00:00:00.000Z",
  "checks": {
    "database": { "status": "ok", "detail": "Database reachable" },
    "store": { "status": "ok", "detail": "Agent store reachable via prisma" },
    "scheduler": { "status": "ok", "detail": "Scheduler backend resolved to postgres" },
    "cache": { "status": "ok", "detail": "Memory cache ready (12 active entries)" }
  }
}
```

**Status codes**
- `200` — healthy or degraded
- `503` — unhealthy (one or more critical checks failed)

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

**Common status codes**

| Code | Meaning |
|------|---------|
| `400` | Missing or invalid request parameters |
| `401` | Unauthorized (invalid or missing cron secret) |
| `403` | Forbidden (wallet address mismatch) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service unavailable (health check failure) |

---

## Rate Limits Summary

| Endpoint | Limit |
|----------|-------|
| `POST /api/ai/parse` | 20 req/min |
| `POST /api/agents` | 30 req/min |
| `POST /api/stellar/send` | 20 req/min |
| `POST /api/stellar/submit*` | 20 req/min |
| `GET /api/public/agents` | 30 req/min |
| `GET /api/analytics/metrics` | 60 req/min |
| All other routes | Unrestricted |

Rate limit headers are returned on all rate-limited endpoints:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1714175000000
Retry-After: 45
```
