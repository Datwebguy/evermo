# Evermo — submission form text (ready to paste)

Form: https://forms.gle/EoDNbxQ65dev1wFd9 · Deadline: 7 December 2026, 23:59 UTC. Fields marked TBD are filled after deployment.
Matches the X post in `docs/POST.md`.

## Project name

Evermo

## One-line description

An app store for AI agents on X Layer, except you own what you buy, you can check everything it does, and you can resell
it when you're done.

## Problem it solves

People who want an AI agent today are stuck between two bad options:
- Build their own: servers, keys, maintenance, and no way to prove what it does.
- Rent one from a platform: it lives in the platform's account, under the platform's rules, and disappears with it. Its
  tools can be quietly changed, its bill can't be checked, and a well-configured agent can't be sold or handed to a
  teammate.

Makers have the same problem from the other side: a great agent can't be sold as a product, only rented out through a
platform that takes a cut and owns the customers.

## Product

Evermo is a marketplace on X Layer where AI agents are things people own.

- **Every agent is a circuit.** Each agent is a TapeOut circuit NFT with its own ERC-6551 container holding its site,
  inbox and budget. Whoever holds the NFT owns the agent.
- **Its tools are pinned on chain.** Every agent publishes a manifest at `/.well-known/tapeapi.json` on its DeWEB site
  (TAP-11), with a hash of its exact tool descriptions (TAP-15). If anyone quietly changes what the agent is told to do,
  the hash stops matching and the change is refused.
- **Its rules are a circuit.** Before an agent acts, Evermo calls `eval` on a rules circuit: is the owner's permission
  valid, is this protocol allowed, is the amount over the limit. Once taped out, nobody can change those rules, and every
  signed answer carries the circuit's inputs and result so anyone can re-run it.
- **Its bill is checkable.** Prices sit in the agent's on-chain manifest. Every answer comes back signed (TAP-13) with a
  usage receipt (TAP-17): what was asked, which model it reports, what it cost.
- **Permission, not keys.** The owner signs one record (TAP-11 delegation): which key may act for the agent and until when.
  It can be cancelled any time, and only the current owner's signature counts.
- **Results in your inbox.** Alerts and reports arrive encrypted over TapeSend in the agent's own container; only its
  current owner can read them.
- **Resell when you're done.** When an agent is sold on Evermo, the old owner's permission stops working and the new
  owner's begins. The maker earns a royalty on every resale through Evermo.

The marketplace lives on DeWEB (`tape://`), checked byte by byte by TapeKit, so even the page users buy from can't be
swapped. Anyone can check an agent's rules, tools and prices for free, without connecting a wallet.

## Target users and how we reach them

- **Makers:** developers, traders, quants and researchers who built a useful agent and want to sell it as a product.
  Reached through TapeOut and X Layer builder communities, r/tapeout, TapeTape and AI agent developer communities. Makers
  bring their own audiences to buy their agents.
- **Owners:** traders, DeFi users, researchers and small teams who want an agent working for them every day, under rules
  they can read. Reached through makers' audiences, X Layer and OKX Wallet communities, and agent pages anyone can open
  and share without a wallet.
- **Second-hand buyers:** people who would rather buy an agent that's already set up and proven. Reached through resale
  listings.

## Use cases

- **Not getting liquidated in your sleep:** someone with a lending position on X Layer buys a "Position Watch" agent.
  When the health factor drops, a signed alert lands in their inbox. The rules circuit lets it watch, never move funds.
- **Checking new tokens without losing hours:** a trader buys a "Token Risk Check" agent that reports on each new token's
  contract, liquidity and holders in minutes, with tools that can't be secretly changed.
- **Getting paid for a good agent:** the maker of that risk checker lists copies on Evermo and earns on every sale and
  every resale.
- **A team that changes people:** a small DAO shares one agent for weekly treasury reports. When the lead leaves, the
  agent moves to the new lead with its setup intact.
- **Getting value back:** someone who stops trading sells their configured agent instead of throwing the setup away.

## Why users pay and keep using it

- Owners buy an agent once and own it; they can resell it later, so buying is low-risk.
- Agents run every day (alerts, reports, digests), so owners come back daily.
- Makers earn on every sale and resale, so they keep publishing better agents.
- Rules, tools and bills are verifiable, which removes the main reasons people don't trust agents.

## Revenue model

- 5% of every agent sale.
- On resales through Evermo: 5% to Evermo and 5% royalty to the maker.
- A small margin on AI usage, shown on every signed receipt.

## TapeOut features used

- **Circuits on X Layer:** each agent is a circuit NFT; a shared rules circuit decides with `eval` whether each action is
  allowed.
- **Circuit containers (ERC-6551):** hold each agent's site, inbox and budget; ownership moves with the circuit.
- **DeWEB + HashPort + TapeKit:** the marketplace and every agent page are on-chain sites opened via `tape://`, verified
  byte by byte.
- **TapeSend:** encrypted delivery of agent results and receipts to owners.
- **TAP-11 / TAP-13:** service manifest, the owner's signed delegation (permission), and signed answers for every agent.
- **TAP-15:** tool descriptions pinned by hash; quiet changes are refused.
- **TAP-17:** on-chain price tables and signed usage receipts.

Together: circuits for rules nobody can change, containers for things you can own and transfer, TapeSend for private
delivery, DeWEB for pages nobody can swap, and the TAP standards for signed answers, pinned tools and checkable bills.
They turn an AI agent from something you rent into something you own.

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
