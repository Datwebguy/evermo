# Evermo — submission form text (ready to paste)

Form: https://forms.gle/EoDNbxQ65dev1wFd9 · Deadline: 7 December 2026, 23:59 UTC. Fields marked TBD are filled after deployment.

## Project name

Evermo

## One-line description

A marketplace where people buy, use and resell AI agents they actually own, with every agent's rules, tools and prices
checkable on chain and impossible to quietly change.

## Product

Evermo turns AI agents into things people own. Each agent is a TapeOut circuit on X Layer with its own container
(ERC-6551), so whoever holds the circuit owns the agent, its setup, its inbox and its budget.

How it works:
1. Browse agents on Evermo's DeWEB site. Each agent page shows its rules (a circuit anyone can read), its tools (pinned
   on chain), its price list (on chain) and its history.
2. Buy an agent with USDT0. The agent's circuit NFT moves to your wallet.
3. Sign one permission saying what the agent may do and until when.
4. The agent works on its own and sends results to your TapeSend inbox. Every answer is signed and every AI charge has a
   receipt you can check against the on-chain price list.
5. Sell or hand over the agent at any time. The old owner's permission stops working.

## Problem it solves

Today an AI agent lives on someone else's platform: it disappears if the platform changes, its tool instructions can be
quietly changed, its bill cannot be checked, nothing outside the agent enforces your limits, and a well-configured agent
cannot be sold or handed over. Makers cannot sell agents as products people own; they rent access through platforms that
take a cut.

## Target users and how we reach them

- **Agent makers** (developers, traders, quants, researchers): TapeOut and X Layer builder communities, r/tapeout, TapeTape,
  AI agent developer communities. Makers bring their own followers to buy their agents.
- **Agent owners** (traders, DeFi users, researchers, small teams and DAOs): through makers' audiences, X Layer and OKX
  Wallet communities, and agent pages anyone can open and share without a wallet.
- **Second-hand buyers:** the resale listings.

## Use cases

- A DeFi user buys a "Position Watch" agent and gets signed alerts when their lending position gets risky.
- A trader buys a "Token Risk Check" agent instead of spending hours checking each new token by hand.
- A maker sells copies of their risk checker and earns on every sale and resale through Evermo.
- A team shares one agent for weekly treasury reports and transfers it when the lead changes.
- An owner who stops trading sells their configured agent instead of losing it.

## Why users pay and keep using it

- Owners pay for an agent once and own it; they can resell it later, so buying is low-risk.
- Agents run every day (alerts, reports, digests), so owners return daily.
- Makers earn on every sale and resale, so they keep publishing better agents.
- Rules, tools and prices are verifiable, which removes the main reasons people don't trust agents.

## Revenue model

- 5% of every agent sale.
- On resales through Evermo: 5% to Evermo and 5% royalty to the maker.
- A small margin on AI usage, shown on every signed receipt.

## TapeOut features used

- **Circuits on X Layer:** each agent is a circuit NFT; a shared rules circuit decides with `eval` whether each agent
  action is allowed.
- **Circuit containers (ERC-6551):** hold each agent's site, inbox and budget; ownership moves with the circuit.
- **DeWEB + HashPort + TapeKit:** the marketplace and every agent page are on-chain sites opened via `tape://`.
- **TapeSend:** private delivery of agent results and receipts to owners.
- **TAP-11 / TAP-13:** each agent publishes a service manifest and signs every answer.
- **TAP-15:** agent tool descriptions pinned on chain, so a quiet change is detected and refused.
- **TAP-17:** on-chain AI price tables and signed usage receipts.
- **TAP-18:** owners' signed permissions for their agents.

## Circuit details

- Processor contract address: TBD
- Rules circuit ID: TBD
- Rules circuit: inputs `permission_valid`, `target_allowed`, `is_spend`, `over_single_limit`, `over_daily_limit`;
  outputs `allow`, `needs_confirm`.

## Access link

- DeWEB (tape://): TBD
- Gateway (https): TBD
- Repository: https://github.com/Datwebguy/evermo
- Demo video: TBD

## Status

New project built during the event.
