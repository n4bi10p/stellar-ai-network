#!/bin/bash
set -e

echo "═══════════════════════════════════════"
echo " Building Stellar AI Agent contract..."
echo "═══════════════════════════════════════"

cd "$(dirname "$0")/.."

# Build the contract
stellar contract build

echo ""
echo "✅ Contract built successfully!"
echo "   WASM: target/wasm32-unknown-unknown/release/stellar_ai_agent.wasm"
