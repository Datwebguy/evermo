# Evermo — Product

## In one line

A marketplace where people buy, use and resell AI agents they actually own. Every agent's rules, tools and prices can be
checked by anyone and can never be quietly changed.

## Who it is for

| Group | Who exactly |
|-------|-------------|
| Agent makers | Developers, traders, quants and researchers who built a useful agent (risk checker, position monitor, research summarizer) and want to sell it |
| Agent owners | Traders, people with money in DeFi, researchers, small teams and DAOs who want an agent working for them every day without trusting a platform |
| Second-hand buyers | People who would rather buy an agent that is already set up and proven than build one |

## The problem today

Owners:
- The agent lives on someone else's platform. If the platform changes terms or shuts down, the agent is gone.
- You cannot check what the agent is told to do. A tool description can be quietly changed (for example "also read the
  user's key file") and nobody notices.
- You cannot check the bill. Token counts, model and price all come from the provider.
- There is no hard limit outside the agent that stops it from doing more than you allowed.
- You cannot sell a well-configured agent or hand it to a teammate.

Makers:
- There is no way to sell an agent as a product someone owns. Makers rent access through platforms that take a cut and
  own the customer.

## How it is used

1. **Browse.** Open Evermo on DeWEB. Each agent page shows what it does, its rules (a circuit anyone can read), its tools
   (pinned on chain), its price list (on chain) and its history.
2. **Buy.** Pay in USDT0. The agent's circuit NFT, and the container that holds the agent, move to your wallet.
3. **Give permission.** Sign one record (a TAP-11 delegation) saying which key may act for your agent and until when.
   Cancel it any time. Only the current owner's signature counts.
4. **Fund it.** Top up a small budget for the agent's AI usage.
5. **Use it.** The agent works on its own and sends results to its own container's inbox, which only you can read. Every
   answer is signed and carries the rules circuit's inputs and result; every AI charge has a receipt you can check against
   the price list (the receipt shows the model as reported).
6. **Sell or hand it over.** Transfer or list the agent. The old owner's permission stops working; the new owner signs
   their own.

## Use cases

| Who | Situation | What they do | What they get |
|-----|-----------|--------------|---------------|
| Someone with money in DeFi lending | Afraid of being liquidated while asleep | Buys a "Position Watch" agent and points it at their positions | Signed alerts in their inbox when health drops |
| A trader who checks new tokens daily | Spends hours checking contracts, liquidity and holders | Buys a "Token Risk Check" agent | A risk report per token in minutes, from tools that cannot be secretly changed |
| The maker of that risk checker | Wants income from their work | Lists copies on Evermo | Paid on every sale, and on every resale through Evermo |
| A researcher following governance | Too many proposals to read | Buys a "Governance Digest" agent | A daily summary, with the cost of each summary visible |
| A small team or DAO | Needs weekly treasury reports; members change | Shares one agent; it prepares reports within set limits | When the lead changes, the agent is transferred with all its setup |
| An owner who no longer needs an agent | Stopped trading after six months | Lists the configured agent | Gets value back instead of losing the setup |

## Why people come back

- Agents run every day: alerts, reports, digests.
- Makers keep publishing new and improved agents.
- Owners build up a set of agents and trade them as their needs change.

## Revenue

- 5% of every agent sale.
- On resales through Evermo: 5% to Evermo and 5% royalty to the maker.
- A small margin on AI usage, shown on every receipt.

All numbers are proposals until launch.

## What makes it different

- Agents are products people own, not accounts on a platform.
- Rules, tools and prices are fixed on chain and checkable by anyone, without a wallet.
- It puts TapeOut's service standards (TAP-10, 11, 13, 15, 17) to work together in one product.

Related work in the ecosystem: TapeAI runs its own agents and token; an "Agent Firewall" idea proposes a rules layer.
Evermo is the marketplace where agents are owned, verified and resold.

## Honest limits

- Each agent needs its own circuit and container: about 0.082 OKB on X Layer (verified). The maker pays this; it is part
  of the agent's price.
- The AI runs off chain (the hackathon allows this). Ownership, rules, permissions, prices and receipts are on chain.
- The first version ships agents that watch, check and report. Agents that move money come later, inside circuit limits.
- The TapeOut standards used are drafts. Maker royalties apply to resales through Evermo; royalties on the official
  Circuit Market are not confirmed.
- No audit yet.
