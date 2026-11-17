# Planned code changes for design v4 (not implemented)

Implementation waits for an explicit go-ahead. Rationale for each removal is in `docs/DESIGN.md`.

## Contracts

| Action | File | Change |
|--------|------|--------|
| Rewrite | `contracts/EvermoVault.sol` | Single USDT0 vault that **is** the ERC-20 receipt (evUSDT0). Supplies to Aave V3 directly. Keeps per-share yield accounting and holding-time tracking. Adds `claim(Out out, uint256 minOut, address to)` (USDT0, BEM or OKB, to any address), `setBuilder(address)` and `claimFor(address depositor, Out out, uint256 minOut)` (only the named builder, yield only, paid to the builder), and `maxWithdraw()` (Aave available liquidity). Claim fee comes from `eval`; withdraw uses a fixed 10%. No owner. All settings immutable. |
| Keep, update | `contracts/libraries/CircuitCodec.sol` | 6 input wires (weeks 3, size 2, BEM 1), 4 output wires (fee %). No fee table in the vault. |
| Keep | `contracts/interfaces/ITapeOutProcessor.sol` | Confirm ABI on X Layer before tape-out. |
| Add | `contracts/interfaces/IAaveV3Pool.sol`, `ISwapRouter.sol`, `IWETH.sol` | Minimal interfaces for Aave, Uniswap V3 `exactInput`, WOKB unwrap. |
| Delete | `contracts/tokens/EvermoCredit.sol`, `contracts/tokens/ReceiptToken.sol` | Credits removed; the vault is the receipt. |
| Delete | `contracts/yield/AaveV3YieldSource.sol`, `contracts/interfaces/IYieldSource.sol`, `IEvermoVault.sol`, `ITapeOutFeeSink.sol` | Folded into the vault or no longer needed. |
| Update | `contracts/mocks/*` | Add mock Aave pool, mock swap router, mock WOKB; keep `MockProcessor` (runs the real netlist). Remove `MockFeeSink`, `MockYieldSource`. |

## Circuit

| Action | File | Change |
|--------|------|--------|
| Rewrite | `circuit/rules.ts` | `fee = 10 − min(3, weeks/2) − size − (BEM ? 2 : 0)`. |
| Rewrite | `circuit/synth.ts` | Minimized two-level logic with shared terms; build fails above 40 gates. |
| Add | `circuit/build.ts` output | Also write `evermo-rules.blif` for import into the TapeOut canvas, alongside the JSON used by tests. |
| Keep | `circuit/circuit.test.ts` | Exhaustive check of all 64 input rows. |

## Tests

Deposit/receipt, yield follows transfers, no late-depositor capture, circuit fee for every input, claim to USDT0, BEM and
OKB with min-out and to another address, back-a-builder collect and remove, loyalty reset on transfer, withdraw with unclaimed yield at 10% fee, `maxWithdraw` when Aave is short, no owner
functions exist.

## Frontend

One page: Deposit, Claim (USDT0/BEM/OKB, send-to address, your fee now and when it next drops, live quote), Withdraw
(max available now), Back a builder (set or remove). One static bundle with no external links, so it qualifies for the "100% on-chain" mark. Uploaded through
HashPort to the Evermo circuit's container; also served from an https link as a fallback.

## Deploy scripts

One script: deploy the vault with fixed addresses (Aave pool, USDT0, router, WOKB, BEM, processor, circuit ID, fee
container). Nothing to configure afterwards.

## Order of work after approval

1. Circuit: rules, BLIF, canvas check, `eval` test-call on X Layer.
2. Vault and tests.
3. Frontend and HashPort upload.
4. Tape-out, container, deploy, demo video.
