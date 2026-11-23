# Evermo — claims and evidence

Status: **planned** (not built), **built** (evidence in repo), **live** (evidence on X Layer mainnet).
Nothing is marked built or live without evidence.

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each agent is a TapeOut circuit NFT with its own container; whoever holds it owns the agent | built | `service/scripts/e2e-fork.ts` (19/19 pass on a mainnet fork of X Layer) |
| 2 | Agent tools are pinned by hash in the agent's manifest and a change is refused | built | `service/test/vectors.test.ts` (official TAP-15 vectors); the app checks the served tools against the pinned hash and will not run an agent whose tools changed (`app/src/screens/Agent.tsx`) |
| 3 | Payments from an agent's budget only go through if the budget circuit allows them (`eval` on chain) | built | `contracts/test/evermo.test.ts` (passes on a mainnet fork of X Layer) |
| 4 | Every answer is signed and comes with a usage receipt | built | `service/test/vectors.test.ts` (official TAP-13 and TAP-17 vectors); `service/scripts/live-check.ts` (real NEAR AI call, receipt verifies) |
| 5 | The owner's operator permission stops working when the agent changes hands | built | `contracts/test/evermo.test.ts`; `service/scripts/e2e-fork.ts` (19/19 pass on a mainnet fork of X Layer) |
| 6 | Results are delivered encrypted over TapeSend to the agent's container | built | `service/test/tapesend.test.ts`; `service/scripts/e2e-fork.ts` (19/19 pass on a mainnet fork of X Layer) |
| 7 | A resale circuit checks each sale; seller, builder royalty and Evermo fee are paid in the same transaction | built | `contracts/test/evermo.test.ts` (passes on a mainnet fork of X Layer) |
| 8 | Work, payments and sales are recorded on chain per agent as its track record | built | `contracts/test/evermo.test.ts`; `service/scripts/e2e-fork.ts` (19/19 pass on a mainnet fork of X Layer) |
| 9 | Agents running on other platforms can be registered and sold | built | `contracts/test/evermo.test.ts`; `service/src/verify.ts` checks the outside agent's description, container, current owner's approval and pinned tools before listing (`service/test/verify.test.ts`) |
| 10 | Agents can be paid for in BEM or USDT0; half of the fee on BEM sales goes to the burn address | built (sales) | `contracts/test/evermo.test.ts` (passes on a mainnet fork of X Layer) |
| 11 | Wallets connect with OKX Connect; agents can pay for services over x402 from their budget | partly built | The app finds OKX Wallet first among browser wallets (`app/src/chain/wallet.ts`); not yet tested with a real OKX Wallet. OKX Connect for phones and x402 are planned |
| 12 | Agent pages show the circuits' inputs and decisions live | built | The real netlist is read from the processor and evaluated with each decision's inputs (`app/src/ui/CircuitView.tsx`); `app/scripts/ui-check.mjs` (11/11 in a real browser on a mainnet fork of X Layer, phone and desktop, English and Chinese, light and dark) |
| 13 | Browsing, track records and demo agents work without a wallet | built | `app/scripts/ui-check.mjs` (11/11 in a real browser on a mainnet fork of X Layer, phone and desktop, English and Chinese, light and dark) (visitor gets a signed answer with no wallet) |
| 14 | Demo agent "Position Watch" alerts on lending health on X Layer | built | `service/scripts/e2e-fork.ts` (19/19 pass on a mainnet fork of X Layer) (real Aave borrower); `service/scripts/live-check.ts` |
| 15 | Demo agent "Token Risk Check" reports on a token's contract, owner controls, liquidity and trading on X Layer | built | `service/scripts/live-check.ts` (live X Layer and GeckoTerminal data). Holder counts are shown only when the data source has them; for X Layer tokens it currently does not |
| 16 | The owner can stop an agent at once; every payment is then refused by the budget circuit | built | `app/src/flows/Manage.tsx` (Stop); `app/scripts/ui-check.mjs` (after stopping, a paid run is refused on chain) |
| 17 | The app is in English and Chinese, with light and dark modes and a guided tour | built | `app/src/i18n/`, `app/src/ui/Tour.tsx`; `app/scripts/ui-check.mjs` (no English left on Chinese screens; tour lights each feature on phone and desktop) |
