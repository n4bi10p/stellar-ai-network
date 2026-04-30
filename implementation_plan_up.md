# Add Swap and Liquidity Aggregator Functionalities

This plan outlines the addition of "Swap" and "Liquidity Aggregator" agent strategies to the Stellar AI Network. It also includes finalization steps for minor bugs identified in previous sessions (orchestrator delay and governance null types).

## Background Context
The platform currently supports strategies like `recurring_payment`, `dca_bot`, `price_alert`, etc. The user requested adding "swap" and "liquidity aggregator" functionalities. In the Stellar ecosystem, liquidity aggregation is natively supported via Path Payments, and Soroban has AMM contracts (e.g. Soroswap). We will add a new strategy type that allows an agent to execute token swaps on-chain using these primitives.

## User Review Required
> [!IMPORTANT]
> **Liquidity Source Decision**
> Stellar supports swaps via two main avenues:
> 1. **Native Path Payments:** Stellar Core's built-in orderbook natively aggregates liquidity. It's cheap, fast, and doesn't require smart contracts.
> 2. **Soroban AMMs (Soroswap/Phoenix):** Requires interacting with specific smart contracts.
> 
> *I propose we start with Native Stellar Path Payments (`PathPaymentStrictSend`) as it acts as a native liquidity aggregator across all Stellar orderbooks. Does this align with your vision, or do you specifically want Soroban AMM contract integration?*

## Open Questions
> [!WARNING]
> 1. **Swap Trigger:** Should the swap agent execute immediately (manual trigger), on a cron schedule, or based on a price condition (like a limit order)?
> 2. **Supported Tokens:** Do you have specific Stellar tokens (e.g. USDC, native XLM) you want to hardcode for the UI, or should users be able to input any Asset Issuer string?

## Proposed Changes

### Orchestrator & Governance Fixes (Carryover)

#### [MODIFY] `lib/agents/workflow-orchestrator.ts`
- Implement `await new Promise(...)` for the `delaySeconds` property so the orchestrator actually waits between steps instead of just logging the intent.

#### [MODIFY] `lib/agents/governance.ts`
- Update `normalizeGovernance` to properly handle `null` vs `number` typing to ensure TypeScript strictness when dealing with `AgentGovernance`.

---

### New Swap & Liquidity Aggregator Strategy

#### [NEW] `lib/agents/strategies/swap.ts`
- Implement a new `StrategyContext` handler for the swap logic.
- The strategy will construct a `PathPaymentStrictSend` or call a swap smart contract (depending on the answer to the open question).
- Will require configuring `tokenIn`, `tokenOut`, `amountIn`, and `slippageBps`.

#### [MODIFY] `lib/agents/strategies/index.ts`
- Export the new `swap` strategy and register it in the strategy resolver.

#### [MODIFY] `lib/agents/executor.ts`
- Update `executeAgentOnce` and contract builders to handle the specialized transaction format required for swaps (either a native Stellar SDK operation or a Soroswap contract call).

#### [MODIFY] `app/agents/create/page.tsx`
- Add UI configuration fields for the new "Swap" and "Liquidity Aggregator" options.
- Inputs for selecting the source token, destination token, amount, and slippage tolerance.

## Verification Plan

### Automated Tests
- Write unit tests in `tests/unit/strategies/swap.test.ts` to mock the liquidity route fetching and verify correct transaction building.
- Run `npm test` to ensure no existing workflows break.

### Manual Verification
- Create a test Swap agent in the UI.
- Execute the agent on Testnet and verify the transaction explores the correct liquidity path and settles successfully on Stellar Expert.
