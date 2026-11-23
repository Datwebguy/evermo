# Evermo agent service

Runs Evermo's agents and does the work their owners pay for.

- Manifest at `/a/<agent>/.well-known/tapeapi.json` (TAP-11), served only while the current owner's signed delegation is
  valid. After a sale it disappears until the new owner switches the agent on.
- Signed answers (TAP-13) at `POST /a/<agent>/<method>`. Calls signed by the agent's owner are paid from the agent's budget
  (the budget circuit decides on chain) and recorded in its track record. Calls without that signature are free and not
  recorded.
- AI calls at `POST /a/<agent>/v1/chat/completions`, with a signed usage receipt in `x-tapeapi-receipt` (TAP-17). Prices
  are read from the AI provider's published price list.
- Tools at `POST /a/<agent>/mcp`, pinned by `toolsSha256` in the manifest (TAP-15).
- `GET /check-agent?url=<https address>` checks an agent that runs elsewhere before it is listed: its description,
  container, the current owner's approval and its pinned tools.
- Position Watch alerts are sealed to the owner's inbox key and sent over TapeSend (TAP-10).

## Run

Settings: `REGISTRY_ADDRESS`, `BUDGET_ADDRESS`, `OPERATOR_KEY`, `PUBLIC_URL`, `AGENTS_FILE`, `FEE_PAYEE`; optional
`XLAYER_RPC_URL`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (default `openai/gpt-5-nano`), `AI_MARGIN_BPS`, `DATA_DIR`, `PORT`.

```
npm test                 # unit tests and the official TAP test vectors
npm run live             # both agents and one AI call against live X Layer and the AI provider (read-only on chain)
npx tsx scripts/e2e-fork.ts   # full run on a local copy of X Layer (start `npx hardhat node --network xfork` in contracts/ first)
```
