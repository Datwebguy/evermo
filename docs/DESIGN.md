# Evermo — rules that last forever

Status: **idea and plan.** No code for this version yet; the build starts on the go-ahead.
Based on the hackathon page, the TapeOut guide (tapeout.link) and on-chain checks on X Layer.

## One line

Evermo turns any app rule into a permanent TapeOut circuit that anyone can check, and nobody can change.

## The problem

You join an airdrop, a loyalty program or a game on X Layer. The rules decide who gets what. But those rules sit in a
contract with an admin key, or on a team's server. They can change after you have done the work, and you cannot easily
check what they really are.

Projects have the opposite problem: they say "the rules are fair and final", and users have no reason to believe it.

## The solution

A project writes its rule in plain terms. Evermo turns it into the smallest NAND circuit, the project tapes it out on
TapeOut, and its contract asks the circuit for every decision with `eval`. Once taped out, the rule can never change, and
anyone can check it for free without a wallet.

## How it works (five steps)

1. **Describe the rule.** A simple form: name the inputs (yes/no, or a number in ranges) and say what the output is for
   each case. Example: "weeks active 0–7, holds 10+ BEM yes/no → reward tier 0–3".
2. **Build.** Evermo generates the smallest circuit it can, shows the gate count and the cost, and tests every possible
   input against the description before anything touches the chain.
3. **Tape out.** One click tapes it out on the Evermo processor on X Layer. Power users can instead import the BLIF file
   into the TapeOut canvas.
4. **Use.** The project gets a short code snippet: its contract passes the inputs and calls `eval(circuitId, inputs)`.
5. **Verify.** Every rule gets a public page on DeWEB. Anyone can read the rule in plain words, try any input, and see the
   answer straight from the on-chain circuit. No wallet, no account.

## Who uses it

- **Projects (rule makers):** airdrops, loyalty programs, games, DAOs, any app on X Layer that wants provably fair rules.
- **Their users (rule checkers):** open the rule page and check what they will get, before and after.
- **Developers:** add a permanent rule to a contract with one call.

## Use cases

- **Airdrop eligibility:** "active 4+ weeks and made 10+ transactions → eligible, tier by activity". Published before the
  campaign starts, so it cannot be changed after people farm it.
- **Fee or discount tiers:** "holding time and position size → fee %".
- **Loyalty levels:** "months active and spend bucket → level".
- **Game rules:** "card A vs card B → winner", "roll and stats → outcome".
- **Voting thresholds:** "turnout bucket and yes-share bucket → passed or not".

## Why it is different

- **The circuit is the product.** Other tools put rules in contracts that admins can upgrade. Evermo rules are taped-out
  logic: no admin, no upgrade, ever.
- **No hardware skills needed.** Projects describe a rule; Evermo does the logic design.
- **Anyone can check, for free.** `eval` is a free read, so the rule page works without a wallet.
- **Nothing to trust about Evermo either.** The app runs on DeWEB and is checked byte-by-byte when opened. Evermo never
  holds user funds.

## What a rule can and cannot do (stated openly)

- The circuit fixes the logic. The project's contract supplies the inputs (balances, times, counts). A project that wants
  the full guarantee must also lock its contract to the circuit ID; the rule page shows the circuit, and we say this
  clearly.
- Rules must be small: a handful of inputs, not lists of thousands of addresses. Netlists above about 40 KB cannot be
  taped out in one go.
- A wrong rule is wrong forever. That is why Evermo tests every input before tape-out and shows the result in plain words.

## Revenue

Evermo opens its own processor on X Layer. On TapeOut, the processor creator sets a transistor price and earns a share
whenever anyone mints transistors on it. Every rule taped out through Evermo uses Evermo transistors, so Evermo earns per
gate, using TapeOut's own economics. No subscriptions, no token sale, no outside money.

Why projects pay and come back:
- A rule costs only a few dozen transistors.
- Rules are permanent, so every new campaign, season or game needs a new rule: repeat tape-outs are built in.
- Users trust projects that publish Evermo rules, which is what projects want.

Running costs are close to zero: no servers (the app is on DeWEB) and nothing to administer.

Honest risk: a project could take the BLIF file and tape out on another processor, skipping our share. The one-click
flow uses the Evermo processor by default.

## TapeOut features used

| Feature | How Evermo uses it |
|---------|-------------------|
| NAND circuits + `eval` on X Layer | Every rule is a taped-out circuit; contracts call `eval` |
| Processor factory | Evermo's own processor, earning a share of transistor mints |
| Canvas (BLIF import) | Power users can open and inspect any rule in the canvas |
| Circuit containers (ERC-6551) | The Evermo app's container hosts the site and receives revenue |
| DeWEB + HashPort | The app and every rule page are static files on chain, opened via `tape://` |
| TapeKit | Pages are verified byte-by-byte; the tapekit.org gateway opens them in any browser |
| BEM | Pays processor creation (0.1 BEM) and mints (0.01 BEM per transaction) on new processors |

## Hackathon rules check

| Rule / criterion | How Evermo meets it |
|------------------|---------------------|
| Use TapeOut circuits, contracts or on-chain data on X Layer, or run on X Layer DeWEB | Circuits and `eval` on X Layer; the app on X Layer DeWEB |
| Circuit projects: processor address + circuit ID | Evermo processor address and the demo rule's circuit ID (TBD after tape-out) |
| Apps: access link + TapeOut features used | `tape://` link and https gateway link; features listed above |
| Product, users and how to reach them, revenue, why users pay and stay | Sections above and `docs/SUBMISSION.md` |
| Only work during the event; no fabricated functionality | Built during the event; posts say clearly what is built and what is planned |
| Judging: user value, innovation, ecosystem integration, readiness/UX, demo video (≤3 min) | Real trust problem; makes circuits usable by any project; processor + circuits + containers + DeWEB + HashPort + TapeKit + canvas; five-step app; video planned |

## Demo for judges

One real rule, end to end, on X Layer: an "Evermo early supporter" reward rule.
1. Describe it in the form.
2. Build: gate count, cost, all inputs tested.
3. Tape out on the Evermo processor.
4. A small demo contract calls `eval` and gives out a reward tier.
5. Open the rule's DeWEB page with no wallet and check any input.

## Build plan (after go-ahead)

1. **Rule engine:** turn the existing circuit generator into a general one (any inputs and outputs), minimized, exhaustive
   tests, BLIF and JSON output.
2. **Checks on X Layer:** exact `eval` ABI, processor creation and transistor pricing, BLIF import into the canvas.
3. **Evermo processor** on X Layer.
4. **App:** describe → build → tape out → snippet; rule page with live `eval` and no wallet.
5. **Demo contract** that calls `eval` for the reward rule.
6. **DeWEB:** container and HashPort upload; https fallback if wallets cannot connect inside a `tape://` site.
7. **Demo video** under three minutes.

The v1 vault code in `contracts/` is removed when the build starts; its circuit generator is reused.

## Costs to launch (small, one-time)

- Processor creation: 0.1 BEM (about $1).
- Demo rule tape-out: a few dozen transistors plus the tape-out fee and gas.
- Container: 0.08 OKB.
- Site upload through HashPort: no service fee, gas only.
