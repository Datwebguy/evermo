# Deployments

Written by `contracts/scripts/deploy.ts` (and read by `service/scripts/launch.ts` and `contracts/scripts/site.ts`).

| File | What it holds |
|------|---------------|
| `<name>.json` | Every step of the deployment as soon as it is confirmed: circuit ids, contract addresses, agent identities |
| `<name>.app.json` | What the app reads (copied to `app/public/deployment.json` before building) |
| `<name>.agents.json` | The service's `AGENTS_FILE` |

`rehearsal.*` files come from a full run on a local copy of X Layer and are kept as a record of that rehearsal.

## Order

1. `contracts/scripts/deploy.ts`: circuits, contracts, agent identities, Evermo's identity (needed for the site and alerts).
2. Start the service with the addresses from `<name>.app.json`.
3. `service/scripts/launch.ts`: switch the agents on, optionally list them for their first sale.
4. Build the app with `<name>.app.json`, then `contracts/scripts/site.ts` to publish it in Evermo's container.

## Cost measured in the rehearsal (TapeOut prices and gas read from X Layer)

| Part | OKB |
|------|-----|
| Budget and resale circuits | 0.0039 |
| Each agent identity (tape-out 0.0013 + mint 0.00066 + container 0.08) | 0.0820 |
| Evermo's identity, which owns the site and sends alerts | 0.0820 |
| Contracts and setup, 20 transactions, about 6 million gas at 0.02 gwei | 0.0001 |
| Site: 617 KB in 32 transactions, about 143 million gas at 0.02 gwei; name fee 0 today | 0.0029 |
| Gas for the operator (recording work, alerts, site upload) | 0.006 |
| **Two agents, total** | **≈ 0.259**, anything unused goes back to the owner |
