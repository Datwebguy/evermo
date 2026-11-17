# Evermo — Project

## Overview

Evermo is a vault on X Layer. Users deposit stablecoins or OKB and receive a liquid receipt token. Yield from the deposit is issued as transferable credits. A permanent TapeOut circuit locks the rules that decide who can claim the credits and how much they get. The credits can be burned to pay real TapeOut protocol fees. The entire interface is hosted on DeWEB.

## Goals

- Provide a liquid receipt for deposits on X Layer
- Turn vault yield into transferable credits
- Lock eligibility and credit rate rules in a permanent TapeOut circuit
- Allow credits to be burned for TapeOut protocol fee payments
- Host the user interface in a DeWEB circuit container
- Deliver a working product that uses TapeOut circuits and DeWEB on X Layer

## User flow

1. User deposits USDT0, USDC, or OKB into the Evermo vault on X Layer.
2. User receives a liquid receipt token that can be transferred, traded, or used in other contracts.
3. The vault places the assets into a yield position (Aave or equivalent interest-bearing position on X Layer).
4. User initiates a claim.
5. The vault contract calls `eval` on the taped-out TapeOut circuit with the relevant inputs.
6. The circuit returns the allowed credit amount according to the permanent netlist.
7. The vault mints Evermo credits to the user.
8. User can burn credits to cover TapeOut protocol fees, transfer the credits, or hold them.
9. User can withdraw the deposited principal and remaining yield by burning the receipt token.

## Architecture

- Vault contract (Solidity) on X Layer
- Receipt token (ERC-20)
- Credit token (ERC-20 with burn)
- TapeOut circuit (NAND/LATCH netlist) for claim rules
- DeWEB frontend stored in a circuit container
- Access via tape:// protocol

## Hackathon alignment

- Uses TapeOut circuits on X Layer through `eval` calls
- Frontend runs on X Layer DeWEB
- Clear product, users, and revenue path
- Permanent on-chain rules
- Direct integration with TapeOut protocol fee usage

## Development

All code is clean, neat, and well structured. Development uses actively maintained open-source tools that are kept up to date. The repository does not list Claude as an author or co-author.
