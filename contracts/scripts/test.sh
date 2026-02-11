#!/bin/bash
set -e

echo "═══════════════════════════════════════"
echo " Running Stellar AI Agent tests"
echo "═══════════════════════════════════════"

cd "$(dirname "$0")/.."

cargo test

echo ""
echo "✅ All contract tests passed!"
