# Fee Sponsorship (Gasless Transactions) - Level 6 Advanced Feature

## Overview

**Fee Sponsorship** is an advanced Level 6 feature that enables **gasless transactions** for AI agents on Stellar. Using Stellar's fee-bump transactions, a designated sponsor account can cover transaction fees while users retain complete operational control.

### Key Benefits

✅ **Zero Gas Costs for Users** - Agents execute without burning user XLM on fees  
✅ **Improved UX** - Frictionless automation without fee concerns  
✅ **Sponsor Control** - Configurable spending limits per agent and per month  
✅ **Full Audit Trail** - Complete tracking of all sponsored transactions  
✅ **Fallback Support** - Graceful degradation if sponsorship unavailable  

---

## Architecture

### How It Works

```
User's Agent (Owner)          Sponsor Account (Fee Payer)
        │                              │
        │ 1. Build Transaction         │
        ├─────────────────────────────>│
        │                              │
        │ 2. Create Fee-Bump           │
        │    (Sponsor covers fees)     │
        │<─────────────────────────────┤
        │                              │
        │ 3. Submit to Network         │
        │    (User signs operation,    │
        │     Sponsor signs fees)      │
        └─────────────────────────────>│
                Stellar Network
                    │
                    ▼
            Transaction Confirmed
                    │
        4. Record & Track Sponsorship
```

### Stellar Fee-Bump Transactions

A fee-bump transaction is a special envelope that wraps a regular transaction and allows a different account (the sponsor) to pay the fees:

```
Fee-Bump Envelope:
├── Sponsor Account (who pays fees)
├── Fee Amount (covers operations + fee-bump overhead)
└── Inner Transaction (original operations)
    ├── User Account (who controls operations)
    └── Operations (payments, contract calls, etc.)
```

**Result**: User maintains full control of operations; sponsor only pays fees.

---

## Implementation Architecture

### Database Schema

```prisma
// Sponsor Account Management
model SponsorAccount {
  id                  String   @id
  address             String   @unique
  secretKeyEncrypted  String   // AES-256-GCM encrypted
  totalSpent          Float    // Cumulative XLM
  monthlyBudget       Float    // Max per month
  monthlySpent        Float    // Current month usage
  active              Boolean
}

// Per-Agent Sponsorship Config
model AgentSponsorship {
  id                  String   @id
  agentId             String   @unique
  sponsorId           String   // FK to SponsorAccount
  enabled             Boolean
  maxPerTransaction   Float    // Per-execution limit
  transactionCount    Int
  totalSponsored      Float
}

// Audit Trail
model SponsoredTransaction {
  txHash              String   @unique
  agentId             String
  sponsorId           String
  status              String   // pending|success|failed
  feePaid             Float    // Actual fees in XLM
  metadata            Json
}
```

### Core Modules

#### 1. **Fee Sponsorship Module** (`lib/stellar/fee-sponsorship.ts`)

```typescript
// Create fee-bump transaction
const feeBumpResult = await createFeeBumpTransaction(
  originalXdr,
  sponsorAddress,
  sponsorSecretKey
);

// Validate sponsor balance
const balance = await validateSponsorBalance(
  sponsorAddress,
  requiredFeeStroops,
  rpc
);

// Submit fee-bump transaction
const result = await submitFeeBumpTransaction(
  feeBumpXdr,
  rpc
);
```

#### 2. **Contract Builder** (`lib/stellar/contracts.ts`)

Automatically applies fee-bump when sponsorship is configured:

```typescript
export async function buildContractCall(
  contractId: string,
  method: string,
  args: ScVal[],
  sourceAddress: string,
  sponsorshipConfig?: SponsorshipConfig // NEW: Optional sponsorship
): Promise<string>
```

#### 3. **Agent Executor** (`lib/agents/executor.ts`)

Integrates sponsorship into execution pipeline:

```typescript
// 1. Check if agent has active sponsorship
const sponsorshipConfig = await getAgentSponsorshipConfig(agentId);

// 2. Get sponsor's secret key (encrypted in DB)
const sponsor = await getSponsorAccountWithSecret(sponsorId);

// 3. Pass to transaction builder
const xdr = await buildExecute(
  contractId,
  recipient,
  amount,
  sourceAddress,
  { ...sponsorshipConfig, sponsorSecretKey: sponsor.secretKey }
);

// 4. Record sponsorship after execution
await recordSponsoredTransaction({
  txHash,
  agentId,
  sponsorId,
  feePaid,
  metadata
});
```

---

## API Endpoints

### 1. Create Sponsor Account

```bash
POST /api/sponsorship/accounts
```

**Body:**
```json
{
  "address": "GXXXXXX...",
  "name": "Platform Sponsor",
  "secretKey": "SXXXXXX...",
  "monthlyBudget": 100
}
```

