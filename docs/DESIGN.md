# Evermo — design v4 (simple, balanced, sticky)

Status: **plan only.** `contracts/` still holds the v1 prototype. Code changes wait for the go-ahead.
This version replaces v2 and v3. It is based on the hackathon page and the TapeOut guide (tapeout.link: what-is, core
concepts, first tapeout, DeWEB, HashPort, TapeKit, TapeCode, safety, quick reference), plus on-chain checks on X Layer.

## Pitch

**Tape out for free: your yield pays your TapeOut fees.**

For TapeOut builders and the people who back them. Deposit USDT0, keep your principal, and send your yield as BEM, OKB or
USDT0 to yourself, your project's circuit container, or a builder you support. The fee rules live in a TapeOut circuit,
so nobody can ever change them.

## What the user sees (three buttons, one setting)

1. **Deposit** USDT0. You get evUSDT0 1:1 (the receipt; you can hold or send it).
2. **Claim** your yield as **BEM**, **OKB** or **USDT0**, sent to any address: your wallet, your project's circuit
   container, or someone else's.
3. **Withdraw** your USDT0 any time, with any unclaimed yield.
4. **Back a builder** (optional setting): name one address that may collect your yield whenever they need it. Your
   deposit stays yours, and you can change or remove the builder at any time.

## Why users pick Evermo, and keep coming back

| Reason | What it means for the user |
|--------|----------------------------|
| Yield arrives as TapeOut fuel | BEM for new processors and mints, OKB for containers and older processors. No swapping, no bridging. |
| Fund your project directly | Send yield straight to your circuit's container, so your project pays its own fees. |
| Back a builder at no cost | Supporters keep their deposit; the builder collects the yield. A no-loss way to support TapeOut builders. |
| Loyalty that grows | Your fee drops every 2 weeks you stay. Leave, and you start from the top again. |
| Rules nobody can change | The fee table is a taped-out circuit. No admin key exists. |
| Frontend nobody can swap | The app lives on DeWEB and is checked byte-by-byte when opened. |

**Growth loop:** builders bring their own supporters to Evermo, because supporters' yield pays the builder's fees. Every
builder who joins is also a marketer.

## Compared with the alternatives (honest)

| | Aave directly | Generic yield vault | Evermo |
|--|--|--|--|
| Highest raw yield | yes, no fee | often | no, Evermo takes 3–10% of yield |
| Yield paid as BEM / OKB | no, swap yourself | no | yes |
| Send yield to a container or a builder | no | no | yes |
| Rules permanent and readable on TapeOut | no | no | yes |
| Admin keys | Aave governance | usually | none |
| Frontend on DeWEB | no | no | yes |

Users who only want the highest yield will go elsewhere. Evermo is for people who build on TapeOut or back those who do;
for them the convenience, the loyalty discount and builder support are the reasons to stay.

## Fees (set by the circuit, the same for every payout option)

| | Fee on yield |
|--|--|
| Starting fee | 10% |
| Every 2 weeks held | −1%, up to −3% (6+ weeks) |
| Position $1,000+ / $10,000+ | −1% / −2% |
| Paid out in BEM | −2% |
| **Lowest possible** | **3%** |

Withdrawals never depend on the circuit: principal plus unclaimed yield always comes back at the 10% starting fee.

Why these numbers (placeholders until tape-out, then fixed forever):
- Yield vaults commonly take roughly 10–20% of yield, so 10% sits at the low end.
- The same schedule applies to USDT0, OKB and BEM, so there is no cheap route to cash out.
- The BEM discount (2%) is no bigger than the cost of swapping BEM back out (about 2% in pool fees plus slippage), so
  claiming BEM just to dump it does not pay.
- The discount comes from Evermo's own fee; no outside money is needed.

Example: 1,000 USDT0 at about 3.35% earns about $33.50 a year. Held 6+ weeks and taken as BEM, the fee is 6%, leaving
about $31 of BEM after the swap: about 3.4 BEM at today's ~$9.20, enough for about 340 mint transactions. Principal
untouched.

Revenue, honestly: at $1M deposited, yield is about $33k a year and Evermo earns about $1k–3.3k. It grows with deposits;
it is not a big business at small scale.

## Circuit rules (permanent)

Inputs (6 wires): weeks held 0–7 (3 wires), size category (2 wires: under $1,000, $1,000+, $10,000+), paid in BEM (1 wire).

Output (4 wires): the fee in whole percent (3–10).

`fee = 10 − min(3, weeks / 2) − size − (BEM ? 2 : 0)`

The circuit returns the fee itself, so anyone reading it on-chain sees the exact fee table. No fee numbers live in the
vault code, except the fixed 10% on withdrawals.

Built with the TapeOut canvas: we export a **BLIF** netlist (the canvas imports BLIF from Yosys/ABC), check it in the
canvas simulator, then tape out on the **official TapeOut processor on X Layer** (the hackathon says we do not need our
own processor). Target: about 40 NAND gates or fewer. The vault calls `eval` on it before every claim.

