# Agent Prompt — Evermo

Build Evermo on X Layer.

Evermo is a vault. Users deposit USDT0, USDC, or OKB and receive a liquid receipt token. The vault earns yield from Aave or an equivalent position on X Layer. When a user claims, the contract calls `eval` on a taped-out TapeOut circuit. The circuit returns the allowed credit amount according to its permanent netlist. The user receives Evermo credits. Credits can be burned to pay TapeOut protocol fees (processor creation, transistor minting, or DeWEB uploads). The interface is hosted in a DeWEB circuit container and accessed via tape://.

## What to build

- Vault contract on X Layer (chain ID 196)
- Receipt token (ERC-20)
- Credit token (ERC-20 with burn function)
- TapeOut circuit for claim eligibility and credit rate
- Contract logic that calls `eval` before every credit mint
- DeWEB frontend with deposit, claim, burn, and withdraw screens
- Integration points for TapeOut protocol fee payments
- Clean module structure for contracts and frontend

## Standards

- Write clean, neat, and well-structured code
- Use actively maintained, up-to-date open-source tools for compilation, testing, deployment, and verification
- Organize files in clear directories and modules
- Do not list Claude as an author or co-author in the repository, commits, or any metadata

## Chain and references

- Chain ID: 196
- RPC: https://rpc.xlayer.tech
- Hackathon: https://web3.okx.com/xlayer/build-x-series
- Submission form: https://forms.gle/EoDNbxQ65dev1wFd9
- TapeOut: https://tapeout.net/
- TapeOut data: https://tapeout.work/
- X Layer: https://web3.okx.com/xlayer
- Aave X Layer markets: https://aavetracker.com/markets/x-layer/

## Submission details to prepare

- Processor contract address
- Circuit ID
- DeWEB access link
- Description of the circuit inputs and outputs
- Explanation of users, revenue, and TapeOut integration
