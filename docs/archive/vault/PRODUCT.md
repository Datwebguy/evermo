# Evermo — Product

## Name

Evermo

## Description

Evermo is a vault on X Layer. Users deposit stablecoins or OKB and receive a liquid receipt token. Yield from the deposit is issued as transferable credits. A permanent TapeOut circuit locks the rules that decide who can claim the credits and how much they get. The credits can be burned to pay real TapeOut protocol fees. The entire interface is hosted on DeWEB.

## Target users

Holders of stablecoins or OKB on X Layer who want to earn credits that can be used for TapeOut actions. Users who prefer permanent, verifiable rules for yield distribution. Users who interact with TapeOut circuits, processors, transistors, or DeWEB sites.

## User actions

- Deposit USDT0, USDC, or OKB
- Receive liquid receipt token
- View accrued credits
- Claim credits (on-chain circuit evaluation)
- Burn credits to pay TapeOut protocol fees
- Transfer credits to another address
- Hold credits
- Withdraw principal and remaining yield

## Value for users

- Liquid receipt token while yield accrues
- Credits that can be spent on real TapeOut protocol actions
- Claim rules permanently locked in a TapeOut circuit
- Verifiable interface hosted on DeWEB
- Direct connection between X Layer yield and TapeOut usage

## Revenue

- Fee collected on credit claims
- Fee collected when credits are burned for protocol actions
- Performance share of vault yield

## Components

- Vault contract on X Layer (chain ID 196)
- Receipt token (ERC-20)
- Credit token (ERC-20, burnable)
- TapeOut circuit defining claim eligibility and rate
- DeWEB frontend in a circuit container
- Integration with Aave or equivalent yield source on X Layer
- Integration with TapeOut protocol fee payments

## Circuit role

The TapeOut circuit receives inputs from the vault and returns the credit amount for the claim. The vault calls `eval` before minting. The netlist is frozen at tape-out. The circuit ID and processor address are recorded for the hackathon submission.

## Frontend

The deposit, claim, burn, and withdraw screens are stored in a circuit container. Users access the interface through the tape:// protocol on X Layer DeWEB.

## Development standards

Code is clean, neat, and well structured. Contracts, tokens, and frontend are organized in clear modules. Open-source tools that are actively maintained and up to date are used for compilation, testing, deployment, and verification. The repository does not list Claude as an author or co-author.