**Response:**
```json
{
  "id": "sponsor-123",
  "address": "GXXXXXX...",
  "name": "Platform Sponsor",
  "monthlyBudget": 100,
  "active": true,
  "createdAt": "2026-04-30T00:00:00Z"
}
```

### 2. List Active Sponsors

```bash
GET /api/sponsorship/accounts
```

**Response:**
```json
{
  "sponsors": [
    {
      "id": "sponsor-123",
      "address": "GXXXXXX...",
      "name": "Platform Sponsor",
      "totalSpent": 25.5,
      "monthlyBudget": 100,
      "monthlySpent": 12.3,
      "supportedAgents": 15,
      "createdAt": "2026-04-30T00:00:00Z"
    }
  ]
}
```

### 3. Enable Sponsorship for Agent

```bash
POST /api/sponsorship/agents/{agentId}/enable
```

**Body:**
```json
{
  "sponsorId": "sponsor-123",
  "maxPerTransaction": 10
}
```

**Response:**
```json
{
  "success": true,
  "sponsorship": {
    "agentId": "agent-456",
    "sponsorId": "sponsor-123",
    "enabled": true,
    "maxPerTransaction": 10
  }
}
```

### 4. Disable Sponsorship for Agent

```bash
POST /api/sponsorship/agents/{agentId}/disable
```

**Response:**
```json
{
  "success": true,
  "sponsorship": {
    "agentId": "agent-456",
    "enabled": false
  }
}
```

### 5. Get Sponsorship Config

```bash
GET /api/sponsorship/agents/{agentId}/config?auditLimit=10
```

**Response:**
```json
{
  "config": {
    "enabled": true,
    "sponsorAddress": "GXXXXXX...",
    "maxSpendPerTransaction": 10,
    "maxMonthlySpend": 100,
    "monthlySpendUsed": 12.3,
    "lastResetAt": "2026-04-01T00:00:00Z"
  },
  "recentTransactions": [
    {
      "txHash": "1a2b3c4d...",
      "status": "success",
      "feePaid": 0.001,
      "baseFee": 0.0001,
      "createdAt": "2026-04-30T12:34:56Z",
      "confirmedAt": "2026-04-30T12:35:00Z",
      "sponsor": {
        "id": "sponsor-123",
        "address": "GXXXXXX...",
        "name": "Platform Sponsor"
      }
    }
  ]
}
```

### 6. Get Sponsor Statistics

```bash
GET /api/sponsorship/accounts/{sponsorId}/stats
```

**Response:**
```json
{
  "stats": {
    "id": "sponsor-123",
    "address": "GXXXXXX...",
    "name": "Platform Sponsor",
    "active": true,
    "totalSpent": 245.67,
    "monthlyBudget": 1000,
    "monthlySpent": 123.45,
    "successfulThisMonth": 450.23,
    "remainingMonthlyBudget": 876.55,
    "supportedAgents": 25,
    "totalTransactions": 1234,
    "percentageUsed": 12.35
  }
}
```

---

## Security Considerations

### 1. Secret Key Encryption

Sponsor secret keys are encrypted with **AES-256-GCM** before storage:

```typescript
// Storage
const encryptedKey = encryptData(sponsorSecretKey);
await db.sponsorAccount.create({
  secretKeyEncrypted: encryptedKey
});

// Retrieval (server-side only)
const decryptedKey = decryptData(sponsor.secretKeyEncrypted);
```

**Never expose secrets in API responses or logs.**

### 2. Spending Limits

Three levels of spending control:

```typescript
// Per-transaction limit
if (feePaid > maxPerTransaction) {
  throw new Error("Exceeds per-transaction limit");
}

// Monthly budget
if (monthlySpent + feePaid > monthlyBudget) {
  throw new Error("Monthly budget exceeded");
}

// Per-agent limit
const agentSpending = sponsorship.totalSponsored;
```

### 3. Audit Trail

Every sponsored transaction is logged:

```typescript
{
  txHash: "...",
  agentId: "...",
  sponsorId: "...",
  status: "success",
  feePaid: 0.001,
  baseFee: 0.0001,
  metadata: {
    executionMode: "auto",
    agentStrategy: "workflow_chain",
    recipient: "GXXXXXX..."
  },
  createdAt: "2026-04-30T12:34:56Z",
  confirmedAt: "2026-04-30T12:35:00Z"
}
```

### 4. Graceful Degradation

If sponsorship fails, transactions still execute without fees:

```typescript
try {
  const sponsoredXdr = await buildSponsoredTransaction(
    buildFn,
    sponsorConfig,
    secretKey,
    rpc
  );
  return sponsoredXdr; // Fee-bump applied
} catch (error) {
  console.warn("Sponsorship failed, using regular transaction");
  return await buildFn(); // Falls back to regular tx
}
```

---

## Usage Examples

### Example 1: Enable Sponsorship for an Agent

