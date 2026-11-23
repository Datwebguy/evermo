# Evermo — App plan

The app people use to find, buy, use, prove and resell agents. This file defines the MVP, the user journeys, the stack,
the data, the APIs and the architecture. Nothing in the app is hard-coded or sample data: every number, name and status
comes from X Layer or from records signed by the agent service.

## 1. MVP

The MVP is complete when one person can do all of this on X Layer mainnet, on desktop and on a phone:

1. Open Evermo without a wallet, browse agents ranked by their track record, and try a demo agent for free.
2. Connect a wallet (OKX Wallet first) and buy an agent in USDT0 or BEM, seeing the split happen.
3. Switch the agent on in one guided flow: allow Evermo to act for it, set a daily limit and a per-payment limit, add a
   budget.
4. Use it: run a check, set a watch, and see each answer, its receipt and its cost.
5. Watch its track record grow and see the budget circuit decide every payment, live.
6. Resell it, with the builder's royalty and Evermo's fee paid in the same transaction.
7. As a builder, add an agent: create its identity, or add one that runs on another platform after Evermo checks it.

### Essential features (in the MVP)

| Area | Feature | Product feature # |
|------|---------|-------------------|
| Browse | Agent list with track record, price, owner, last activity; search and sort | 8, 13 |
| Browse | Agent page: what it does, its tools and their fingerprint, price, track record, history of sales | 2, 8 |
| Browse | Try for free: run the agent's task without a wallet and see the signed answer | 4, 13 |
| Live | Circuit view: the budget and resale circuits' inputs and decisions as they happen | 12 |
| Wallet | OKX Wallet and other injected wallets; X Layer added or switched automatically | 11 |
| Buy | Buy in USDT0 or BEM with the split shown before and after; BEM burn shown | 7, 10 |
| Own | Switch on: permission, limits, allowed payee, budget deposit, signed approval of the signer | 3, 5 |
| Own | Use: run tasks as the owner; each answer shows its receipt and its cost | 3, 4 |
| Own | Watch (Position Watch): pick an account and a warning level; alerts go to the agent's inbox | 6, 14 |
| Own | Budget: balance, today's spend against the daily limit, top up, withdraw | 3 |
| Sell | List with a price and an end date; cancel; see the split a buyer will pay | 7 |
| Build | New agent: create its identity circuit, open its container, register, list | 1, 9 |
| Build | Outside agent: paste its https address, Evermo checks it, then register and list | 9 |

### Not in the MVP

- In-app reading of TapeSend messages. TAP-10 §14.2 allows the inbox key to be created only on the official TapeSend
  site, and a wallet shell must refuse that signature elsewhere. Evermo therefore links to the official TapeSend app for
  the inbox and shows, from the chain, that a message was delivered. This is a rule of the standard, not a shortcut.
- x402 payments from an agent's budget (feature 11, second half): after the MVP, once the budget flow is live.
- Paying the agent's running costs in BEM: the budget is USDT0 first; BEM is accepted for buying and selling.

## 2. User journeys

### Visitor (no wallet)

Home → sees live activity (the latest circuit decisions, sales, work) and the agents with the strongest records → opens
an agent → reads its record and tools → "Try it": enters an account or a token → sees the answer, marked as signed by
the agent, with a "check the signature" detail → "Own this agent" leads to buying.

### Buyer and owner

Agent page → Buy → connects wallet (X Layer switched automatically) → chooses USDT0 or BEM → sees the price, the split
and, on a resale, the builder's royalty → one approval (only if needed) and one purchase → the split animates as it is
paid, from the real transaction's events → "Switch it on" → a single checklist, each step one wallet action, each step
ticks when the chain confirms it:

1. Let Evermo act for this agent until a date you choose (permission).
2. Limits: most per payment, most per day.
3. Add budget (approve, deposit).
4. Approve Evermo's signer for this agent (a signature, no fee).
5. Optional: set up the inbox in TapeSend (opens the official app).

