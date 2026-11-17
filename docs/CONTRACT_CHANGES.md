# Planned contract and circuit changes (not implemented)

Each item names the file, the change and the reason. Implementation waits for explicit approval.

## Required by your decisions

| # | Where | Change | Why |
|---|-------|--------|-----|
| 1 | `EvermoVault.sol` | Delete `blocked`, `setBlocked`, `BlockedSet`; drop the eligibility input from `circuitInputs`, `_evaluate`, `previewClaim`. | Owner could deny any claim, contradicting permanent rules. |
| 2 | `CircuitCodec.sol`, `circuit/rules.ts`, `circuit/synth.ts` | New wire layout: 5 inputs (bucket 3, size 2), outputs allowed + bonus tier. Tests updated. | Removes the eligibility wire; defines the multiplier output. |
| 3 | `circuit/synth.ts` | Replace the sum-of-products generator with minimization (Quine-McCluskey/Espresso or ABC/Yosys) and shared logic; fail the build if gates exceed 40. | 362 gates is too expensive; the same rules fit in a few dozen. |
| 4 | `EvermoVault.sol` | Replace `credits = yield * _scale * rate` with USD-face math: `yieldUsd = yield * 1e18 / 10**assetDecimals` (stablecoins only), `credits = yieldUsd * multiplierBps / 10_000`. Remove `_scale` size-normalization tied to asset units; size tiers become USD thresholds. | One credit must be worth the same regardless of source asset. |
| 5 | new `EvermoReserve.sol` | Contract that receives claimed yield and fees, holds stablecoins and BEM, exposes `redeem` support and `coverage()`; vault sends yield here instead of `treasury`. | EOA must never hold claimed yield; enables redemption for BEM. |
| 6 | `EvermoCredit.sol` | Replace `burnForFee`/`ITapeOutFeeSink` as the primary path with `redeem(amount)` (burn then reserve pays BEM). Keep fee-sink hook optional. Renounce ownership after vaults are registered. | BEM redemption is the locked incentive; removes admin minter control. |
| 7 | `EvermoVault.sol` | `treasury` becomes an immutable `reserve`; remove `setTreasury`. Fee caps become constants; fee changes go through the timelock. | Protect the reserve; limit admin powers. |
| 8 | `EvermoVault.sol` | Before minting, require `reserve.coverage()` stays at or above 100% after the mint. | Prevents minting credits that cannot be redeemed. |
| 9 | new `PriceSource` interface + adapter | BEM/USD price for redemption (TWAP or bounded setter) with staleness and deviation bounds; stablecoin depeg check for claims. | USD-normalized credits need a BEM price; stablecoin assumption needs a breaker. |
| 10 | deploy scripts, docs | Ownership via OpenZeppelin `TimelockController` (48h) owned by a multisig; document the final model. | Locked ownership decision. |

## Also recommended

| # | Where | Change | Why |
|---|-------|--------|-----|
| 11 | `EvermoVault.sol`, `AaveV3YieldSource.sol` | `maxWithdrawable()` reading Aave available liquidity; allow partial withdraw instead of reverting. | Aave utilization is 82–85%. |
| 12 | `scripts/deploy.ts`, `frontend/` | Remove OKB/WOKB; add redeem screen and rate/multiplier card; show "verify against on-chain netlist". | Scope and UX match the new design. |
| 13 | `contracts/interfaces/ITapeOutProcessor.sol` | Confirm the `eval` ABI against the deployed processor before tape-out. | Currently an assumption. |
| 14 | tests | Add: reserve coverage invariant, redeem round-trip, multiplier cap, no-owner-block, timelock-only fee changes. | Cover the new behaviour. |

## Order of work after approval

1. Circuit (rules, minimizer, exhaustive tests).
2. Reserve, credit, vault changes with tests.
3. Price source and redemption.
4. Deploy scripts, frontend, ownership setup.
