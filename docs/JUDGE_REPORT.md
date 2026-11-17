# Evermo — judge report

Judged 2026-11-17 against X Layer TapeOut Accelerate (requirements and criteria in `docs/JUDGING.md`). Strict mode: only
what the repository and the chain show counts; plans get no credit.

## Verdict

Evermo is a well-defined idea with unusually thorough groundwork. The problem, users, use cases, revenue and TapeOut fit
are clearly written. Feasibility is backed by real checks against the deployed X Layer contracts: `eval`, tape-out,
container opening, site upload, ownership transfer and TapeSend were exercised on a mainnet fork, and the official gateway
was tested live. But nothing is built or deployed yet: there is no code, no processor address or circuit ID, no access
link and no demo. Every product claim is still planned, and the scripts behind `VERIFICATION.md` are not in the repo.
As an idea it is strong. As a hackathon submission it would not meet the circuit-project and app requirements today.

## Claims

| # | Claim | Verdict | Citation |
|---|-------|---------|----------|
| 1 | Each agent is a TapeOut circuit NFT on X Layer with its own container | UNSUPPORTED (planned) | `docs/CLAIMS.md:9`. Feasibility only: tape-out and container opening on a fork, `docs/VERIFICATION.md:39-41` |
| 2 | Whoever holds the agent's circuit NFT owns the agent | PARTIAL | Site control follows the NFT on a fork, `docs/VERIFICATION.md:44`; no Evermo code |
| 3 | The budget contract calls the budget circuit with `eval` on chain before paying | UNSUPPORTED (planned) | `docs/CLAIMS.md:11`; `eval` cost measured, `docs/VERIFICATION.md:13,40`; no contract exists |
| 4 | Tool descriptions pinned on chain (TAP-15); changes refused | UNSUPPORTED (planned) | `docs/CLAIMS.md:12`; behaviour is defined by the TAP-15 spec, not implemented |
| 5 | Every agent answer is signed (TAP-13) | UNSUPPORTED (planned) | `docs/CLAIMS.md:13` |
| 6 | Signed usage receipts checkable against an on-chain price table (TAP-17) | UNSUPPORTED (planned) | `docs/CLAIMS.md:14` |
| 7 | Owner delegation (TAP-11) stops working when the agent changes hands | PARTIAL | Holder-based authorisation is in the TAP-11 spec, `docs/VERIFICATION.md:25`; not implemented |
| 8 | Results arrive over TapeSend in the agent's container; "only its current owner can read them" | PARTIAL | Sending and inbox verified on a fork, `docs/VERIFICATION.md` (TapeSend row). Messages sent before a sale were encrypted to the previous owner's key, so "only the current owner" is not accurate for older messages |
| 9 | Buy with USDT0, resale circuit checks each sale, payment split instantly with no balance kept | UNSUPPORTED (planned) | `docs/CLAIMS.md:17` |
| 10 | Marketplace and agent pages are DeWEB sites opened via `tape://` | UNSUPPORTED (planned) | `docs/CLAIMS.md:18`; upload path verified on a fork, `docs/VERIFICATION.md:42` |
| 11 | Anyone can check rules, tools and prices without a wallet | UNSUPPORTED (planned) | `docs/CLAIMS.md:19`; `eval` is a free read (TAP-02) |
| 12 | Demo agent "Position Watch" sends lending health alerts | UNSUPPORTED (planned) | `docs/CLAIMS.md:20` |
| 13 | Demo agent "Token Risk Check" reports on new tokens | UNSUPPORTED (planned) | `docs/CLAIMS.md:21` |
| 14 | Every budget and resale decision is shown on the agent's page | UNSUPPORTED (planned) | `docs/CLAIMS.md:22` |
| 15 | "Every agent grows TapeOut": a tape-out burns transistors and opening a container pays a fee (`SUBMISSION.md`, `POST.md`) | VERIFIED (mechanism) | Fork run: mint, tape-out with burn, container fee 0.08 OKB, `docs/VERIFICATION.md:38-41` |
| 16 | Taped-out rules can never be changed | VERIFIED | Circuit beacon owner is the zero address, `docs/VERIFICATION.md:11` |
| 17 | The page you buy from can't be swapped (DeWEB + TapeKit) | PARTIAL | Gateway checks bytes against the chain (live gateway test, `docs/VERIFICATION.md:49`); Evermo's own site not published |