```javascript
// 1. Create a sponsor account (admin only)
const sponsorResponse = await fetch('/api/sponsorship/accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: 'GXXXXXX...',
    name: 'Production Sponsor',
    secretKey: 'SXXXXXX...',
    monthlyBudget: 500
  })
});
const sponsor = await sponsorResponse.json();

// 2. Enable for agent
const enableResponse = await fetch(
  `/api/sponsorship/agents/agent-456/enable`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sponsorId: sponsor.id,
      maxPerTransaction: 20
    })
  }
);
```

### Example 2: Check Sponsor Statistics

```javascript
// Get sponsor stats
const statsResponse = await fetch(
  '/api/sponsorship/accounts/sponsor-123/stats'
);
const stats = await statsResponse.json();

console.log(`
  Sponsor: ${stats.stats.name}
  Total Spent: ${stats.stats.totalSpent} XLM
  This Month: ${stats.stats.monthlySpent} / ${stats.stats.monthlyBudget} XLM
  Remaining: ${stats.stats.remainingMonthlyBudget} XLM
  Supported Agents: ${stats.stats.supportedAgents}
  Success Rate: ${(100 - stats.stats.percentageUsed).toFixed(1)}%
`);
```

### Example 3: View Sponsorship Audit Trail

```javascript
// Get recent sponsored transactions for an agent
const auditResponse = await fetch(
  '/api/sponsorship/agents/agent-456/config?auditLimit=50'
);
const auditData = await auditResponse.json();

auditData.recentTransactions.forEach(tx => {
  console.log(`
    TX: ${tx.txHash}
    Status: ${tx.status}
    Fee Paid: ${tx.feePaid} XLM
    Sponsor: ${tx.sponsor.name}
    Time: ${new Date(tx.createdAt).toLocaleString()}
  `);
});
```

---

## Monitoring & Observability

### Metrics to Track

1. **Sponsorship Adoption**
   - % of agents using sponsorship
   - Total users benefiting

2. **Cost Efficiency**
   - XLM spent on sponsorship
   - Average fee per transaction
   - Monthly budget utilization

3. **Success Rates**
   - Sponsored transaction success rate
   - Failed sponsorship fallbacks
   - Sponsor balance alerts

### Logging

All sponsorship operations are logged:

```json
{
  "level": "info",
  "event": "sponsorship_applied",
  "agentId": "agent-456",
  "txHash": "1a2b3c4d...",
  "feePaid": 0.001,
  "sponsorAddress": "GXXXXXX...",
  "timestamp": "2026-04-30T12:34:56Z"
}
```

---

## Future Enhancements

1. **Multi-Sponsor Pools** - Load balance across multiple sponsors
2. **Dynamic Fee Pricing** - Adjust max fees based on network conditions
3. **Sponsor Reputation** - Track successful vs failed sponsorships
4. **Automated Sponsor Funds Management** - Auto-refill from treasury
5. **Per-User Sponsorship Caps** - Prevent single user abuse

---

## Testing

Run the test suite:

```bash
npm test tests/unit/fee-sponsorship.test.ts
```

Key test areas:
- Fee-bump transaction creation
- Sponsor balance validation
- Spending limit enforcement
- Transaction fee calculation
- Audit trail recording
- Fallback behavior

---

## Deployment Checklist

- [ ] Create sponsor account with adequate XLM balance
- [ ] Encrypt and store sponsor secret key
- [ ] Set monthly budget limits
- [ ] Enable sponsorship for test agents
- [ ] Monitor first week of sponsored transactions
- [ ] Set up alerts for low sponsor balance
- [ ] Document sponsor account recovery procedures
- [ ] Train ops team on sponsorship management

---

## Support & Troubleshooting

### Sponsorship Not Applied

Check:
1. Sponsorship is enabled: `config.enabled === true`
2. Monthly budget available: `monthlySpent < monthlyBudget`
3. Sponsor has XLM balance: `> 10 XLM + base reserve`
4. Max per-transaction not exceeded

### Sponsor Running Low on Funds

```javascript
const stats = await fetch(
  '/api/sponsorship/accounts/sponsor-123/stats'
).then(r => r.json());

if (stats.stats.remainingMonthlyBudget < 50) {
  // Alert ops to refill
  console.warn('Sponsor budget critically low');
}
```

### Audit Trail Investigation

```javascript
// Find all sponsored transactions for an agent in last 7 days
const audits = await fetch(
  '/api/sponsorship/agents/agent-456/config?auditLimit=100'
).then(r => r.json());

const last7Days = audits.recentTransactions.filter(tx => {
  const txDate = new Date(tx.createdAt);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return txDate > sevenDaysAgo;
});
```

---

## References

- [Stellar Fee-Bump Transactions](https://developers.stellar.org/docs/learn/transactions/fees)
- [Soroban Contract Invocations](https://developers.stellar.org/docs/build/smart-contracts)
- [AES-256-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
