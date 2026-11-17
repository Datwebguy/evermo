# Evermo — design v3 (simple version)

Status: **plan only.** `contracts/` still holds the v1 prototype. Code changes wait for the go-ahead.
This version replaces v2. It was simplified after reading the hackathon page and the TapeOut guide
(tapeout.link: what-is, core concepts, first tapeout, DeWEB, HashPort, TapeKit, TapeCode, safety, quick reference).

## Pitch

**Tape out for free: your yield pays your TapeOut fees.**
For TapeOut builders. Deposit USDT0, keep your principal, take your yield as BEM or OKB to pay TapeOut fees. The fee
rules live in a TapeOut circuit, so nobody can ever change them.

## What the user sees (three buttons)

1. **Deposit** USDT0. You get evUSDT0 1:1 (it's the receipt; you can hold or send it).
2. **Claim** your yield as **BEM** (fees on new processors) or **OKB** (container fee and older processors).
   The circuit sets your fee: the longer you've held, the lower it is.
3. **Withdraw** your USDT0 any time, with any unclaimed yield paid in USDT0.

That's the whole product.

## Why it's worth it (no outside money)

| You take your yield as | Evermo fee |
|------------------------|-----------|
| USDT0 (on withdraw) | 10% |
| BEM or OKB (claim) | 8% → 6% → 4% → 2%, set by the circuit |

The discount is paid out of Evermo's own fee. Nothing needs funding.

Example: 1,000 USDT0 at about 3.35% earns about $33.50 a year. Taken as BEM at the lowest fee, that's about $32 of BEM
after the swap, about 3.5 BEM at today's ~$9.20. That pays about 350 mint transactions at 0.01 BEM. Principal untouched.

## Circuit rules (permanent)

Inputs (5 wires): weeks held, 0–7 (3 wires); position size category (2 wires: under $100, $100+, $1,000+, $10,000+).

Outputs (3 wires): `allowed` and a 2-wire fee tier.

- `allowed` = held at least 1 week.
- fee steps down one level for each of: held 2+ weeks, held 4+ weeks, position $1,000+.
- Fee by tier: 8%, 6%, 4%, 2%.

Built with the TapeOut canvas: we export a **BLIF** netlist (the canvas imports BLIF from Yosys/ABC), check it in the
canvas simulator, then tape out on the **official TapeOut processor on X Layer** (the hackathon says we do not need our
own processor). Target: about 30 NAND gates or fewer. The vault calls `eval` on it before every claim.

## One circuit does three jobs

The same Evermo circuit NFT:
1. **holds the rules** (`eval` before every claim),
2. **hosts the app**: its container (ERC-6551) carries the DeWEB site at a `tape://` address,
3. **collects revenue**: Evermo's fees are sent to that container address.

Whoever holds the circuit NFT controls the container. That is the project owner, and it is stated openly.

## Where the yield and BEM come from

- Yield: Aave V3 on X Layer, USDT0 market (largest market, about 3.35%).
- BEM and OKB: swapped at claim time on Uniswap V3 on X Layer: USDT0 → WOKB (0.05% pool, about $145k) → BEM
  (1% pool, about $42k). OKB is paid out by unwrapping WOKB.
- BEM on X Layer is the LayerZero-bridged token `0x60e62efa9405d6873c5deabd4e6cc91c25363952` (8 decimals).
- The user sets a minimum amount out (the app fills it from a live quote) so a claim can't be front-run at a bad price.

## No admin

There is no owner. Fees, the circuit, the Aave market, the swap route and the fee address are fixed at deployment.
Nobody can block a claim, pause withdrawals, change fees or move user funds. If something must change, a new vault is
deployed and users choose whether to move.

## What was removed from earlier versions, and why

| Removed | Why |
|---------|-----|
| Separate credit token | An extra token users must understand and redeem. Claiming straight to BEM/OKB does the same job in one step. |
| Reserve contract, BEM price feed, redemption | Only needed because of credits. A live swap with a minimum-out replaces all three. |
| Fee-sink integration with TapeOut | TapeOut fees are paid by the builder's own wallet. We just deliver BEM/OKB to that wallet. |
| USDC and OKB vaults | One asset is simpler. WOKB earns 0% on Aave. |
| Owner blocklist | Contradicted "permanent rules". |
| Multisig and timelock | Nothing left to administer, so no admin at all is simpler and safer. |
| Separate yield-source and receipt contracts | The vault itself is the receipt token and talks to Aave directly. |
| Own processor | Not required by the hackathon; saves 0.1 BEM. |

## Known limits (stated openly)

- Aave USDT0 is about 85% utilized. A large withdrawal can fail until liquidity returns; the app shows how much can be
  withdrawn right now.
- BEM liquidity on X Layer is small (about $42k). Fine for claim-sized swaps; large claims get worse prices.
- BEM price moves. Users receive BEM at the price when they claim.
- Contracts are unaudited.

## Hackathon rules check

| Rule / criterion | How Evermo meets it |
|------------------|---------------------|
| Use TapeOut circuits, contracts or on-chain data on X Layer, or run on X Layer DeWEB | Circuit `eval` on X Layer, and the app on X Layer DeWEB |
| Circuit projects: processor address + circuit ID | Submitted after tape-out (TBD now) |
| Apps: access link + TapeOut features used | `tape://` link and https gateway link (tapekit.org); features listed |
| Describe product, users, how to reach them, revenue, why users pay and stay | In `docs/SUBMISSION.md` |
| Only work done during the event; no fabricated functionality | Built during the event; the post says what is built and what is planned |
| Judging: user value, innovation, ecosystem integration, readiness/UX, demo video (≤3 min) | Real fee problem; one circuit doing three jobs; circuit + DeWEB + HashPort + TapeKit + BEM; three-button app; video planned |

## Costs to launch (small, one-time)

- Gas on X Layer for deployment (OKB).
- Tape-out: about 30 NAND transistors bought from the official processor, plus the tape-out fee and gas.
- Container: 0.08 OKB.
- Site upload through HashPort: service fee 0, gas only.
No processor creation fee and no subsidy.

## Checks to do at build time

1. Exact `eval` ABI on the X Layer processor and the BLIF/canvas import, by test-calling `eval` before tape-out.
2. Wallet connection inside a DeWEB site (tape:// sites are sandboxed). If blocked, the hackathon allows the interface
   to also run off-chain, so the same files are served from a normal https link too.
3. Aave pool and USDT0 addresses on X Layer, read on-chain.
4. Uniswap V3 router address on X Layer and the two pools above.
5. Official TapeOut processor on X Layer and its NAND price.
