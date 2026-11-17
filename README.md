# Evermo

Evermo is a vault on X Layer. Users deposit stablecoins or OKB and receive a liquid receipt token.
Yield from the deposit is issued as transferable credits. A permanent TapeOut circuit locks the
rules that decide who can claim the credits and how much they get. The credits can be burned to pay
TapeOut protocol fees. The interface is hosted on DeWEB.

## Layout

| Path | Contents |
|------|----------|
| `contracts/` | `EvermoVault`, `ReceiptToken`, `EvermoCredit`, Aave V3 yield source, interfaces, test mocks |
| `circuit/` | Rule definition, NAND synthesizer, generated netlist, exhaustive tests |
| `frontend/` | Deposit / claim / burn / withdraw UI (Vite, ethers) built for a DeWEB container |
| `test/` | Hardhat tests (vault runs against the real synthesized netlist) |
| `scripts/deploy.ts` | Deployment for X Layer (chain ID 196) |
| `docs/` | Product, project, circuit and resource notes, plus `REVIEW.md`, `DESIGN.md` (v3 plan), `CONTRACT_CHANGES.md` and `SUBMISSION.md` |

## How it works

1. `deposit` places the asset in the yield source and mints a 1:1 receipt (`evUSDC`, …).
2. Yield accrues per receipt token (and follows transfers); the performance fee goes to the treasury.
3. `claim` calls `eval` on the TapeOut circuit with holding time, eligibility and size. If allowed,
   the claimed yield moves to the treasury as backing and credits are minted at the circuit's rate.
4. `EvermoCredit.burnForFee` burns credits and notifies a fee sink that settles TapeOut fees.
5. `withdraw` returns principal plus any unclaimed yield.

## Commands

```sh
npm install
npm run circuit:build   # regenerate circuit/netlist
npm run circuit:test
npm test                # Hardhat tests
npm run frontend:build  # static bundle in dist/
npm run deploy -- --network xlayer
```

## Status and open items

The code is a v1 prototype. The current plan is the simplified v3 in `docs/DESIGN.md`, with the code changes in
`docs/CONTRACT_CHANGES.md`; implementation is on hold until approved.

- Not yet taped out or deployed. Processor address and circuit ID are still needed.
- Assumed `eval` ABI and the fee-sink settlement path need confirming against TapeOut
  (see `docs/CIRCUIT_SPEC.md`).
- Aave V3 pool / aToken addresses on X Layer are deploy-time inputs and unverified.
- Contracts are unaudited.

## Hackathon

X Layer TapeOut Accelerate — https://web3.okx.com/xlayer/build-x-series
Deadline: 7 December 2026, 23:59 UTC.

MIT licensed.
