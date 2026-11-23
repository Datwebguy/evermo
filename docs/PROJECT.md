# Evermo — Build plan

Deadline: 7 December 2026, 23:59 UTC. Goal: Evermo live on X Layer mainnet, with two working agents and one agent from
another platform bought, used, proven and resold through real transactions.

## Repository layout

| Path | What it contains |
|------|------------------|
| `circuits/` | Rule definitions, NAND synthesis to TAP-02 netlists, a TAP-02 evaluator, exhaustive tests, tape-out script |
| `contracts/` | Solidity: `AgentRegistry`, `AgentBudget`, `EvermoMarket`, TapeOut interfaces; tests on a mainnet fork of X Layer |
| `service/` | Agent service: manifests (TAP-11/15/17), signed answers (TAP-13), receipts, track-record entries, TapeSend delivery, the demo agents |
| `app/` | The DeWEB app: browse, agent pages, live circuit view, buy, budget, resell |
| `verification/` | Scripts that reproduce the checks in `docs/VERIFICATION.md` |
| `docs/` | Product, plan, circuits, claims, judging, verification |

## Contracts

- **AgentRegistry**: registers an agent (any TapeOut circuit NFT) with its builder and manifest location; stores the
  owner's operator permission (operator key, per-payment limit, daily limit, allowed payees, end date) keyed to the holder
  at the time it was set, so it stops working when the agent changes hands; records track-record entries written by the
  operator.
- **AgentBudget**: holds each agent's budget in USDT0 or BEM; the current holder can deposit and withdraw at any time; the
  operator can pay only after the budget circuit, called with `eval` on chain, allows the payment; every payment is
  recorded in the track record.
- **EvermoMarket**: escrowed listings in USDT0 or BEM; on purchase it calls the resale circuit with `eval`, then splits the
  payment between seller, builder royalty and Evermo fee in the same transaction, sends half of the fee on BEM sales to the
  burn address, and transfers the agent to the buyer.

No owner keys on the contracts: circuit IDs, processor, accepted tokens, fee and royalty rates and the fee recipient are set
at deployment and cannot change.

## Order of work

1. Days 1–3: circuits and contracts, tested on a mainnet fork of X Layer against the real TapeOut contracts.
2. Days 4–7: agent service, the two demo agents (Position Watch, Token Risk Check), receipts, track record, TapeSend
   delivery, listing of an agent that runs on another platform.
3. Days 8–10: the app on DeWEB: free browsing, track records, live circuit view, OKX Connect, buy, budget, resell.
4. Days 11–14: mainnet tape-out and deployment, real buy → use → resell runs, judge pass, videos, submission.

## Standards for the build

- Real data only: everything shown in the app is read from X Layer or from signed service records. No placeholder or
  sample data.
- No developer wording in the app: plain words for people who use it.
- Every claim in `docs/CLAIMS.md` gets evidence before it is marked built or live.
