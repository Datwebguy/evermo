# Evermo — Circuits

All circuits follow TAP-02: signals 0 and 1 are constants, inputs start at signal 2, outputs are the last `nOut` signals,
and inputs and outputs are packed least significant bit first. Contracts call `eval(uint256 id, bytes inputs)` on chain.
Measured on an X Layer mainnet fork: about 48,000 gas per call.

## 1. Agent identity circuits

Each agent is its own circuit NFT, taped out as small as possible, so that it has a container (ERC-6551) for its site,
inbox and budget. Whoever holds the circuit owns the agent.

## 2. Budget circuit

Called by `AgentBudget` before every payment. If `allow` is 0 the payment reverts.

| Bit | Input | Meaning |
|-----|-------|---------|
| 0 | `permission_valid` | The operator's permission was set by the current holder and has not ended |
| 1 | `payee_allowed` | The payee is on the owner's allowed list |
| 2 | `over_payment_limit` | The amount is above the owner's per-payment limit |
| 3 | `over_daily_limit` | Today's total would pass the owner's daily limit |

| Bit | Output | Rule |
|-----|--------|------|
| 0 | `allow` | `permission_valid AND payee_allowed AND NOT over_payment_limit AND NOT over_daily_limit` |

## 3. Resale circuit

Called by `EvermoMarket` on every purchase.

| Bit | Input | Meaning |
|-----|-------|---------|
| 0 | `listing_active` | The listing exists, is not cancelled and has not expired |
| 1 | `escrow_holds_agent` | The market contract holds the agent being sold |
| 2 | `price_paid` | The buyer paid the full listed price in the listed token |
| 3 | `first_sale` | The agent has never been sold on Evermo |

| Bit | Output | Rule |
|-----|--------|------|
| 0 | `allow` | `listing_active AND escrow_holds_agent AND price_paid` |
| 1 | `royalty_on` | `allow AND NOT first_sale` |

## Verification

- Every input combination is checked against the rules above by a TAP-02 evaluator before tape-out.
- The same tests run against the taped-out circuits on a mainnet fork.
- After tape-out, anyone can call `eval` and `netlist(circuitId)` for free.
- Processor address and circuit IDs are added here after mainnet tape-out.