## Requirements

| Requirement | Status |
|-------------|--------|
| Use TapeOut circuits, contracts or on-chain data on X Layer, or run on X Layer DeWEB | ❌ Not yet; nothing deployed |
| Circuit projects: processor contract address + circuit ID | ❌ Missing (`docs/SUBMISSION.md:112-115` are TBD). **Would disqualify a circuit entry** |
| Apps: access link + TapeOut features used | ❌ Link missing (`docs/SUBMISSION.md:120-121`); features are listed |
| Product, users, reach, revenue, why users pay and stay | ✅ `docs/SUBMISSION.md` |
| Only work completed during the event | ✅ Repository history starts during the event |
| No fabricated functionality | ⚠️ The form describes features in the present tense ("Evermo is a marketplace…", "every answer comes back signed"). Submitted before they exist, this reads as fabricated functionality. The post is safe because it says "nothing has been built yet" (`docs/POST.md:113`) |
| Demo video (≤ 3 min, recommended) | ❌ Missing (`docs/SUBMISSION.md:123`) |

## Scores

| Criterion | Score | Reasons |
|-----------|-------|---------|
| User value & commercial potential | 4/10 | The problem (platform lock-in, unverifiable tools and bills, no resale), the three user groups and the revenue model are clear and specific (`docs/PRODUCT.md`, `docs/SUBMISSION.md`). There is no evidence of demand: no users, no makers, no agents. |
| Innovation | 5/10 | Owning and reselling whole configured agents, with on-chain budget and resale circuits and pinned tools, is a distinctive combination. It is only described, not demonstrated. |
| Ecosystem integration | 3/10 | The planned use of circuits, containers, DeWEB, TapeKit, TapeSend and TAP-11/13/15/17 is deep, and the fork verification shows the team can drive the real contracts (`docs/VERIFICATION.md:38-49`). Nothing is integrated or deployed yet. |
| Product readiness & UX | 0/10 | No code, no app and no "do X → see Y" steps (`README.md:19-22`). |
| Demo video | 0/10 | No video link. |

## Repository hygiene

- No leftover code from other ideas in the current tree. Git history still contains the earlier vault code and idea notes
  (low risk; judges rarely read history).
- No secrets found. All commits are authored by Datwebguy, with no co-author lines.
- `README.md:34` describes `CIRCUIT.md` as "the shared rules circuit"; it now defines a budget circuit and a resale circuit.
- `docs/VERIFICATION.md:68` says a contract calling `eval` is "needed only once agents move money", which contradicts the
  current design where the budget contract calls `eval` on chain. `docs/JUDGING.md:10` still says "rules circuit".
- `docs/PROJECT.md:48` and `docs/AGENT_PROMPT.md:21` mention Claude by name. Not attribution, but unnecessary in a public repo.
- The verification scripts (fork flow, live chain checks, gateway test) are not in the repository, so
  `docs/VERIFICATION.md` cannot be reproduced from the repo.

## Five most important fixes (largest score gain first)

1. **Build and deploy the MVP on X Layer mainnet.** Tape out the budget and resale circuits, publish the marketplace on
   DeWEB, and list two working agents. Fill in the processor address, circuit IDs and access links, and replace the README
   "Try it" section with "do X → see Y" steps. This lifts readiness, integration and the requirements from failing to
   passing.
2. **Do not submit the form in the present tense before the features exist.** Either submit after the build, or mark each
   product line as "planned" until it is live, so nothing reads as fabricated functionality.
3. **Record a demo video of under 3 minutes** showing one complete moment: buy an agent with no setup, see its rules
   decided by the circuit on screen, receive a signed alert, then resell it and watch the payment split.
4. **Commit the verification scripts** (live chain checks, the mainnet-fork flow, the gateway test) with instructions, so
   every line of `docs/VERIFICATION.md` can be re-run by a judge.
5. **Fix the inconsistencies**: `README.md:34`, `docs/VERIFICATION.md:68`, `docs/JUDGING.md:10`; reword the TapeSend claim
   to "readable by the owner at the time it was sent"; remove the Claude mentions in `docs/PROJECT.md:48` and
   `docs/AGENT_PROMPT.md:21`.
