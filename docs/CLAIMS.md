# Evermo — claims and evidence

Every claim made in the README, the post and the submission form, with the evidence that backs it.
Status: **planned** (not built), **built** (evidence in repo), **live** (evidence on X Layer).
Nothing may be marked built or live without evidence.

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each agent is a TapeOut circuit NFT on X Layer with its own container | planned | — |
| 2 | Whoever holds the agent's circuit NFT owns the agent | planned | — |
| 3 | An agent's budget can only pay when the budget circuit allows it; the budget contract calls `eval` on chain | planned | `eval` from a transaction verified on X Layer (~48,000 gas): `docs/VERIFICATION.md` |
| 4 | Agent tool descriptions are pinned on chain (TAP-15) and a change is detected and refused | planned | — |
| 5 | Every agent answer is signed (TAP-13) | planned | — |
| 6 | Every AI charge has a signed usage receipt (reported model, usage, amount) checkable against an on-chain price table (TAP-17) | planned | — |
| 7 | Owners sign a delegation (TAP-11); it stops working when the agent changes hands | planned | — |
| 8 | Results are delivered over TapeSend to the agent's container, readable by its current holder | planned | — |
| 9 | Agents can be bought with USDT0 and resold; a resale circuit checks each sale and the payment is split instantly between seller, maker and Evermo | planned | — |
| 10 | The marketplace and agent pages are DeWEB sites opened via `tape://` | planned | — |
| 11 | Anyone can check an agent's rules, tools and prices without a wallet | planned | — |
| 12 | Demo agent "Position Watch" sends lending health alerts on X Layer | planned | — |
| 13 | Demo agent "Token Risk Check" reports on contracts, liquidity and holders on X Layer | planned | — |
| 14 | Every budget and resale decision is shown on the agent's page | planned | — |
