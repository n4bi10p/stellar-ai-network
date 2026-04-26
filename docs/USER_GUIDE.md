# Stellar AI Agent Network — User Guide

> **Level 6 — Black Belt** | Production-ready autonomous agent infrastructure on Stellar

## What is the Stellar AI Agent Network?

The Stellar AI Agent Network lets you deploy **autonomous AI agents** that manage your Stellar wallet automatically. Tell the agent what you want in plain English — it parses your intent, deploys a Soroban smart contract, and executes on-chain transactions automatically according to your rules.

---

## Getting Started

### 1. Connect Your Wallet

Click **Connect Wallet** on the top-right header. Three wallets are supported:

| Wallet | Platform | Notes |
|--------|----------|-------|
| **Freighter** | Browser extension | Recommended |
| **Albedo** | Web-based | No install needed |
| **Rabet** | Browser extension | Alternative |

> All interactions happen on the **Stellar Testnet**. No real XLM is used.

---

### 2. Create an Agent

Navigate to **[/agents/create](/agents/create)** and type your intent in the command box:

```
"Send 10 XLM to GBILL... every week for 4 weeks"
"Alert me when XLM price drops below $0.08 then buy 50 XLM"
"Sweep my wallet balance to savings every day at midnight"
```

The AI parses your command using **Gemini 2.5 Flash** and maps it to an agent strategy. You'll see a preview before deployment.

---

### 3. Choose an Execution Mode

After creating an agent, choose how it runs:

| Mode | Description | Signing |
|------|-------------|---------|
| **Manual** | You approve every transaction | Wallet prompt each time |
| **Assisted Auto** | Agent prepares transactions; you approve batches | Wallet prompt (scheduled) |
| **Full Auto** | Agent executes without interaction | Encrypted key stored on-device |

> **Full Auto** requires you to accept a consent prompt and stores your signing key encrypted in the browser. The key never leaves your device in plaintext.

---

### 4. Agent Strategies

| Strategy | What it does | Template |
|----------|-------------|---------|
| `recurring_payment` | Sends XLM on a fixed schedule | Bill Scheduler |
| `price_alert` | Monitors price and executes at thresholds | Price Alert |
| `auto_rebalance` | Maintains XLM balance at a target level | Auto-Rebalancer |
| `dca_bot` | Dollar-cost averages into XLM | DCA Bot |
| `savings_sweep` | Sweeps excess balance to savings | Savings Sweep |
| `workflow_chain` | Multi-step conditional workflow | Workflow Chain |

---

### 5. Managing Your Agents

From the **Dashboard** (`/dashboard`):

- **View** all your deployed agents and their status
- **Toggle** auto-execution on/off
- **Pause / Resume** agents without deleting them
- **View execution history** — every on-chain action is logged
- **Set spend limits** — protect against runaway automation

---

## Governance & Safety Controls

Every agent has a **Governance** panel accessible via the agent detail page:

### Pause an Agent
```
POST /api/agents/{id}/pause
Body: { "owner": "<wallet-address>", "reason": "Optional reason" }
```
Pauses the agent immediately. No transactions will be executed until resumed.

### Set Spend Limits

| Limit | Description |
|-------|-------------|
| **Per-Execution Limit** | Maximum XLM per single transaction |
| **Daily Spend Limit** | Maximum total XLM per calendar day |

### Dry-Run Mode

Test your agent without submitting any transactions:
```
POST /api/agents/{id}/dry-run
Body: { "owner": "<wallet>", "amountXlm": 10 }
```
Returns a full decision trace showing exactly what the agent would do.

### Audit Log

Every governance action is logged with timestamps — pause, resume, spend limit hits, governance changes. Viewable via:
```
GET /api/agents/{id}/governance
```

---

## Analytics Dashboard

Navigate to **`/analytics`** or **`/dashboard/metrics`** to view:

- **DAU / WAU / MAU** — daily, weekly, monthly active users
- **Execution Success Rate** — percentage of successful on-chain actions
- **TX Volume** — total XLM transacted through the network
- **Agent Activity** — per-strategy breakdown

---

## Reminders & Notifications

Agents support execution reminders via multiple channels:

| Channel | Setup |
|---------|-------|
| **In-app** | Always on |
| **Email** | Add email in agent settings |
| **Telegram** | Add Telegram Chat ID |
| **Discord** | Add Discord webhook URL |

Digest modes: **instant** (notify immediately) or **daily** (summary once/day).

---

## Troubleshooting

### "Agent not found"
The agent may have been deployed on a different wallet. Make sure you're connected with the same wallet address used to create the agent.

### "Simulation failed"
Stellar Soroban simulations fail when the contract logic encounters an error. Common causes:
- Insufficient balance
- Invalid recipient address
- Contract not deployed on testnet

### "Rate limited"
The API rate-limits requests to protect the shared infrastructure. Wait a few seconds and retry.

### Agent is stuck / not executing
1. Check the agent's **Execution History** for failure logs
2. Ensure **Auto-Execute** is enabled on the agent
3. Check that the agent is not **Paused**
4. Verify `nextExecutionAt` is in the past (shown on agent card)

---

## FAQ

**Is this safe to use with real funds?**
No. The system operates on **Stellar Testnet** only. Never use real mainnet keys.

**Can I delete an agent?**
Not yet in the UI — use the API directly: `DELETE /api/agents/{id}` (coming in next release).

**How often do cron jobs run?**
Every 6 hours for due-check and auto-execute, nightly at 00:20 UTC for analytics rollup.

**Where is my data stored?**
Agent data is stored in PostgreSQL (Supabase free tier). Encrypted signing keys for Full Auto mode are stored only in your browser's local storage.
