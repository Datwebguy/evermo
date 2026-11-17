# Evermo — submission draft (v2)

Draft answers for the X Layer TapeOut Accelerate form (https://forms.gle/EoDNbxQ65dev1wFd9).
Deadline: 7 December 2026, 23:59 UTC. Fields marked TBD are filled after tape-out.

## One-liner

Tape out for free: your yield pays your TapeOut fees. Deposit USDT0 or USDC on X Layer, keep your principal, and turn the
yield into credits redeemable for BEM, under claim rules frozen forever in a TapeOut circuit.

## Product

Evermo is a vault on X Layer (chain ID 196). Users deposit USDT0 or USDC and receive a liquid 1:1 receipt token that stays
transferable. The vault supplies the assets to Aave V3 on X Layer; yield accrues to receipt holders.

To use the yield, a user claims. The vault calls `eval` on the Evermo rule circuit, a permanent NAND netlist taped out on X
Layer, with holding time and position size. The circuit returns whether the claim is allowed and a bonus tier. The vault
mints Evermo credits denominated in USD (1 credit = $1 of face value), so a credit is worth the same whatever asset earned
it. Credits are transferable and redeemable for BEM from a reserve contract, so users can pay TapeOut fees (0.1 BEM to
create a processor, 0.01 BEM per mint transaction on newer processors) without selling principal. Processors created before
Nov 8 still charge native OKB; those fees are paid in OKB. Users can withdraw principal and any unclaimed yield at any time.

## Target users

- TapeOut builders who need recurring BEM and OKB for processors, transistor minting, containers and DeWEB uploads, and do not
  want to spend principal.
- USDT0 and USDC holders on X Layer who want their yield to fund TapeOut activity.
- Users who value rules nobody can change: the circuit is permanent and `netlist(circuitId)` is public.

## Why users pay and return

- Principal stays liquid and intact; only yield is used.
- Credits convert passive stablecoin yield into a BEM fee budget without swapping or bridging.
- The circuit gives a better multiplier for longer holding and larger positions, so staying longer pays more.
- Everything is verifiable: `eval`, `netlist(circuitId)` and the DeWEB frontend (byte-by-byte).

## Revenue model

- Performance share of vault yield (initially 10%, hard-capped in the contract).
- Small fee on credit claims.
- Small fee on credit redemptions to BEM.
- Reserve spread on stablecoin-to-BEM conversion, if any, disclosed in the interface.

## TapeOut usage

- **Circuit:** the rule circuit decides claim eligibility and bonus tier; the vault calls `eval` before every credit mint.
- **Processor address:** TBD.
- **Circuit ID:** TBD.
- **DeWEB:** deposit, claim, redeem and withdraw screens stored in a circuit container, opened via tape://. Link: TBD.
- **Fees and BEM:** credits redeem for BEM, which pays TapeOut fees on new processors; native OKB on legacy processors is documented.

## Circuit inputs and outputs

Inputs: holding-time bucket (3 wires), position size category (2 wires).
Outputs: claim allowed (1 wire), bonus tier (up to 3 wires).
Rule: allowed once the position has been held for one bucket; bonus rises with holding time and size and is capped.
Exact table: TBD, published with the tape-out.

## Governance and trust

The circuit, processor and reserve address are immutable in the vault. The credit token's minters are fixed at deployment
and ownership is renounced. Remaining parameters sit behind a 48h timelock controlled by a multisig. Claims and withdrawals
cannot be paused.

## Status and what is new

New project built for the event. Vault, tokens, a first rule circuit, tests and a frontend exist in the repository as a
first version; the design above is being implemented next. Tape-out, deployment and the BEM redemption path are pending.
