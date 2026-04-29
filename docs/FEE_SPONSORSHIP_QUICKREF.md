# Fee Sponsorship Quick Reference

## For Developers

### Basic Flow

```typescript
import { buildExecute } from "@/lib/stellar/contracts";
import { getAgentSponsorshipConfig } from "@/lib/store/sponsorship";

// 1. Check if agent has sponsorship enabled
const sponsorConfig = await getAgentSponsorshipConfig(agentId);

// 2. Build transaction with optional sponsorship
const xdr = await buildExecute(
  contractId,
  recipient,
  amount,
  sourceAddress,
  sponsorConfig ? {
    ...sponsorConfig,
    sponsorSecretKey: decryptedKey
  } : undefined
);

// 3. Submit as normal - fee-bump applied automatically if sponsored
const result = await submitSorobanTx(xdr);
```

### Enable Sponsorship for an Agent

```bash
curl -X POST http://localhost:3000/api/sponsorship/agents/agent-123/enable \
  -H "Content-Type: application/json" \
  -d '{
    "sponsorId": "sponsor-123",
    "maxPerTransaction": 10
  }'
```

### Create Sponsor Account

```bash
curl -X POST http://localhost:3000/api/sponsorship/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "address": "GXXXXXX...",
    "name": "Platform Sponsor",
    "secretKey": "SXXXXXX...",
    "monthlyBudget": 1000
  }'
```

### Check Sponsorship Status

```bash
curl http://localhost:3000/api/sponsorship/agents/agent-123/config
```

## For Operations

### Monitor Sponsor Balance

```bash
curl http://localhost:3000/api/sponsorship/accounts/sponsor-123/stats | jq '.stats'
```

**Check:**
- `remainingMonthlyBudget` - Budget left this month
- `percentageUsed` - Budget utilization %
- `totalTransactions` - Total sponsored TXs

### View Audit Trail

```bash
curl "http://localhost:3000/api/sponsorship/agents/agent-123/config?auditLimit=50" | jq '.recentTransactions'
```

### Disable Sponsorship

```bash
curl -X POST http://localhost:3000/api/sponsorship/agents/agent-123/disable
```

## Database Queries

### List All Active Sponsors

```sql
SELECT id, address, name, monthly_budget, monthly_spent, active 
FROM "SponsorAccount" 
WHERE active = true
ORDER BY created_at DESC;
```

### Find Agents Using a Sponsor

```sql
SELECT a.id, a.name, a.strategy, s.enabled, s.max_per_transaction
FROM "Agent" a
JOIN "AgentSponsorship" s ON a.id = s."agentId"
WHERE s."sponsorId" = 'sponsor-123'
AND s.enabled = true;
```

### Sponsored Transactions in Last 7 Days

```sql
SELECT 
  tx_hash, agent_id, status, fee_paid,
  created_at, confirmed_at
FROM "SponsoredTransaction"
WHERE created_at > NOW() - INTERVAL '7 days'
AND status = 'success'
ORDER BY created_at DESC;
```

### Sponsor Spending by Agent

```sql
SELECT 
  s."agentId",
  a.name,
  COUNT(*) as tx_count,
  SUM(st.fee_paid) as total_fees
FROM "SponsoredTransaction" st
JOIN "AgentSponsorship" s ON st."agentId" = s."agentId"
JOIN "Agent" a ON s."agentId" = a.id
WHERE st."sponsorId" = 'sponsor-123'
GROUP BY s."agentId", a.name
ORDER BY total_fees DESC;
```

## Feature Flags

Add to `.env.local`:

```env
# Enable/disable sponsorship globally
NEXT_PUBLIC_SPONSORSHIP_ENABLED=true

# Default monthly budget for new sponsors (XLM)
SPONSORSHIP_DEFAULT_BUDGET=100

# Max fee per transaction (XLM)
SPONSORSHIP_MAX_PER_TX=50
```

## Security Checklist

- [ ] Sponsor secret key is encrypted with AES-256-GCM
- [ ] Never log or return sponsor secret key in API responses
- [ ] Spending limits enforced before creating fee-bump
- [ ] Monthly budgets reset automatically
- [ ] Audit trail logs all sponsorship actions
- [ ] Alerts set up for low sponsor balances
- [ ] Rate limiting applied to sponsorship endpoints
- [ ] Regular security audit of sponsor account

## Troubleshooting

### "Insufficient balance"

Sponsor account needs more XLM. Minimum: 50 + fees.

**Fix:**
```bash
stellar-cli send SPONSOR_ADDRESS 100
```

### "Monthly budget exceeded"

Current month's spending at limit.

**Check:**
```bash
curl /api/sponsorship/accounts/SPONSOR_ID/stats | jq '.stats.monthlySpent'
```

**Options:**
- Wait for month reset (automatic)
- Increase monthly budget in DB
- Add additional sponsor

### Sponsorship not applying

Fee-bump creation failed, falling back to regular transaction.

**Debug:** Check logs for fee-sponsorship module errors.

**Check:**
1. Sponsor balance sufficient
2. Sponsorship enabled for agent
3. Monthly budget available
4. Per-transaction limit not exceeded

## Performance Impact

- **Database**: Minimal - 2 queries (sponsorship config + sponsor account)
- **Computation**: <10ms - fee-bump creation
- **Network**: No additional RPC calls (uses existing sim)
- **Overall**: <100ms added per sponsored transaction

## Costs

Using platform sponsor:
- **User Cost**: FREE (sponsor covers fees)
- **Sponsor Cost**: ~0.001 XLM per transaction
- **Platform ROI**: Reduced churn, increased adoption

---

**Last Updated**: 2026-04-30  
**Version**: 1.0  
**Status**: Production Ready
