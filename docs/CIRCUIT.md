# Evermo — Circuits

## 1. Agent identity circuits

Each agent is its own circuit NFT on X Layer, taped out as small as possible (a single NAND is enough), so that it has a
container (ERC-6551). The container holds the agent's site (DeWEB), inbox (TapeSend) and budget. Whoever holds the
circuit NFT owns the agent.

## 2. Shared rules circuit (planned)

Every agent action is checked before it runs. The runtime (and, for money actions later, a contract) passes the facts as
input wires and calls `eval(uint256 id, bytes inputs)` (TAP-02; inputs and outputs are packed bits). Every signed answer
carries the inputs and the result, so anyone can re-run `eval` and confirm the decision. Calling `eval` on a small circuit
from a transaction costs about 54,000–67,000 gas on X Layer (measured, see `VERIFICATION.md`).

Inputs (1 wire each):

| Wire | Meaning |
|------|---------|
| `permission_valid` | The current owner's TAP-11 delegation exists, is not revoked and has not expired |
| `target_allowed` | The protocol or address the action touches is on the owner's allowed list |
| `is_spend` | The action moves money |
| `over_single_limit` | The amount is above the owner's per-action limit |
| `over_daily_limit` | Today's total would pass the owner's daily limit |

Outputs:

| Wire | Meaning |
|------|---------|
| `allow` | The action may run now |
| `needs_confirm` | The action may run only after the owner confirms |

Rules:
- No valid permission or target not allowed → `allow = 0`, `needs_confirm = 0`.
- Read/alert action → `allow = 1`.
- Spend within both limits → `allow = 1`.
- Spend over either limit → `allow = 0`, `needs_confirm = 1`.

Five inputs, two outputs: a few dozen NAND gates at most. Exact gate count, processor address and circuit ID are added
after tape-out.

## Verification

- Every input combination (32 rows) is tested against the rules above before tape-out.
- After tape-out, anyone can call `eval` and `netlist(circuitId)` for free to check the rules.
