> **Superseded in part:** this describes the v1 circuit (6 inputs incl. eligibility, 362 gates). The planned v3 circuit
> (5 inputs, allowed + fee tier, about 30 gates, BLIF for the canvas) is in `docs/DESIGN.md`.

# Evermo rule circuit — wire specification

The circuit is combinational (NAND only, no LATCH). The reference rules live in
`circuit/rules.ts`; `circuit/synth.ts` synthesizes a NAND netlist from them and
`circuit/build.ts` writes it to `circuit/netlist/evermo-rules.netlist.json`.

## Inputs (6 wires, bit 0 first within each field)

| Wires | Field | Meaning |
|-------|-------|---------|
| 0–2 | duration bucket (0–7) | `min(7, (now - holdingSince) / bucketSeconds)` |
| 3 | eligible | 1 unless the account is blocked by the vault owner |
| 4–5 | size category (0–3) | position size against the vault's three thresholds |

## Outputs (5 wires)

| Wires | Field | Meaning |
|-------|-------|---------|
| 0–3 | rate tier (0–15) | credit rate = `tier / 15` of the claimed yield |
| 4 | allowed | 1 if the claim may proceed |

## Rules

- `allowed = eligible AND bucket >= 1`
- `tier = allowed ? min(15, 6 + bucket + 2 * size) : 0`

## Verification

`npm run circuit:test` checks the netlist against the reference rules on all 64 inputs.
After tape-out, compare `netlist(circuitId)` from the processor with the JSON file.

## Open items before tape-out

- The netlist JSON is a neutral format (`gates[i] = [a, b]`, gate `i` drives wire
  `numInputs + i`). It must be converted to the TapeOut editor/import format.
- `contracts/interfaces/ITapeOutProcessor.sol` assumes `eval(uint256, uint256[]) -> uint256[]`
  with 0/1 words. Confirm against the deployed processor ABI.
