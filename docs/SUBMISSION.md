# Evermo — submission answers (v4, ready to paste)

X Layer TapeOut Accelerate form: https://forms.gle/EoDNbxQ65dev1wFd9 (deadline 7 December 2026, 23:59 UTC).
TBD fields are filled after tape-out. Matching post: `docs/POST.md`.

## Project name

Evermo

## One-liner

Tape out for free: your yield pays your TapeOut fees. Deposit USDT0 on X Layer, keep your principal, and send the yield as
BEM, OKB or USDT0 to yourself, your project's circuit container, or a builder you back, with fee rules locked forever in a
TapeOut circuit.

## Problem

Building on TapeOut means paying small fees over and over: 0.01 BEM per mint transaction and 0.1 BEM per processor on
newer processors, 0.08 OKB to open a container, and OKB on older processors. Active builders keep topping up their
wallets, which means selling assets they would rather hold. People who want to support builders have no way to do it
without giving money away. Meanwhile stablecoins on X Layer sit idle.

## Product

Evermo is a vault on X Layer:

1. **Deposit** USDT0 and get evUSDT0 1:1. The vault lends the USDT0 on Aave V3 on X Layer (about 3.35% a year today).
2. **Claim** the yield as BEM, OKB or USDT0, sent to any address: your wallet, your circuit's container, or someone else's.
   Before every claim the vault calls `eval` on the Evermo circuit, which returns the fee.
3. **Withdraw** USDT0 at any time, plus any unclaimed yield.
4. **Back a builder:** name a builder who can collect your yield whenever they need it. Your deposit stays yours, and you
   can remove them at any time.

## What makes Evermo different

- Yield arrives as TapeOut fuel (BEM or OKB), with no swapping or bridging.
- Yield can go straight to a circuit container, so a project pays its own fees.
- Supporters can back a builder without giving up their money.
- The fee rules are a taped-out circuit: permanent and readable by anyone.
- No admin key, and the app runs on DeWEB, so the frontend cannot be swapped.

## Why users pay and come back

- Their deposit stays theirs; only the yield is used.
- The fee drops the longer they stay: from 10% down to as low as 3% (−1% every 2 weeks up to −3%, −1% or −2% for larger
  positions, −2% when paid in BEM). Leaving resets it.
- Builders keep their supporters, and supporters keep backing builders, because nobody loses their deposit.
- Nobody can block a claim, pause withdrawals or change fees.

## Target users and how we reach them

- TapeOut builders who mint, tape out and deploy sites often: TapeOut and X Layer communities, TapeTape, TapeOut idea
  scouts.
- Their supporters and communities: builders invite them, because supporters' yield pays the builder's fees. Every builder
  who joins brings their own audience.
- Stablecoin holders on X Layer who want their yield to be useful: X Layer community channels.

## Revenue model

Evermo keeps 3–10% of the yield it produces, set by the circuit (10% on withdrawals). Fees go to the Evermo circuit's own
container. No token sale, no subsidies, nothing that needs outside money. Revenue grows with deposits.

## TapeOut features used

- **Circuit on X Layer:** the Evermo fee rules are a NAND circuit taped out on the official TapeOut processor; the vault
  calls `eval` before every claim. Processor address: TBD. Circuit ID: TBD.
- **Circuit containers (ERC-6551):** the Evermo circuit's container hosts the app and receives fees; users can send yield
  to their own project's container.
- **DeWEB + HashPort:** the whole app is a static site uploaded through HashPort and opened via `tape://`.
  DeWEB link: TBD.
- **TapeKit:** the site is verified byte-by-byte against the chain when opened (also via the tapekit.org gateway).
- **BEM:** users receive bridged BEM on X Layer to pay TapeOut fees.

## Circuit inputs and outputs

Inputs (6 wires): weeks held 0–7 (3), position size category (2), paid in BEM (1).
Output (4 wires): the fee in whole percent.
Rule: fee = 10 − min(3, weeks ÷ 2) − size step (0, 1 or 2) − 2 if paid in BEM. Range 3–10%. About 40 NAND gates.

## Status

New project for this event. An early prototype (vault, rule circuit generator, tests, frontend) is in the repository.
Next: the version described here, tape-out, DeWEB deployment and a demo video.
