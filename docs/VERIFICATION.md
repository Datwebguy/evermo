# Evermo — verification against TapeOut (2026-11-17)

What was checked against the TapeOut specs (github.com/TapeOutProtocol/TAPs) and live on X Layer (chain 196,
https://rpc.xlayer.tech, read-only calls). Anyone can repeat every check below.

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

## Corrections made after these checks

- "Permission" now uses the TAP-11 delegation, not TAP-18.
- Receipts are described as showing the reported model and the charge, not proving which model ran.
- Results go to the agent's own container inbox, so owners do not need a second container.
- In the MVP the rules circuit is checked by the agent runtime, and every signed answer includes the circuit's inputs and
  output so anyone can re-run `eval` and confirm the decision. A contract that calls `eval` itself is needed only once
  agents move money.

## Still to confirm before building

1. Wallet connection inside a `tape://` site (sites are sandboxed). Fallback: serve the same files from an https link,
   which the hackathon allows.
2. Opening containers only through the official opener (TapeKit issue #5: containers made directly through the ERC-6551
   registry become receive-only).
3. Which processor to tape out on, and the price of its transistors.
4. HashPort upload on X Layer.

## Trust assumptions to state openly

- The processor factory, the site store and the TapeSend hub still have admins. Taped-out circuits do not (beacon owner is
  the zero address).
- TAP standards used are Drafts.
