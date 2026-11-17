# Evermo — Project plan

## Goal

Ship a working Evermo on X Layer by 7 December 2026, 23:59 UTC: a DeWEB marketplace where at least two real agents can
be bought, used, and resold, with every rule, tool and price checkable on chain.

## MVP scope

| Part | What it does | Where |
|------|--------------|-------|
| Agent identity | Each agent is a circuit NFT on X Layer with its own container (ERC-6551) | TapeOut |
| Agent manifest | `/.well-known/tapeapi.json` in the agent's DeWEB site: endpoints and signer (TAP-11), pinned tool digest `toolsSha256` (TAP-15), AI price table (TAP-17) | DeWEB |
| Rules circuit | One shared circuit that decides if an agent action is allowed (see `CIRCUIT.md`) | TapeOut, X Layer |
| Marketplace contract | List, buy with USDT0, resale with maker royalty, fee split | Solidity, X Layer |
| Agent runtime | Off-chain service: checks the current owner on chain, checks the owner's signed permission (TAP-18), runs the agent, signs every answer (TAP-13), writes AI usage receipts (TAP-17), delivers results | Node.js |
| Inbox | Results and receipts delivered over TapeSend to the owner's container; in-app inbox as fallback | TapeSend |
| App | Marketplace, agent page (rules, tools, prices, history), My Agents, Inbox | DeWEB via HashPort, TapeKit |
| Demo agents | "Position Watch" (lending health alerts on X Layer) and "Token Risk Check" (contract, liquidity and holder checks on X Layer) | Runtime |

Not in the MVP: agents that move money, agent-to-agent hiring, more than two demo agents.

## User flows to demo

1. Maker publishes an agent: circuit + container created, manifest uploaded, listing created.
2. Owner buys it with USDT0, signs a permission, tops up a budget.
3. Agent sends a signed alert with an AI usage receipt to the owner's inbox.
4. Anyone opens the agent page without a wallet and checks rules, tools and prices.
5. Owner lists the agent; a second account buys it; the first owner's permission stops working.

## Build order

1. Confirm on X Layer: `eval` ABI, official processor and NAND price, container opening, TapeSend hub, HashPort upload,
   wallet connection inside a `tape://` site.
2. Rules circuit: define, test every input, export for the canvas, tape out.
3. Marketplace contract and tests.
4. Agent runtime with TAP-11/13/15/17/18 and the two demo agents.
5. DeWEB app and upload.
6. End-to-end run on X Layer, demo video (under 3 minutes), submission.

## Repository standards

- Clean, well-structured code; actively maintained open-source tools.
- README written for both people and AI judges: what it is, the problem, and "do X → see Y" steps.
- Every claim in `CLAIMS.md` points to evidence in the repo or on chain.
- Claude is not listed as an author or co-author anywhere.
