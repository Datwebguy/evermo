# Evermo — submission draft (v3, ready to paste)

X Layer TapeOut Accelerate form: https://forms.gle/EoDNbxQ65dev1wFd9 (deadline 7 December 2026, 23:59 UTC).
Fields marked TBD are filled after tape-out. Matching social post: `docs/POST.md`.

## One-liner

Tape out for free: your yield pays your TapeOut fees. Deposit stablecoins on X Layer, keep your principal, and turn the
yield into credits you can redeem for BEM to pay TapeOut fees, under rules locked in a TapeOut circuit.

## Problem

Building on TapeOut means paying fees again and again: 0.1 BEM to create a processor and 0.01 BEM per mint transaction on
newer processors, and OKB for containers, uploads and older processors. Active builders keep topping up their wallets and
selling assets to do it. Meanwhile stablecoins on X Layer sit idle.

## Product

Evermo is a vault on X Layer (chain ID 196).

1. **Deposit:** users deposit USDT0 or USDC and receive a 1:1 receipt token they can hold or transfer.
2. **Earn:** the vault lends the deposit on Aave on X Layer (about 3% a year today). Yield builds up on the receipt.
3. **Claim:** the vault calls `eval` on the Evermo rule circuit, taped out on TapeOut. The circuit decides if the claim is
   allowed and what bonus applies. The vault mints credits; 1 credit = $1, whichever stablecoin earned it.
4. **Redeem:** credits are swapped for BEM from Evermo's reserve contract and used to pay TapeOut fees.
5. **Withdraw:** users can take back their full deposit at any time, plus any unclaimed yield.

## Why credits beat cash

Yield withdrawn as cash pays Evermo's full 10% fee. Yield taken as credits gets part of that fee back as a bonus (up to
about 7% more), with longer holding and larger positions earning more. The bonus comes from Evermo's own fee: no outside
money and no subsidy is needed.

Example: 1,000 USDT0 at about 3.3% earns about $33 a year, or about $31-32 of BEM as credits (about 3 BEM at today's
price). That covers a new processor and a few hundred mint transactions, and the 1,000 USDT0 is untouched.

## Target users

- TapeOut builders who create processors, mint, tape out and deploy DeWEB sites often.
- Stablecoin holders on X Layer who want their yield to go toward TapeOut.
- Anyone who wants rules they can verify instead of promises.

## Why users pay and return

- Their deposit stays theirs; only yield is used.
- Credits are worth more than cash yield when spent on TapeOut.
- The rate improves the longer they hold, so staying pays.
- The rules are permanent and public.

## Revenue model

- 10% share of vault yield (hard-capped in the contract).
- Small fee on claims and on redemptions to BEM.
- Self-sustaining: nothing depends on outside funding.

## TapeOut features used

- **Circuit:** the Evermo rule circuit decides claim eligibility and bonus; the vault calls `eval` before every credit mint.
  Rules cannot be changed after tape-out, and anyone can read `netlist(circuitId)`.
- **BEM:** credits redeem for BEM, which pays fees on new processors (0.1 BEM creation, 0.01 BEM per mint). Older
  processors that still charge OKB are supported by redeeming and paying in OKB.
- **DeWEB:** the full interface lives in a circuit container, opened via tape://, verifiable byte-by-byte.
- **Processor address:** TBD
- **Circuit ID:** TBD
- **DeWEB link:** TBD

## Circuit inputs and outputs

Inputs: how long the position has been held (3 wires) and position size (2 wires).
Outputs: claim allowed (1 wire) and bonus tier (up to 3 wires).
Rule: a claim is allowed once the position has been held for the minimum time; the bonus rises with holding time and size
and is capped so it never costs more than Evermo earns. Target size: about 40 NAND gates.

## Trust and safety

- No admin can block a claim.
- Claimed yield goes to a reserve contract, never a personal wallet.
- Circuit, processor and reserve are fixed in the vault; remaining settings sit behind a multisig and a 48-hour timelock.
- Claims and withdrawals cannot be paused.

## Status

New project for this event. An early prototype (vault, tokens, a first rule circuit, tests and frontend) exists in the
repository. The final version, tape-out and deployment are next.
