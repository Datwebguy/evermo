# Evermo — verification against TapeOut (2026-11-17)

What was checked against the TapeOut specs (github.com/TapeOutProtocol/TAPs) and live on X Layer (chain 196,
https://rpc.xlayer.tech, read-only calls). Anyone can repeat every check below with the scripts in `verification/`.

## Live on X Layer

| Check | Result |
|-------|--------|
| Processor factory `0x1f09DAeFA827f02CBb40967cc91b259763760761` | Live; `cpuCount()` = 426 processors; `isSealed()` = false; owner `0xB3D85b42A045c1A88D800CAD0F55d2566a4D3138`; implementation `0x336e9f0f4c3fee7c8c803377e4dea00293f4ae2a` (upgraded since TAP-10 listed `0x7495…d17b`) |
| Circuit beacon `0xf70d1ed4f62CF3780157B0b421b7E2F45bD0991C` | `owner()` = zero address; `implementation()` = `0x977f217887E085D298Cb3819cDAD5A0ee35F29B2`, as listed in TAP-10. Circuit code can no longer be upgraded, so taped-out netlists and their evaluation are fixed |
| `eval(uint256 id, bytes inputs)` (TAP-02, selector `0x934d06ea`) | Works on live circuits, e.g. processor #0 "OnlyTestXLayer" circuit 1 (2 inputs, 4 gates) and processor #42 "Blonskr" circuit 1 (3 inputs, 9 gates) |
| Cost of calling `eval` from a transaction | About 53,500–67,400 gas in total for circuits of 3–9 gates (estimateGas), so a contract can afford to call the rules circuit |
| Tape-out fee `TAPEOUT_FEE()` on X Layer processors | 0.0013 OKB (plus burned transistors and gas) |
| Container opener `0x536adD8F30f03b69f6fbF29d425A816A0dC50106`, ERC-6551 registry `0x000000006551c19487814612e58FE06813775758` | Deployed |
| Site store `SiteRegistry` `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` | Deployed; implementation `0xa85c4143…a45f` matches the accepted one in TAP-10; has an owner (upgradeable; TapeKit refuses to read if the implementation changes) |
| DeWEB hub (TapeSend) `0xe61A9C7213a6Aa616C246a2B569e555B417b25ee` | Deployed; `isSealed()` = false; has an owner |

## Standards: what each one really gives us

| Standard | What it gives | How Evermo uses it |
|----------|---------------|--------------------|
| TAP-02 | Netlist format; `eval` / `step` / `netlist` / `circuitInfo` read functions | Rules circuit; anyone can read and re-run it |
| TAP-10 | DeWEB sites and TapeSend messaging on X Layer (active since 2026-09-19) | Marketplace and agent pages; encrypted delivery to the agent's container, readable by its current holder |
| TAP-11 | Service manifest at `/.well-known/tapeapi.json`; the circuit holder authorises a signer key with an EIP-712 delegation that expires | **The owner's permission.** Only the current holder's delegation counts, so selling the agent ends the old owner's permission |
| TAP-13 | Signed answers bound to the request and the time | Every agent answer is signed |
| TAP-15 | `toolsSha256` pins the exact tool list; clients refuse changed tools; providers refuse calls with `TOOLS_CHANGED` | Agent tools pinned by hash |
| TAP-17 | Price table in the manifest; signed usage receipts binding request and response hashes, the **reported** model and usage, and the amounts | Checkable bills (the receipt proves the charge under the published prices, not which model actually ran) |
| TAP-18 | Mandates and task messages for a party hiring an agent it does not own; "nothing is enforced", no amounts | Not used in the MVP; later for agent-to-agent jobs |

## End-to-end test on a local copy of X Layer (2026-11-17)

X Layer mainnet state was copied into a local simulation (Hardhat 3 fork of block ~76,155,100) and Evermo's whole TapeOut
flow was run against the real deployed contracts. No real funds were used.

| Step | Contract / call | Result |
|------|-----------------|--------|
| Mint 1 NAND transistor | processor #222 transistors `0x0F7E9ed4…3194`, `mint(0, 1)` | ✅ costs 0.000661 OKB (price 0.000001 + protocol fee) |
| Tape out a circuit | processor #222 `0x60918C20…05D6`, `tapeout(0x00000002000002, 1, 1)` | ✅ fee 0.0013 OKB; circuit NFT minted to the caller |
| Evaluate it | `eval(id, 0x01)` → `0x00`, `eval(id, 0x00)` → `0x01` | ✅ correct; inputs are packed least-significant bit first; ~48,000 gas |
| Open the container | opener `open(cpu, id)` | ✅ fee 0.08 OKB (`FEE()`), through the official opener |
| Upload a file | SiteRegistry `putFile(container, "index.html", …)` | ✅ stored, SHA-256 matches |
| Batch uploader | SiteRegistry `setOperator(container, op, ttl)` | ✅ the operator can write |
| Transfer the circuit | `transferFrom(old, new, id)` | ✅ new holder controls the site; old holder and old operator lose all rights |
| TapeSend | owner `publishKey(cpu, agentId, …)`; Evermo `send(cpu, serviceId, endpoint, ref, payload)` | ✅ message lands in the agent container's inbox; a non-holder cannot send as Evermo |

Live browser test of the official gateway (https://4246-0.tapekit.org, headless Chromium with a simulated wallet
extension): the site loaded through the gateway's service worker, `window.ethereum` was available to the page, the page
could call the X Layer RPC (`eth_chainId` → `0xc4`), and local storage worked.

## Findings that change the build

1. **HashPort only supports BNB Chain** (its app config is fixed to chain 56). On X Layer we upload with our own script that
   calls SiteRegistry `putFile` / `appendChunk` / `setFallback` directly, with `setOperator` for batches. Tested above.
2. **Sending TapeSend messages needs a sender circuit.** The hub only lets the holder of an opened circuit send from it, so
   Evermo needs its own service circuit and container. Each owner publishes an encryption key once, from their own wallet.
3. **Read the new circuit's ID from the tape-out `Transfer` event.** `nextId()` returns the latest existing ID, not the
   next one as TAP-02 says.
4. **Gateway address for X Layer sites:** `https://<id>-2-<processor>.tapekit.org/` (area code 2).
5. **Cost per agent** on X Layer: about 0.000661 (one NAND) + 0.0013 (tape-out) + 0.08 (container) = **≈ 0.082 OKB** plus gas.

## Corrections made after the spec review

- "Permission" uses the TAP-11 delegation, not TAP-18.
- Receipts show the reported model and the charge, not proof of which model ran.
- Results go to the agent's own container inbox, so owners do not need a second container.
- Money only moves through contracts that call the budget and resale circuits with `eval` on chain (about 48,000 gas per
  call, measured). Every decision can also be re-run by anyone for free.

## Status of the open items

| Item | Status |
|------|--------|
| Wallets inside a DeWEB site | ✅ Works through the https gateway (real origin). Preview mode blocks wallets by design |
| Opening containers through the official opener | ✅ Works; 0.08 OKB |
| Processor and transistor price | ✅ 377 of 426 processors still mint; e.g. #222 costs 0.000661 OKB per NAND |
| Uploading the site on X Layer | ✅ Works by calling SiteRegistry directly; HashPort is not available on X Layer |
| TapeSend on X Layer | ✅ Works; needs Evermo's own service circuit and a key published by each owner |

## Trust assumptions to state openly

- The processor factory, the site store and the TapeSend hub still have admins. Taped-out circuits do not (beacon owner is
  the zero address).
- TAP standards used are Drafts.
- These checks ran on a local copy of mainnet; the first real transactions will be the final confirmation.
