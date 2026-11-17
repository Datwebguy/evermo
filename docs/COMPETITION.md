# Previous winners and current competition (checked 2026-11-17)

## Previous TapeOut hackathon: Ignix × TapeOut "Genesis Transistor" Hackathon (X Layer)

52 submissions, about $16,000 in prizes. Winners (list provided by the team; AlephTape and SonicMint repos checked):

| Place | Project | What it shipped |
|-------|---------|-----------------|
| 1st ($8,000) | **FabX** (fabx.tech) | A mining platform on X Layer: users mint NAND/LATCH, design circuits, tape them out and mine $FAB; circuit efficiency and verified DeWEB usage affect mining weight. Grew TapeOut's own economy (3,328 miners in 4 days) |
| 2nd ($4,000) | **AlephTape** (lonetravelerxyz/alephtape) | A ZK coprocessor: large circuits run off chain and are verified on chain with Groth16. Live on X Layer mainnet; `verifyEval` costs 296,826 gas against 396,410,201 for direct `eval` (about 1/1,335). Demos: digit recognition and games with verifiable AI moves |
| 3rd ($2,000) | **SonicMint** (music.tapeout.link, xiaozhanyangx/sonicmint) | Music publishing on X Layer: audio, covers and lyrics stored on chain; paid tracks encrypted in the browser; one purchase gives permanent access; royalties split to several payees at payment, with no balance left in the contract |
| Recognition ($1,000) | **Ember / EmberWorld** (BensonXBX/ember-tapeout) | A playable DeWEB action game on X Layer: circuit challenges, free and paid PvP, desktop and mobile; circuits act as the "brain" of characters |
| Recognition ($1,000) | **TapeFlow** (tapeflow.world) | A payment tool: transfers, collection, red packets, escrow, private payments, with a DeWEB frontend |

### Why they won (patterns)

1. **They grow TapeOut itself.** FabX drives transistor minting, tape-outs and DeWEB usage; AlephTape removes TapeOut's
   biggest limit (circuit size and cost).
2. **Ownership and royalties for consumers works.** SonicMint: buy once, own forever, royalties split instantly.
3. **Live on X Layer mainnet**, with real addresses and numbers in the README (gas, cost ratios, contract addresses).
4. **The circuit is visible and central** (Ember's circuit "brains", AlephTape's verifiable AI moves).
5. **Practical and playable**: real people can use them right away, often without a wallet first.

What Embers World showed judges: a live DeWEB app from day one, a free no-wallet mode, optional OKB/BEM money mode,
circuit signals visible while playing, mobile layouts, a one-minute start guide, a disclosure document and file hashes.

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
5. **Show how Evermo grows TapeOut** (the FabX lesson): every agent created is a circuit taped out (transistors burned), a
   container opened, a DeWEB site and TapeSend traffic.
6. **Make ownership as clear as SonicMint:** buy once, own the agent, royalties split instantly at every sale.
