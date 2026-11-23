#!/usr/bin/env bash
# Restarts the local copy of X Layer and sets Evermo up on it from scratch (see service/scripts/dev-fork.ts).
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd); LOG=${LOG:-/tmp/evermo-dev}; mkdir -p "$LOG"
rm -f "$LOG/dev.log"; pkill -f "hardhat node" || true; pkill -f "src/server.ts" || true; pkill -f "dev-fork.ts" || true; sleep 2
(cd "$ROOT/contracts" && nohup npx hardhat node --network xfork > "$LOG/node.log" 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' http://127.0.0.1:8545 && break; sleep 1; done
(cd "$ROOT/service" && nohup npx tsx scripts/dev-fork.ts > "$LOG/dev.log" 2>&1 &)
for i in $(seq 1 120); do grep -q "Ready" "$LOG/dev.log" 2>/dev/null && break; grep -q "Error" "$LOG/dev.log" 2>/dev/null && { tail -20 "$LOG/dev.log"; exit 1; }; sleep 3; done
tail -1 "$LOG/dev.log"
