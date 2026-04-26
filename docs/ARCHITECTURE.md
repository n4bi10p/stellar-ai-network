# Stellar AI Agent Network — Architecture Reference

> **Level 6 — Black Belt** | Last updated: 2026-04-27

## System Overview

The Stellar AI Agent Network is a **serverless, AI-powered autonomous agent infrastructure** deployed on the Stellar blockchain (testnet). It follows a zero-cost free-tier architecture using Vercel (compute + cron), Supabase (PostgreSQL), and Stellar Soroban (smart contracts).

```
┌────────────────────────────────────────────────────────────┐
│                        User Browser                        │
│  Freighter / Albedo / Rabet wallet (transaction signing)   │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼─────────────────────────────────┐
│                  Next.js 16 App (Vercel)                   │
│                                                            │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  App Pages │  │  API Routes  │  │   Cron Handlers   │  │
│  │  (RSC/SSG) │  │  (Edge-ish)  │  │  (Vercel Cron)    │  │
│  └────────────┘  └──────┬───────┘  └─────────┬─────────┘  │
│                         │                    │             │
│  ┌──────────────────────▼────────────────────▼──────────┐  │
│  │              Core Library Layer (lib/)               │  │
│  │  agents/ · analytics/ · cache/ · db/ · logging/     │  │
│  │  middleware/ · monitoring/ · scheduler/ · stellar/   │  │
│  │  store/ · security/ · wallets/                       │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────┬─────────────────────────┬───────────────────────┘
           │                         │
┌──────────▼──────────┐   ┌──────────▼────────────────────┐
│  Supabase / Postgres │   │   Stellar Testnet Soroban RPC │
│  (Prisma ORM)        │   │   horizon.stellar.org         │
│  DailyStats          │   │   Soroban smart contracts     │
│  AgentAuditLog       │   │   (Rust / stellar-sdk v14)    │
│  UserEvent etc.      │   └───────────────────────────────┘
└──────────────────────┘
```

---

## Core Architecture Decisions

### 1. Serverless-First ($0/month)
All compute runs as Vercel Serverless Functions (Node.js runtime). No dedicated servers, no Redis, no external queues. The infrastructure cost is $0 on the free tier for ≤ 30 active users.

### 2. Dual-Layer Storage
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Persistent** | PostgreSQL (Prisma/Supabase) | User events, execution logs, daily stats, audit trail |
| **In-process** | JSON file (local) / Prisma (prod) | Agent configuration and state |

The `getAgentsStoreAdapter()` factory resolves at runtime — local JSON in development, Prisma in production.

### 3. In-Memory Rate Limiter
Uses a module-level `Map<string, {count, resetAt}>` persisted on `globalThis` across Vercel warm instances. No external dependency (Redis-free). See `lib/middleware/rateLimiter.ts`.

### 4. TTL Cache Layer
`lib/cache/cache.ts` implements a simple TTL Map for response caching (60–300s). Reduces DB round-trips on hot read paths (agent list, analytics). Invalidation is prefix-based (`deleteCachedByPrefix`).

---

## Directory Structure

```
stellar-ai-network/
├── app/                        # Next.js App Router
│   ├── (pages)/                # UI pages (agents, dashboard, analytics)
│   └── api/                    # API route handlers
│       ├── agents/             # Agent CRUD + governance endpoints
│       ├── ai/                 # Gemini command parsing
│       ├── analytics/          # Public analytics metrics
│       ├── cron/               # Vercel Cron job handlers
│       ├── health/             # Health check
│       ├── internal/           # Internal/admin endpoints
│       ├── public/             # External public API
│       └── stellar/            # Stellar blockchain operations
│
├── lib/                        # Core business logic
│   ├── agents/                 # Agent lifecycle
│   │   ├── executor.ts         # Execution engine (governance-gated)
│   │   ├── governance.ts       # Spend limits, pause, dry-run enforcement
│   │   ├── audit-log.ts        # Structured audit trail
│   │   ├── templates.ts        # Agent template catalog (6 templates)
│   │   └── strategies/         # Per-strategy decision logic
│   ├── analytics/              # Metrics computation + rollup
│   ├── cache/                  # TTL in-memory cache
│   ├── db/                     # Prisma client singleton
│   ├── logging/                # Structured JSON logger
│   ├── middleware/             # Rate limiter
│   ├── monitoring/             # Error capture + timing wrappers
│   ├── scheduler/              # Durable due-event scheduler
│   ├── security/               # AES-256-GCM key encryption
│   ├── stellar/                # Soroban contract builder + Horizon client
│   ├── store/                  # Agent store adapter (JSON/Prisma)
│   └── wallets/                # Wallet connection helpers
│
├── prisma/
│   ├── schema.prisma           # Database schema (10 models)
│   └── migrations/             # SQL migration history
│
├── contracts/                  # Rust Soroban smart contracts
│   └── stellar_agent/          # Agent contract (execute, transfer)
│
├── tests/
│   ├── unit/                   # 15 test files, 101 tests
│   └── integration/            # Agent creation flow tests
│
└── docs/                       # This documentation
    ├── USER_GUIDE.md
    ├── API.md
    └── ARCHITECTURE.md
```

---

## Database Schema

### Core Models

