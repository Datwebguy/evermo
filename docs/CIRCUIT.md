# Evermo — Circuit Integration

## TapeOut primitives

TapeOut circuits are built from two primitives:

- NAND: two boolean inputs, output is the negation of AND
- LATCH: stores one bit of state and updates on the on-chain clock

Any logic is constructed by connecting NAND and LATCH gates. The finished design is a netlist of gates and connections.

## Tape-out process

1. Design the netlist in the browser.
2. Tape out on X Layer. This burns the required NAND and LATCH transistors and mints the circuit as an ERC-721 NFT.
3. The netlist is stored permanently. The circuit ID and processor address identify it on-chain.

## Evaluation

```solidity
eval(circuitId, inputs) → outputs
```

- View function, free to call
- Executes the exact taped-out netlist
- Returns deterministic results
- `netlist(circuitId)` returns the full gate list for verification

## Evermo circuit

The Evermo vault calls `eval` on its rule circuit before minting credits.

Example inputs:
- Time held or position duration
- Eligibility flag
- Position size category

Example outputs:
- Credit amount
- Claim allowed indicator

The circuit is taped out on X Layer before claims are active. The processor contract address and circuit ID are included in the hackathon submission.

## DeWEB

The user interface (deposit, claim, burn, withdraw) is stored as files in a circuit container. Users open the interface through the tape:// protocol. The container is bound to a circuit NFT.

## Verification

Anyone can call `eval` and `netlist` to confirm the rules. The frontend files can be verified byte-by-byte against the on-chain container contents.
