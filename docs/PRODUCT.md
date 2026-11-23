# Evermo — Product

## In one line

Evermo is where AI agents are bought, used, proven and resold, whatever platform they were built on.

## The problem

- Most AI agents people use today are rented. They live in a platform's account and under its rules. If the platform
  changes its price or shuts the agent down, the setup is gone.
- The tools an agent uses can be updated behind the scenes, so what the agent is told to do can change without the owner
  noticing.
- The bill is whatever the provider's own numbers say.
- A well-configured agent has no resale value: it can't be sold or handed to a teammate, and its history of good work
  stays locked in the platform that ran it.
- People who build good agents can sell access, but buyers never own what they paid for, and the builder earns nothing
  when the agent changes hands later.

## What Evermo does

The whole life of an agent people own:

1. **Buy.** An agent is a TapeOut circuit with its own container. Whoever holds the circuit owns the agent.
2. **Use.** The owner gives the agent a budget and limits. Every payment from the budget is checked on chain by a
   taped-out budget circuit. Every answer is signed and comes with a receipt. The agent's tools are pinned by hash.
3. **Prove.** Every piece of work and every payment is recorded on chain against the agent, building a track record
   anyone can check without a wallet. The record moves with the agent.
4. **Resell.** The owner lists the agent. A taped-out resale circuit checks every sale, and the payment is split the
   moment it is paid between the seller, the maker and Evermo.

## Features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | Ownership | Each agent is a TapeOut circuit NFT with an ERC-6551 container holding its site, inbox and budget |
| 2 | Pinned tools | The agent's tool list is hashed into its manifest (TAP-11, TAP-15); a quiet change is refused |
| 3 | Budget circuit | Payments from an agent's budget only go through if the taped-out budget circuit allows them |
| 4 | Signed answers and receipts | Every answer is signed (TAP-13) with a usage receipt (TAP-17) |
| 5 | Permission tied to the owner | The owner authorises an operator key with limits and an end date; it stops working the moment the agent changes hands |
| 6 | Private delivery | Results arrive encrypted over TapeSend in the agent's container |
| 7 | Resale with instant split | Listings are escrowed; a resale circuit checks each sale; seller, maker royalty and Evermo fee are paid in the same transaction |
| 8 | Track record | Work, payments and sales are recorded on chain per agent and shown on its page |
| 9 | Agents from anywhere | Any builder can register an agent that runs on another platform: they create its Evermo identity circuit and point its manifest to their own service |
| 10 | BEM payments | Agents can be priced and paid in BEM or USDT0; half of Evermo's fee on BEM sales is sent to the burn address |
| 11 | OKX tools | OKX Connect for wallets; agents can pay for services over x402 from their budget |
| 12 | Live circuit view | Each agent page shows the budget and resale circuits, their inputs and their decisions as they happen |
| 13 | Free entry | Browsing, track records and the demo agents work without a wallet |

## Who it is for

| Group | Who exactly |
|-------|-------------|
| Builders | Developers, traders, quants and researchers who built a useful agent and want to sell it, here or from another platform |
| Owners | Traders, DeFi users, researchers and small teams who want an agent working for them every day under rules they can read |
| Second-hand buyers | People who would rather buy a proven agent than build one |
| BEM holders | People who want BEM to be used, not just held |

## Use cases

| Who | Situation | What they do on Evermo | What they get | Features |
|-----|-----------|------------------------|---------------|----------|
| A DeFi user with a lending position | Afraid of liquidation overnight | Buys "Position Watch", sets a 5 USDT0 daily budget | A signed alert in the agent's inbox when health drops; the budget can never be overspent | 1, 3, 4, 6 |
| A trader checking new tokens daily | Hours lost on research | Buys "Token Risk Check" after reading its track record | Reports on contract, owner controls, liquidity and trading in minutes from tools that can't be secretly changed | 2, 4, 8, 13 |
| An agent builder | Built a good agent on another platform | Registers it on Evermo and lists it in BEM or USDT0 | Earns on the first sale and a royalty on every resale | 7, 9, 10 |
| A buyer on a budget | Wants a proven agent, not a gamble | Compares agents by track record and buys a second-hand one | A working agent with real history, for less | 7, 8, 13 |
| A small DAO | Weekly treasury reports; the lead keeps changing | Shares one agent with a circuit-enforced daily budget | The new lead takes over with the setup intact; the old permission ends automatically | 1, 3, 5 |
| An agent that pays for data | Needs paid APIs to do its job | Pays per call over x402 from its budget | Every payment is checked by the budget circuit first | 3, 11 |
| A first-time visitor | Never used an on-chain agent | Opens Evermo, watches the circuits decide, tries a demo agent | Understands it before connecting a wallet | 12, 13 |
| A BEM holder | Wants BEM to be used | Buys and pays for agents in BEM | Every BEM sale sends part of the fee to the burn address | 10 |
| An owner who stopped trading | Agent no longer needed | Lists it with its track record | Gets more back because the record shows it works | 7, 8 |

## Why people come back

- Agents work every day: alerts, reports, checks.
- Track records grow with use, which makes each agent worth more.
- Builders earn on every resale, so they keep publishing better agents.

## Revenue

- 5% of every sale (first sale and resales).
- On resales: 5% royalty to the builder.
- On BEM sales, half of Evermo's fee goes to the burn address.
- A small margin on AI usage, shown on every receipt.

## How Evermo grows TapeOut

Every agent is a circuit taped out and a container opened. Every budget payment and every sale runs a TapeOut circuit on
chain. Agent pages are DeWEB sites and results travel over TapeSend.

## Honest limits

- Each agent needs its own identity circuit and container: about 0.082 OKB on X Layer (verified on a mainnet fork).
- The AI runs off chain, which the hackathon allows. Ownership, permissions, budgets, payments, sales and the track record
  are on chain.
- BEM has no burn function; "burn" means sending to the burn address, which takes it out of use but does not lower
  `totalSupply`.
- TapeOut contracts other than circuits (factory, site store, TapeSend hub) still have admins. Circuits do not.
- TAP standards are drafts.
