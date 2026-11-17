# Evermo — submission answers (v3, ready to paste)

X Layer TapeOut Accelerate form: https://forms.gle/EoDNbxQ65dev1wFd9 (deadline 7 December 2026, 23:59 UTC).
TBD fields are filled after tape-out. Matching post: `docs/POST.md`.

## Project name

Evermo

## One-liner

Tape out for free: your yield pays your TapeOut fees. Deposit USDT0 on X Layer, keep your principal, and take your yield as
BEM or OKB, with fee rules locked forever in a TapeOut circuit.

## Problem

Building on TapeOut means paying small fees over and over: 0.01 BEM per mint transaction and 0.1 BEM per processor on
newer processors, 0.08 OKB to open a container, and OKB on older processors. Active builders keep topping up their
wallets, which means selling assets they would rather hold. Meanwhile stablecoins on X Layer sit idle.

## Product

Evermo is a vault on X Layer with three actions:

1. **Deposit** USDT0 and get evUSDT0 1:1. The vault lends the USDT0 on Aave V3 on X Layer (about 3.35% a year today).
2. **Claim** your yield as BEM or OKB, ready to pay TapeOut fees. Before every claim the vault calls `eval` on the
   Evermo circuit, which decides whether you can claim and what fee you pay.
3. **Withdraw** your USDT0 at any time, plus any unclaimed yield.

## Why users choose it, pay, and come back

- Their deposit stays theirs; only the yield is used.
- Taking yield as BEM/OKB costs less than taking it as cash: 10% fee for cash, 8% down to 2% for BEM/OKB.
- The fee drops the longer they stay (2+ weeks, 4+ weeks) and for positions of $1,000+, so staying pays.
- The rules are permanent: the circuit cannot be changed by anyone, and anyone can read it for free.
- There is no admin: nobody can block a claim, pause withdrawals or change fees.

## Target users and how we reach them

- TapeOut builders who mint, tape out and deploy sites often: reached in the TapeOut and X Layer communities, TapeTape,
  and the TapeOut idea scouts.
- Stablecoin holders on X Layer who want their yield to be useful: reached through X Layer community channels.

## Revenue model

Evermo keeps a share of the yield it produces: 10% when yield is taken as USDT0, 2–8% when taken as BEM or OKB. Fees go
to the Evermo circuit's own container. No token sale, no subsidies, nothing that needs outside money.

## TapeOut features used

- **Circuit on X Layer:** the Evermo fee rules are a NAND circuit taped out on the official TapeOut processor; the vault
  calls `eval` before every claim. Processor address: TBD. Circuit ID: TBD.
- **Circuit container (ERC-6551):** the same circuit's container hosts the app and receives Evermo's fees.
- **DeWEB + HashPort:** the whole app is a static site uploaded through HashPort and opened via `tape://` (and the
  tapekit.org gateway). DeWEB link: TBD.
- **TapeKit:** the site is verified byte-by-byte against the chain when opened.
- **BEM:** users receive bridged BEM on X Layer to pay TapeOut fees.

## Circuit inputs and outputs

Inputs (5 wires): weeks held 0–7 (3), position size category (2).
Outputs (3 wires): claim allowed (1), fee tier (2).
Rules: claim allowed after 1 week; the fee steps down for 2+ weeks, 4+ weeks, and $1,000+; tiers are 8%, 6%, 4%, 2%.
About 30 NAND gates.

## Status

New project for this event. An early prototype (vault, rule circuit generator, tests, frontend) is in the repository.
Next: the simplified version described here, tape-out, DeWEB deployment and a demo video.