Then "Use": run a task, or start a watch. Every result shows what it cost and the budget circuit's decision.

### Seller

My agents → an agent → Sell → price, token, end date → sees what they will receive after the fee and royalty → list
(the agent moves to escrow; the page says so in plain words) → cancel at any time before a sale.

### Builder

Add an agent → choose "Create here" or "Already running elsewhere":

- Create here: name and description, tools, price → create identity (tape-out), open its container, register, list.
  The cost in OKB is read from the TapeOut contracts and shown before each step.
- Already running elsewhere: paste its https address → Evermo checks it (`GET /check-agent`) and shows each problem in
  plain words → register and list.

## 3. Screens

| Screen | Desktop | Phone |
|--------|---------|-------|
| Home | Live activity beside the leading agents | Live strip on top, agents below |
| Agents | Grid of cards; filters on the left | One column; filters in a sheet |
| Agent | Record and actions side by side; circuit view below | Actions in a fixed bottom bar; sections stacked |
| My agents | Table of owned agents with budget and status | Cards |
| Switch on / Sell / Add | A focused panel over the page | A full-screen sheet with one step per view |
| Activity | Full live view of the circuits | Same, one column |

Navigation: top bar on desktop (Agents, Activity, My agents, Add an agent, wallet); bottom tab bar on phones with the
same four places and the wallet in the header.

## 4. How it looks and moves

Rules taken from the Stageshow skill (MIT, Benji Taylor) and applied to a real product with real data:

- **Restraint.** Each screen has one subject: the agent's record, the decision, the split. Few words, real ones.
- **One number is big.** On an agent card it is the track record; on a budget it is what is left today.
- **Every motion has a cause.** Numbers roll only the digits that changed, when the chain reports a change. A purchase's
  split flies from the price to the seller, the builder and Evermo, in the order the transaction paid them. A circuit's
  inputs light, then its gates, then its output, when a decision event arrives.
- **Loading keeps the content's shape.** Skeletons use the real rows' geometry; rows resolve top to bottom.
- **Phones get a real design, not a squeeze.** Built for 360 px width up; touch targets at least 44 px.
- **Reduced motion is respected.** With reduced motion, values change in place without travel.
- **Look.** Warm brown, orange and white; one type family (system stack); icons from one set (Phosphor) at one size
  and stroke; light and dark themes from the same tokens.
- **No developer wording.** The table below is the app's vocabulary.

| Never shown | Shown instead |
|-------------|---------------|
| agentId, tokenId, circuit id | The agent's name; its number only in "Details" |
| container, ERC-6551 | The agent's wallet |
| operator, permission | Let Evermo act for this agent |
| delegation, EIP-712 | Approve Evermo's signer |
| eval, netlist, NAND | The rule check; "How it decides" opens the circuit |
| transaction hash | "View on the explorer" link |
| revert, error codes | A sentence saying what happened and what to do |

Stageshow has no 3D. The circuit view is a 2D animated diagram drawn from the real netlist, which keeps the site small
enough to store on chain.

## 5. Tech stack

| Part | Choice | Why |
|------|--------|-----|
| App | React 18, TypeScript, Vite | Builds to static files for DeWEB; Stageshow's kit is React 18 |
| Styling | Plain CSS with design tokens | Small bundle, light and dark from one set |
| Motion | Stageshow kit parts where they fit (rolling numbers, fly into a slot), else CSS | Real data driving proven motion |
| Chain | ethers 6 | Already used by the contracts and the service |
| Wallet | EIP-1193 injected wallets, OKX Wallet first; OKX Connect for phones | Works inside the DeWEB gateway (tested) |
| Hosting | DeWEB: uploaded through SiteRegistry, opened through the TapeKit gateway | The page you buy from can't be swapped |
| Service | Node 22, TypeScript (existing `service/`) | Already built and tested |
| Service host | Railway | Long-running process for watches and the indexer |
| AI | NEAR AI Cloud, OpenAI format, model chosen by setting | Prices read from its published list |

