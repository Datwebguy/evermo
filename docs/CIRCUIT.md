# Evermo — Circuits

## 1. Agent identity circuits

Each agent is its own circuit NFT on X Layer, taped out as small as possible (a single NAND is enough), so that it has a
container (ERC-6551). The container holds the agent's site (DeWEB), inbox (TapeSend) and budget. Whoever holds the
circuit NFT owns the agent.

## 2. Budget circuit (planned)

Every payment from an agent's budget goes through the budget contract, which calls `eval(uint256 id, bytes inputs)`
(TAP-02; inputs and outputs are packed bits, least significant bit first) on chain before any money moves. If the circuit
says no, the transaction reverts. Measured on X Layer: about 48,000 gas per call (see `VERIFICATION.md`).

| Input | Meaning |
|-------|---------|
| `permission_valid` | The current owner's TAP-11 delegation exists, is not revoked and has not expired |
| `service_allowed` | The payee is on the owner's allowed list |
| `over_single_limit` | The amount is above the owner's per-payment limit |
| `over_daily_limit` | Today's total would pass the owner's daily limit |

Output: `allow` = `permission_valid AND service_allowed AND NOT over_single_limit AND NOT over_daily_limit`.

## 3. Resale circuit (planned)

The marketplace contract calls it on every sale before splitting the payment.

| Input | Meaning |
|-------|---------|
| `seller_is_holder` | The seller currently holds the agent's circuit NFT |
| `listing_valid` | The listing exists and has not expired or been cancelled |
| `first_sale` | This is the agent's first sale (maker sale) |

Outputs: `allow` (seller is holder and listing is valid) and `royalty_on` (resale, so the maker royalty applies). The
contract splits each payment at once between seller, maker and Evermo and keeps no balance.

Both circuits are a few dozen NAND gates at most. Gate counts, processor address and circuit IDs are added after
tape-out.

## Verification

- Every input combination is tested against the rules above before tape-out.
- After tape-out, anyone can call `eval` and `netlist(circuitId)` for free to check the rules.