| Model | Purpose |
|-------|---------|
| `User` | Wallet-based user identity |
| `Agent` | Agent configuration and state (with governance JSONB) |
| `ExecutionLog` | Individual execution attempt records |
| `ExecutionEvent` | Aggregated analytics events by user |
| `UserEvent` | Named event tracking (agent_created, wallet_connected, etc.) |

### Analytics Models

| Model | Purpose |
|-------|---------|
| `DailyStats` | Pre-computed daily rollups: DAU/WAU/MAU, success rate, TX volume |
| `AgentAuditLog` | Governance audit trail: pause/resume/spend-limit-blocks |
| `FeedbackEvent` | User feedback and ratings |
| `TemplateUsage` | Which templates are used most |

### Scheduler Models

| Model | Purpose |
|-------|---------|
| `SchedulerDueWindow` | Serverless-safe durable due-event queue |
| `SchedulerIdempotency` | Prevents duplicate cron executions |

---

## Execution Flow

### Manual Execution
```
User → /agents/create → POST /api/ai/parse (Gemini)
     → POST /api/agents (build Soroban XDR)
     → Wallet signs XDR
     → POST /api/stellar/submit-soroban
     → PATCH /api/agents/{id} (record txHash)
```

### Full-Auto Cron Execution
```
Vercel Cron (every 6h) → GET /api/cron/due-check
  → evaluateAgentDue() per agent
  → SchedulerDueWindow upsert (durable state)

Vercel Cron (+10min) → GET /api/cron/auto-execute
  → loadDueEvents()
  → markIdempotentOnce() (dedup)
  → evaluateGovernanceForExecution() ← GOVERNANCE GATE
  → decryptAgentSecret() → signSorobanXdrWithSecret()
  → submitSorobanTx() → Stellar Soroban RPC
  → addExecutionLog() + writeAuditLog()
```

### Daily Analytics Rollup
```
Vercel Cron (00:20 UTC daily) → GET /api/cron/analytics-rollup
  → upsertDailyStats() per day (last 7 days)
  → DailyStats upsert in Postgres
  → Invalidate analytics cache
```

---

## Governance Enforcement

Every auto-execution passes through a multi-stage governance gate in `executeAgentOnce()`:

```
1. Agent is paused?               → Block, writeAuditLog(spend_limit_blocked)
2. Amount ≤ perExecutionLimit?    → Block if exceeded
3. DailySpend + amount ≤ daily?   → Block if exceeded (queries AgentAuditLog)
4. requiresApproval + not approved? → Block
5. dryRunMode + submit requested? → Allow build, block submit
6. ✅ All pass → proceed to Soroban submission
```

---

## Security Model

### Signing Key Management (Full Auto)
- User's Stellar signing key is encrypted with **AES-256-GCM** before storage
- Encryption key is derived from a server-side `ENCRYPTION_KEY` env var using PBKDF2
- Encrypted blob is stored in browser `localStorage` — never sent to the database
- `decryptAgentSecret()` runs server-side only, never exposes plaintext to the client

### Ownership Verification
All write endpoints verify `owner === agent.owner` before making changes. There is no session/JWT system — the wallet address is the identity.

### Cron Security
All cron routes require a `CRON_SECRET` bearer token (set in Vercel env vars). Vercel automatically injects the token when calling its own cron URLs.

---

## Observability

### Structured Logging
All log output uses `lib/logging/logger.ts` and is emitted as JSON lines to stdout:
```json
{"ts":"2026-04-27T00:20:00.000Z","level":"info","msg":"cron completed","component":"cron/analytics-rollup","processed":7,"durationMs":1200}
```
Vercel Logs captures these and enables filtering/alerting.

### Error Capture
`lib/monitoring/errors.ts` provides `captureError()`, `withErrorCapture()`, and `withCronMonitoring()` HOCs that wrap handlers and emit structured error events.

### Health Endpoint
`GET /api/health` returns a composite status of all subsystems (database, store, scheduler, cache). Monitored externally or via Vercel Cron alerts.

---

## Infrastructure Cost Breakdown

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel (compute + cron) | Hobby | **$0** |
| Supabase (PostgreSQL) | Free | **$0** |
| Stellar Testnet | Public | **$0** |
| Gemini API | Free quota | **$0** |
| **Total** | | **$0** |

Free-tier limits that apply:
- Vercel: 100GB bandwidth, 100k function invocations
- Supabase: 500MB DB, 2GB bandwidth
- Gemini Flash: 1,500 req/day free

---

## Level 6 Feature Completion

| Feature | Status |
|---------|--------|
| Vercel cron schedules (4 jobs) | ✅ |
| In-memory rate limiter | ✅ |
| TTL cache layer | ✅ |
| `/api/health` health check | ✅ |
| DailyStats schema + rollup cron | ✅ |
| `/api/analytics/metrics` public API | ✅ |
| Governance: pause / resume | ✅ |
| Governance: spend limits (per-execution + daily) | ✅ |
| Governance: dry-run mode | ✅ |
| `AgentAuditLog` table + structured logging | ✅ |
| Governance gate in executor | ✅ |
| Structured JSON logger | ✅ |
| Error monitoring wrappers | ✅ |
| `/api/public/agents` external API | ✅ |
| `docs/USER_GUIDE.md` | ✅ |
| `docs/API.md` | ✅ |
| `docs/ARCHITECTURE.md` | ✅ |
| Test suite (101 tests, 16 files) | ✅ |