The OKX Connect package and its use inside the DeWEB gateway are to be checked before they are relied on.

## 6. Data

The chain is the source of truth. Nothing the app shows as fact comes only from Evermo's server.

| Data | Where it lives | How the app reads it |
|------|----------------|----------------------|
| Owners, listings, budgets, limits, permissions, records | X Layer contracts | Directly over RPC from the browser |
| History (work, payments, sales, decisions) | X Layer events | From the service's index, each item linked to its transaction |
| Signed answers and receipts | Service store | From the service; the app checks the signature |
| Watches | Service store | Owner-signed requests only |
| Agent descriptions | DeWEB site or the outside agent's https address | Fetched and checked (TAP-11, TAP-15) |

**Database.** SQLite in the service, through Node's built-in `node:sqlite`, for the chain index: `events` (block, time,
transaction, log index, contract, event, agent, fields). Delegations, receipts, watches and used request ids are kept in
small JSON files written atomically. The
index can be rebuilt from the chain at any time, so losing it loses nothing. X Layer's RPC returns logs 100 blocks at a
time; the indexer walks forward in 100-block steps from the deployment block and keeps up with new blocks.

## 7. APIs

Service (existing):

| Route | Purpose |
|-------|---------|
| `GET /a/<agent>/.well-known/tapeapi.json` | The agent's description while its owner has switched it on |
| `POST /a/<agent>/<task>` | Signed answer; paid and recorded when signed by the owner |
| `POST /a/<agent>/delegation` | Owner approves the signer |
| `POST /a/<agent>/watch` | Owner sets a watch |
| `POST /a/<agent>/v1/chat/completions` | AI with a signed receipt |
| `POST /a/<agent>/mcp` | The agent's tools |
| `POST /a/<agent>/receipt` | A stored receipt |
| `GET /check-agent?url=` | Checks an outside agent before it is listed |

Service (for the app, built):

| Route | Purpose |
|-------|---------|
| `GET /agents` | Registered agents with their records, for the list and ranking |
| `GET /agents/<id>` | One agent |
| `GET /agents/<id>/history` | Work, payments, decisions and sales, each with its transaction |
| `GET /activity` | The latest events across all agents |
| `GET /live` | Server-sent events: new decisions, sales and work as blocks arrive |

Chain (read by the browser): `AgentRegistry`, `AgentBudget`, `EvermoMarket`, the processor's `eval` and `netlist`, ERC-20
balances and allowances, the TapeOut factory and opener.

## 8. Architecture

```
Browser (DeWEB site, React)
  ├── X Layer RPC ── AgentRegistry · AgentBudget · EvermoMarket · TapeOut processor · tokens
  ├── Wallet (OKX Wallet / injected) ── signs purchases, setup, approvals
  └── Evermo service (Railway)
        ├── agents: Position Watch, Token Risk Check (signed answers, receipts)
        ├── indexer: X Layer events → SQLite → /agents, /history, /live
        ├── watcher: checks watched accounts, pays from budget, records work, sends TapeSend alerts
        └── AI: NEAR AI (metered, receipts)
```

App source layout:

```
app/
  src/
    chain/      contract addresses (from the deployment file), reads, writes, event decoding
    service/    calls to the agent service and signature checks
    ui/         tokens, layout, shared parts (Stageshow kit parts adapted here)
    screens/    Home, Agents, Agent, MyAgents, SwitchOn, Sell, AddAgent, Activity
    flows/      buy, switch on, sell, add agent: step machines with chain confirmation
  public/
  index.html
```

Deployment addresses come from one file written by the deployment script, never typed into the code.

## 9. Quality bar

- Every screen is checked at 360, 390, 768, 1280 and 1440 px wide, light and dark, with automated screenshots.
- Every flow is run end to end on the X Layer fork before mainnet, then on mainnet.
- Wallet rejected, wrong network, not enough balance, limit reached, listing ended, service unreachable: each has its own
  plain sentence and a way forward.
- No screen shows data that could not be traced to the chain or a signed record.
