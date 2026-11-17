# Evermo — judged against the hackathon

Source: X Layer TapeOut Accelerate page (web3.okx.com/xlayer/build-x-series), read 2026-11-17.
Judges: the official X Layer and TapeOut teams, jointly.

## 1. Participation requirements

| Requirement | Evermo | Status |
|-------------|--------|--------|
| Build in the TapeOut ecosystem: use TapeOut circuits, contracts or on-chain data on X Layer, or run on X Layer DeWEB | Agents are circuits on X Layer; budget and resale circuits called with `eval` on chain; app on X Layer DeWEB | Planned |
| Circuit projects: processor contract address + circuit ID | Budget circuit, resale circuit and agent circuits | TBD after tape-out |
| Apps/tools: access link + which TapeOut features are used | `tape://` link + gateway link; features listed in the submission | TBD link |
| Describe product, target users and how to reach them, revenue model, why users pay and keep using | the submission | Done |
| Existing projects need substantial new work during the event | New project | OK |
| Only work completed during the event is judged | All work in this repo is from the event | OK |
| No plagiarism, fabricated functionality or fabricated data | Every claim must be backed in `CLAIMS.md` | Ongoing |
| Own processor not required; interfaces may run off chain | Uses an existing processor; agent runtime off chain | OK |
| Submit via the Google Form before 7 Dec 2026, 23:59 UTC | — | Pending |

## 2. Judging criteria: self-assessment

Scores are honest estimates out of 10: **now** (idea and plan only) and **target** (at submission, if the MVP ships).

| Criterion | Now | Target | Why / what moves it |
|-----------|-----|--------|---------------------|
| User value & commercial potential | 5 | 7 | Real problems (platform lock-in, unverifiable tools and bills, no resale). Needs real agents people would actually buy. Revenue is clear but small until volume. |
| Innovation | 6 | 8 | Agents as owned, resellable assets with on-chain rules, pinned tools and checkable bills is new. Risk: agent safety and spending tools exist, so ownership and resale must lead the demo. |
| Ecosystem integration (DeWEB, FabX, TapeCode, TapeKit, TapeSend) | 6 | 9 | Uses circuits, containers, DeWEB (SiteRegistry), TapeKit, TapeSend and TAP-11/13/15/17 together. FabX and TapeCode are not used; the page says no specific tool is required. |
| Product readiness & UX | 1 | 7 | Nothing built yet. Target: two working agents, buy → permission → alert → resell on X Layer, simple pages. |
| Demo video (≤ 3 min) | 0 | 8 | One complete moment: buy an agent, receive a signed alert, check the bill, resell. |

## 3. Biggest risks to the score

1. **Not shipping a working end-to-end flow.** Readiness and demo carry the most weight we can still change.
2. **Looking like a generic agent safety or spending tool.** Lead with ownership and resale, and show it live.
3. **TapeOut details on X Layer:** all tested on a local copy of mainnet (`VERIFICATION.md`); HashPort is BNB-only, so we
   upload directly to SiteRegistry. Real transactions are the final confirmation.
4. **Leftover code from other ideas.** Removed on 2026-11-17; keep the repo limited to Evermo.
5. **Cost per agent** (container 0.08 OKB plus tape-out). Show that it is built into the agent's price.

## 4. How AI judges read projects (and how we prepare)

What AI judges do:
- They read the repository and score it claim by claim, citing evidence.
- They check reproducibility and verify features, then write a structured report and a preliminary score; humans decide.
- They reward a README written for a machine reader too: what it is, the problem, and "do X → see Y" steps. No marketing.
- A good demo shows one complete moment, from a real user action to a visible result.

What we do:
1. Keep `docs/CLAIMS.md`: every claim in the README, post and form, each with evidence (file and line, test, transaction
   hash, link) or marked as planned.
2. Run our own claim-by-claim judge with the project skill in `.claude/skills/hackathon-judge/` before every milestone and
   before submitting. It scores against the five criteria above, cites evidence, and lists every unbacked claim.
3. Write the README as "what it is, problem, try it: do X → see Y".
