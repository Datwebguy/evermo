# Product and build review

Reviewed on 2026-11-17 against the project notes, the TapeOut guide (tapeout.link) and the Aave X Layer
market page. Nothing here has been changed in the code yet; it waits for a go-ahead.

> **Update:** the decisions on these points are recorded in `docs/DESIGN.md` and the code changes in
> `docs/CONTRACT_CHANGES.md`. This file is the original review.

## Facts checked

| Topic | Finding |
|-------|---------|
| Aave V3 on X Layer | Exists. Pool `0xE3F3Caefdd7180F884c01E57f65Df979Af84f116`. USDT0 3.35% supply APY, USDC 3.10%. |
| OKB yield | Only WOKB is listed, at **0.00% APY** and not borrowable. An OKB vault would earn nothing. |
| Liquidity | USDT0 utilization 85.5%, USDC 82.3%. Large withdrawals can revert when Aave is tight. |
| TapeOut origin | Built on BNB Chain; deployed to X Layer on 2026-09-19. BEM is mined only on BNB and bridged 1:1 to X Layer via LayerZero. |
| `eval` | A free view call. Circuits have no write access and cannot call other contracts, so the vault must supply every input (including time). |
| Netlist limits | About 40 KB per tape-out. Every gate burns one transistor token, so gate count is a direct cost. |
| Fee payment | The guide describes fees in gas/BNB and BEM treasury flows. The project notes say BEM pays processor creation (0.1) and transistor minting (0.01) on X Layer. **The exact contract call and token for paying these fees on X Layer is unverified.** |

The TapeOut guide pages could be read only partly; confirm fee mechanics on-chain or with the TapeOut team.

## Problems with the current idea or build

1. **Why would a user claim credits?** Credits are worth at most the yield they replace (rate <= 100%, minus a claim fee),
   and only buy TapeOut fees. A plain withdrawal of yield is strictly better for anyone who does not need those fees.
   Fix the pitch and mechanics (see Upgrades 1 and 2).
2. **Credit-unit mismatch.** The vault mints credits as yield normalized to 18 decimals. For USDC and USDT0 that is roughly
   one credit per dollar; for WOKB it is one credit per OKB, which is worth far more. Credits are shared across vaults, so
   this is a real bug-in-design. Needs a per-vault credit price or an oracle.
3. **Owner can block users.** `setBlocked` feeds the circuit's eligibility wire, so the owner can deny any claim. That
   contradicts "permanent rules locked in a circuit". Remove it, or derive eligibility from public on-chain data inside
   the rules.
4. **Circuit size.** The generated netlist has 362 NAND gates, because it is an unminimized sum of products. The same rules
   fit in a few dozen gates. Minimize before tape-out to cut the transistor cost.
5. **The circuit is simple.** Judges may ask why this is not a lookup table in Solidity. The answer is credible
   neutrality: rates cannot be changed by anyone, ever, and anyone can read `netlist(circuitId)`. State this
   explicitly, and consider a richer rule so the circuit does visible work.
6. **Treasury trust.** Claimed yield and fees go to a treasury address. Credits are only as good as that address paying
   fees. Use a contract-based reserve with an on-chain fee-sink path, not an EOA.
7. **Admin powers.** The owner can change treasury and fees (capped at 20%). Use a multisig and timelock, or renounce
   after launch.
8. **OKB is not an ERC-20.** The frontend and vault have no native OKB or WOKB wrap flow, and WOKB earns nothing.
9. **Unverified integrations.** `eval` ABI, the fee-sink settlement, and the netlist import format are assumptions.

## Upgrades worth making

1. **Sharper positioning:** "Tape out for free: deposit stablecoins, keep your principal, and let the yield pay your
   TapeOut fees." Target TapeOut builders, not generic yield users.
2. **Give credits a reason to exist.**
   - Let the circuit's top tier exceed 100% (funded from the performance fee), or
   - make credits redeem for BEM held in the reserve at a fixed schedule, so the benefit is concrete.
3. **Direct fee payment:** a `redeem` path where the reserve contract pays the TapeOut fee on behalf of the burner,
   once the real fee interface is confirmed.
4. **Stablecoins first:** launch USDT0 and USDC only. Add OKB when there is a yield source for it.
5. **Public rate card:** show the circuit's table (holding time x size -> rate) in the DeWEB UI with a "verify against
   on-chain netlist" button.
6. **Safer withdrawals:** a withdraw-queue or partial-fill path when Aave liquidity is short.

## Verdict

The concept holds together and fits the hackathon (TapeOut circuit via `eval`, DeWEB frontend, X Layer). Items 1, 2 and 9
above are the ones to settle before building further, because they change the design. Nothing else needs to be done
until you give the go-ahead.
