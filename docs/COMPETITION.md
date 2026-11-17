# Previous winners and current competition (checked 2026-11-17)

## Previous TapeOut hackathon: Ignix × TapeOut "Genesis Transistor" Hackathon (X Layer)

- Closed around 9 October 2026; 52 submissions across circuit mining, AI, games, music, and tools for on-chain approvals
  and payments. Prizes: 1st $8,000, 2nd $4,000, 3rd $2,000; the winner's transistor became the Ignix Genesis Transistor.
- The full official placings are in a pinned post on @Ignixbot (X) that could not be read here.
- **Confirmed award winner: Embers World / EMBER** (github.com/BensonXBX/ember-tapeout), a 2.5D pixel fighting game on
  X Layer DeWEB (`2.2.300.tape`), shown at the first X Layer × TapeOut demo day.

What Embers World did that judges could see:
- A **live, playable product** on X Layer DeWEB from day one, plus a backup web link.
- **Free mode with no wallet**; real-money mode (OKB / BEM deposits) only when the user chooses it.
- **The circuit is visible in the product**: players see the NAND-circuit AI's signals while fighting.
- **Polish**: mobile layouts, onboarding, screenshots, "one-minute start" steps, a controls table.
- **Evidence**: a hackathon disclosure document, DeWEB upload package with file list and SHA-256 sums, tests, and
  instructions to run it locally.

## Strong entries in the current hackathon (public repos)

| Project | What it does | Overlap with Evermo |
|---------|--------------|---------------------|
| Fusebox (0xdopewilly/fusebox) | AI agent wallets where every payment passes taped-out circuits ("fuses"); live on X Layer mainnet; MCP server, npm SDK, x402, Fuse Studio, OKX Wallet connect | **High for agent spending limits.** Very polished and already live |
| IntentGuard (TS-mfon/intentguard) | Owner-approved agent spending for data/API purchases with a NAND spending-policy circuit; testnet plus a mainnet registration | High for agent spending |
| Agent Firewall (runesleo/leolabs-agent-firewall), CircuitGuard Capsule, Remembrance Seal | Agent treasury and permission rules on TapeOut | High for agent permissions |
| SkillPass (IGNIX-IMOO/skillpass) | Ownership sales of agent skills and knowledge assets, with royalty circuits | Medium: ownership of agent assets, not whole agents |
| TapeAPI (BruceLanLan/tapeapi) | Working implementation of TAP-11/13/15/17: signed answers, AI usage receipts, agent passports, MCP signing proxy; MIT, v3.0.0 | **A tool to use, not a competitor** |

## What this means for Evermo

1. **Agent spending limits are crowded.** Fusebox is live on mainnet with SDKs and a polished app. A spending contract
   built from scratch in three weeks would look like a weaker copy. Do not lead with spending.
2. **Our clear difference is ownership and resale of whole configured agents.** No entry found does that.
3. **Use TapeAPI** for signed answers, receipts, pinned tools and agent passports instead of rebuilding them. Less to
   build, and it counts as ecosystem integration.
4. **Copy what won:** a live product on X Layer DeWEB, a free no-wallet path, the circuit visible in the product,
   mobile-friendly polish, and a disclosure and evidence document.
