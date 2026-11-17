# Evermo — submission draft

Draft answers for the X Layer TapeOut Accelerate form (https://forms.gle/EoDNbxQ65dev1wFd9).
Deadline: 7 December 2026, 23:59 UTC.

## One-liner

Evermo lets TapeOut builders tape out for free: deposit stablecoins on X Layer, keep your principal, and let the yield
mint credits that pay TapeOut protocol fees, under claim rules frozen forever in a TapeOut circuit.

## Product

Evermo is a vault on X Layer (chain ID 196). Users deposit USDT0 or USDC and receive a liquid 1:1 receipt token that
stays transferable and tradable. The vault supplies the assets to Aave V3 on X Layer. The yield accrues to receipt holders.

To turn yield into credits, a user calls `claim`. The vault calls `eval` on the Evermo rule circuit, a permanent NAND
netlist taped out on X Layer. The inputs are holding time, an eligibility flag and position size. The outputs are a
claim-allowed flag and a credit rate. The vault mints Evermo credits at that rate. Credits are transferable and can be
burned to pay TapeOut protocol fees (processor creation, transistor minting, DeWEB uploads). Users can withdraw
principal and any remaining yield at any time.

## Target users

- TapeOut builders who need recurring fee budget for tape-outs, transistors and DeWEB uploads, and do not want to
  spend principal.
- Holders of USDT0 or USDC on X Layer who want their yield to go toward TapeOut activity.
- Users who value rules that cannot be changed: the circuit is permanent and anyone can read it.

## Why users pay and return

- Principal stays liquid and intact; only the yield is used.
- Credits turn passive yield into a TapeOut fee budget without swaps or bridging.
- Rewards grow with holding time and position size, so returning and staying longer pays more.
- Rules are verifiable: `eval` and `netlist(circuitId)` are public, and the frontend can be checked byte-by-byte on DeWEB.

## Revenue model

- Performance share of vault yield (up to 20%, initially 10%).
- Fee on credit claims (initially 2%).
- Fee when credits are burned for protocol actions (planned).

## TapeOut usage

- **Circuit:** the Evermo rule circuit decides claim eligibility and credit rate; the vault calls `eval` before every mint.
- **Processor and circuit ID:** to be added after tape-out (processor address: TBD, circuit ID: TBD).
- **DeWEB:** the full interface (deposit, claim, burn, withdraw) is stored in a circuit container and opened via tape://.
- **Protocol fees:** credits are burned to pay processor creation, transistor minting and DeWEB upload fees.

## Circuit inputs and outputs

Inputs (6 wires): holding-time bucket (3), eligible (1), position size category (2).
Outputs (5 wires): credit-rate tier 0-15 (4), claim allowed (1).
Rule: allowed = eligible AND holding time >= 1 bucket; tier = min(15, 6 + bucket + 2*size).

## Status and what is new

This is a new project built for the event. A working vault, tokens, rule circuit netlist, tests and frontend exist in the
repository. Tape-out, deployment and the final fee-payment integration are pending.

## Before submitting

- Confirm the TapeOut fee-payment path on X Layer and update "TapeOut usage".
- Decide the credit incentive (see docs/REVIEW.md, upgrade 2) and update "Why users pay and return".
- Add processor address, circuit ID and the DeWEB link once available.