## One circuit does three jobs

The same Evermo circuit NFT:
1. **holds the fee rules** (`eval` before every claim),
2. **hosts the app**: its container (ERC-6551) carries the DeWEB site at a `tape://` address,
3. **collects revenue**: Evermo's fees are sent to that container address.

Whoever holds the circuit NFT controls the container. That is the project owner, and it is stated openly.

## Where the yield and BEM come from

- Yield: Aave V3 on X Layer, USDT0 market (largest market, about 3.35%).
- BEM and OKB: swapped at claim time on Uniswap V3 on X Layer: USDT0 → WOKB (0.05% pool, about $145k) → BEM (1% pool,
  about $42k). OKB is paid out by unwrapping WOKB. USDT0 payouts need no swap.
- BEM on X Layer is the LayerZero-bridged token `0x60e62efa9405d6873c5deabd4e6cc91c25363952` (8 decimals).
- The user sets a minimum amount out (the app fills it from a live quote) so a claim cannot be front-run at a bad price.

## No admin

There is no owner. The circuit, the Aave market, the swap route and the fee address are fixed at deployment. Nobody can
block a claim, pause withdrawals, change fees or move user funds. A backed builder can only collect yield, never
principal, and only until the depositor removes them. If something must change, a new vault is deployed and users choose
whether to move.

## What was removed from earlier versions, and why

| Removed | Why |
|---------|-----|
| Separate credit token | An extra token users must understand and redeem. Claiming straight to BEM/OKB does the same job in one step. |
| Reserve contract, BEM price feed, redemption | Only needed because of credits. A live swap with a minimum-out replaces all three. |
| Fee-sink integration with TapeOut | TapeOut fees are paid by the builder's own wallet. We deliver BEM/OKB to that wallet or container. |
| Different fee for cash vs. BEM/OKB | It let users claim OKB and sell it to dodge the cash fee. One schedule closes that. |
| USDC and OKB vaults | One asset is simpler. WOKB earns 0% on Aave. |
| Owner blocklist | Contradicted "permanent rules". |
| Multisig and timelock | Nothing left to administer, so no admin at all is simpler and safer. |
| Separate yield-source and receipt contracts | The vault itself is the receipt token and talks to Aave directly. |
| Own processor | Not required by the hackathon; saves 0.1 BEM. |

## Known limits (stated openly)

- Evermo takes 3–10% of yield, so raw yield is lower than using Aave directly.
- Aave USDT0 is about 85% utilized. A large withdrawal can fail until liquidity returns; the app shows how much can be
  withdrawn right now.
- BEM liquidity on X Layer is small (about $42k). Fine for claim-sized swaps; large claims get worse prices.
- BEM price moves. Users receive BEM at the price when they claim.
- Moving evUSDT0 to another wallet resets its loyalty age, so loyalty cannot be bought.
- Contracts are unaudited.

## Later, not now (kept out to stay simple)

- TapeSend message to your container when yield is ready (the TAP-10 spec is being rewritten).
- Automatic scheduled claims (needs a bot and gas).
- More deposit assets.

## Hackathon rules check

| Rule / criterion | How Evermo meets it |
|------------------|---------------------|
| Use TapeOut circuits, contracts or on-chain data on X Layer, or run on X Layer DeWEB | Circuit `eval` on X Layer, and the app on X Layer DeWEB |
| Circuit projects: processor address + circuit ID | Submitted after tape-out (TBD now) |
| Apps: access link + TapeOut features used | `tape://` link and https gateway link (tapekit.org); features listed |
| Describe product, users, how to reach them, revenue, why users pay and stay | In `docs/SUBMISSION.md` |
| Only work done during the event; no fabricated functionality | Built during the event; the post says what is built and what is planned |
| Judging: user value, innovation, ecosystem integration, readiness/UX, demo video (≤3 min) | Real fee problem; yield to containers and builders; one circuit doing three jobs; circuit + containers + DeWEB + HashPort + TapeKit + BEM; simple app; video planned |

## Costs to launch (small, one-time)

- Gas on X Layer for deployment (OKB).
- Tape-out: about 40 NAND transistors bought from the official processor, plus the tape-out fee and gas.
- Container: 0.08 OKB.
- Site upload through HashPort: service fee 0, gas only.

No processor creation fee and no subsidy.

## Checks to do at build time

1. Exact `eval` ABI on the X Layer processor and the BLIF/canvas import, by test-calling `eval` before tape-out.
2. Wallet connection inside a DeWEB site (tape:// sites are sandboxed). If blocked, the hackathon allows the interface to
   also run off-chain, so the same files are served from a normal https link too.
3. Aave pool and USDT0 addresses on X Layer, read on-chain.
4. Uniswap V3 router address on X Layer and the two pools above.
5. Official TapeOut processor on X Layer and its NAND price.
