# Research notes (2026-11-17)

## TapeOut's own direction (github.com/TapeOutProtocol/TAPs)

Merged draft standards, all about circuit containers acting as services and agents:

| TAP | What it defines | What it leaves out (product gap) |
|-----|-----------------|----------------------------------|
| TAP-02 | Netlist format and evaluation semantics (reference evaluator) | — |
| TAP-10 | DeWEB access + messaging (TapeSend) | — |
| TAP-11 | Service manifest: a container publishes its API and signing key | payment, response formats |
| TAP-12 | Sealed commitments, reveals and verdicts over TapeSend | **scoring, leaderboards, reputation** |
| TAP-13 | Signed responses for container services | — |
| TAP-14 / 19 | Private channels and group chats between containers | — |
| TAP-15 | MCP tools pinned on chain (tool-poisoning protection) | — |
| TAP-16 | Attested cross-chain reads from independent services | — |
| TAP-17 | AI price tables on chain + signed usage receipts | — |
| TAP-18 | Agent mandates, task offers, deliveries, verdicts | **escrow, payment enforcement, markets, reputation** ("channel escrow not deployed, vault not specified") |
| TAP-21 | Proof-verified reads | — |

TapeKit repo: kernel, gateway, extension; roadmap: npm kernel, CLI, desktop app, web3:// adapters.

## Ecosystem activity (tapeout.link/news, Nov 17)

- 80,195 circuits taped out, 45,759 transactions (community figure).
- Live projects/tokens: TapeAI (TAI, "prosecutor" staking, Alpha Hunter on X Layer), TapeLaunch (AI site builder to DeWEB), TapeMine (mining pools), UP token, TapeFly (circuit fruit-fly brain research), TapeMonkey.
- Benchmark: circuits compiled bit-parallel are ~12.7x cheaper than native contracts per input when running 20+ inputs at once; single runs are far more expensive.
- Community ideas posted the same day (avoid duplicating): CircuitCred, ChainGuard, Agent Firewall, TapePay, Wellkeep, inheritance rules, JUNTA, circuit escrow, quiz auto-grading, Ayo, chess anti-cheat, Circuit Farm, TapeSplit, ProofPass, TapeRound, Anon Layer, TapePlace, TapeDNA, Failure Olympics, AI ad clearance receipts, healthcare rules, Wallet Escape Drill.

## Market context

- Galxe is winding down Quest, ID and Passport (announced Nov 9, 2026): no new campaigns since Nov 9, last campaigns Dec 5, claims close Dec 15.
- OKX launched the Agent Payments Protocol (Apr 2026) on X Layer: quotes, negotiation, escrow, metering, settlement, disputes; escrow and disputes reported as "coming soon".
- x402 agent payments: 100M+ transactions but small real commerce volume.
- Prediction markets: roughly $20B+ monthly volume in 2026; Kalshi and Polymarket dominate.
- Crypto signal groups: deleting losing calls and faking track records is a widespread, well-known problem.
