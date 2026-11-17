# Evermo — submission answers (ready to paste)

X Layer TapeOut Accelerate form: https://forms.gle/EoDNbxQ65dev1wFd9 (deadline 7 December 2026, 23:59 UTC).
TBD fields are filled after tape-out. Matching post: `docs/POST.md`. Full design: `docs/DESIGN.md`.

## Project name

Evermo

## One-liner

Evermo turns any app rule into a permanent TapeOut circuit that anyone can check and nobody can change.

## Problem

Airdrops, loyalty programs, games and DAOs on X Layer all run on rules that decide who gets what. Those rules sit in
contracts with admin keys or on servers, so they can change after users have done the work, and users cannot easily check
them. Projects say "the rules are fair and final", but users have no way to verify it.

## Product

1. **Describe** a rule in a simple form (inputs and the result for each case). No hardware knowledge needed.
2. **Build:** Evermo generates the smallest NAND circuit, shows the gate count and cost, and tests every possible input.
3. **Tape out** on the Evermo processor on X Layer in one click (or import the BLIF file into the TapeOut canvas).
4. **Use:** the project's contract calls `eval(circuitId, inputs)` for every decision.
5. **Verify:** each rule gets a public DeWEB page where anyone can read it in plain words and test any input against the
   on-chain circuit, with no wallet.

## Target users and how we reach them

- **Projects on X Layer** running airdrops, loyalty programs, games and votes: X Layer and TapeOut communities, TapeTape,
  hackathon teams, and direct outreach to X Layer projects.
- **Their users**, who check the rules on the public rule page. Every rule page shared by a project brings new people to
  Evermo.
- **Developers** who want a permanent rule with one contract call.

## Why projects pay and come back

- A rule costs only a few dozen transistors.
- Rules are permanent, so every new campaign, season or game needs a new rule.
- Publishing a rule nobody can change earns users' trust.
- Users come back to check rules before and after campaigns.

## Revenue model

Evermo runs its own TapeOut processor on X Layer. The processor creator earns a share whenever transistors are minted on
it, and every rule taped out through Evermo uses Evermo transistors. Evermo earns per gate, through TapeOut's own
economics. Running costs are close to zero: no servers (the app is on DeWEB) and no user funds held.

## TapeOut features used

- **NAND circuits and `eval` on X Layer:** every rule is a taped-out circuit.
- **Processor factory:** Evermo's own processor. Processor address: TBD.
- **Circuit ID** (demo rule): TBD.
- **Canvas (BLIF import):** any rule can be opened in the canvas.
- **Circuit containers (ERC-6551):** host the app and receive revenue.
- **DeWEB + HashPort:** the app and rule pages are on chain, opened via `tape://`. Access link: TBD.
- **TapeKit:** pages verified byte-by-byte; opened in any browser via the tapekit.org gateway.
- **BEM:** pays processor creation and mint fees.

## Circuit details

Each rule is its own circuit. The demo rule ("Evermo early supporter"): inputs are weeks active (3 wires), transaction
count bucket (2 wires) and holds BEM (1 wire); the output is a reward tier (2 wires). Exact table published with the
tape-out.

## Status

New project for this event. Evermo's circuit generator (turning a rule table into a NAND netlist, with exhaustive tests)
already exists from early work in the repository. Next: the general rule engine, Evermo processor, app, DeWEB pages, demo
contract and demo video.
