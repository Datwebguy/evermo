# Evermo — design (v2, planned, not yet implemented)

Status: **plan only.** The code in `contracts/` still reflects v1. Nothing changes until the go-ahead is given.
Decisions below are locked from external verification; see `docs/CONTRACT_CHANGES.md` for the code changes.

## Pitch

**Tape out for free: your yield pays your TapeOut fees.** Aimed at TapeOut builders. The claim rules live in a
TapeOut circuit, so nobody, including the team, can change them later.

## Locked facts

- Aave X Layer: WOKB 0% APY. USDT0 about 3.35% at about 85% utilization; USDC about 3.10% at about 82%. Large withdrawals can fail.
- TapeOut fees (Nov 2026): processors created before Nov 8 still charge native OKB on X Layer. Processors created after
  Nov 8 charge 0.1 BEM to create and 0.01 BEM per mint transaction. Tape-out and container fees are migrating to BEM but
  are not fully switched; opening a container on X Layer was about 0.08 OKB.
- BEM trades at about $9–10.

## Scope

- Assets: **USDT0 and USDC only.** OKB/WOKB is dropped (no yield).
- One vault per asset, one shared credit token, one reserve contract.

## Credit model

- Credits are **USD-denominated**: 1 credit (18 decimals) = $1 of face value. Stablecoin yield is normalized at 1 USD per
  unit, a documented assumption with a depeg circuit-breaker (claims pause if a stablecoin deviates beyond a set bound
  per an on-chain price check). No "1 credit per asset unit" anywhere.
- **Primary benefit: credits redeem for BEM.** `redeem(credits)` burns credits and pays BEM from the reserve at face value,
  priced in USD per BEM. The user then pays TapeOut fees themselves. This works for any processor that charges BEM and
  needs no TapeOut-side integration.
- **Circuit multiplier.** The circuit outputs a bonus tier; credits minted = net yield (USD) x multiplier, where the
  multiplier is 1.00x plus the tier bonus. The circuit decides who gets a better multiplier (longer holding time, bigger
  position). The tier-to-bonus table is an immutable constant in the vault.
- Legacy processors that still take native OKB: documented, not integrated. A user can sell redeemed BEM or use claimed
  value for OKB; an optional later redeem-to-OKB path is possible if the reserve holds OKB.

## Is the incentive real? (economics)

Redeeming at 1:1 face value is convenience (BEM on X Layer without trading or bridging), not surplus. Surplus requires a
multiplier above 1.0x, and that has a cost:

| Multiplier | Credits per $1.00 gross yield (after 10% performance fee) | Funded by |
|-----------|--------------------------------|-----------|
| 1.00x | $0.90 | self-funded, protocol keeps 10% |
| 1.07x | $0.96 | self-funded ceiling, about 4% protocol revenue |
| 1.20x | $1.08 | needs subsidy: about 8% of gross yield |
| 1.50x | $1.35 | needs subsidy: about 35% of gross yield |

At $1M TVL and about 3.3% APY, gross yield is about $33k/yr, so subsidy is about $2.6k/yr at 1.20x and about $11.6k/yr at
1.50x. **Decision:** the circuit's bonus is capped at the self-funded ceiling (about 1.07x). There is no subsidy and no outside
funding. Credits can only be minted while the reserve coverage check passes.

## Reserve

`EvermoReserve` (a contract) receives claimed yield and the performance fee. It holds stablecoins and BEM, pays redemptions,
and enforces a coverage check: outstanding credit face value must not exceed reserve value. Claims that would break
coverage revert. No EOA ever holds claimed yield.

Stablecoin to BEM conversion happens on a DEX or by manual purchase and bridge from BNB. BEM is bridged to X Layer 1:1
via LayerZero and is mined only on BNB. **Open item: confirm a BEM pool with real liquidity on X Layer and decide the
price source (TWAP vs. bounded multisig-set price).** This is the largest unverified dependency.

## Circuit (plan)

- Remove the eligibility wire (see changes). Inputs: holding-time bucket (3 bits) and size category (2 bits) = 5 inputs.
- Outputs: allowed (1) and bonus tier (2–3 bits).
- Target at most about 40 NAND gates, produced by logic minimization and checked exhaustively on all 32 input rows.
- Rule intent: allowed = held at least one bucket; bonus rises with holding time and size and saturates at the cap.
- The exact bonus function is a pending decision; it must stay within the self-funded ceiling unless a subsidy is approved.

## Ownership model (planned)

- Credit token: vaults registered at deployment, then ownership **renounced**. Nobody can add minters later.
- Vault: circuit, processor, circuit ID, reserve address, bucket size, size tiers, fees caps are **immutable**.
- Remaining parameters (fee rates within hard caps, BEM price source, reserve operations) are owned by a **timelock
  (48h) controlled by a multisig (e.g. 3-of-5)**.
- Claims and withdrawals can never be paused. An emergency guardian may pause new deposits only.
- Final model is published in the README before deployment.

## Fee path summary

1. User claims: vault calls `eval`, mints USD-face credits at the circuit's multiplier.
2. User redeems: credits burned, BEM paid from the reserve.
3. User pays TapeOut fees in BEM (new processors) or OKB (legacy). Evermo does not call TapeOut fee functions in v2.
4. Direct "credits pay the fee" integration is optional and only added once TapeOut's fee interface is confirmed.

## Remaining open items

1. BEM liquidity and price source on X Layer.
2. Final bonus function within the self-funded cap.
3. Confirmation of the `eval` ABI and the netlist import format.
4. Aave X Layer pool and aToken addresses for USDT0 and USDC (pool address `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116` was seen on a tracker page, not verified on-chain).
