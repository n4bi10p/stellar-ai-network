#!/bin/bash
set -e

echo "═══════════════════════════════════════"
echo " Deploying Stellar AI Agent to testnet"
echo "═══════════════════════════════════════"

cd "$(dirname "$0")/.."

# Build first
stellar contract build

# Deploy to testnet using the default identity
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_ai_agent.wasm \
  --source default \
  --network testnet)

echo ""
echo "✅ Contract deployed!"
echo "   Contract ID: $CONTRACT_ID"
echo ""
echo "Add this to your .env.local:"
echo "NEXT_PUBLIC_AGENT_CONTRACT_ID=$CONTRACT_ID"
