# Agent prompt — building Evermo

Build Evermo on X Layer (chain ID 196): a marketplace where people buy, use and resell AI agents they own, with every
agent's rules, tools and prices checkable on chain.

Read first: `docs/PRODUCT.md`, `docs/PROJECT.md`, `docs/CIRCUIT.md`, `docs/JUDGING.md`, `docs/CLAIMS.md`.

## What to build

See the MVP table in `docs/PROJECT.md`.

## Standards

- Use TapeOut as specified in the TAPs (github.com/TapeOutProtocol/TAPs): TAP-02 netlists and `eval`, TAP-10 DeWEB and
  TapeSend, TAP-11 manifests and delegations (owner permission), TAP-13 signed responses, TAP-15 pinned MCP tools, TAP-17 AI
  receipts. See `docs/VERIFICATION.md` for verified addresses and what is still open.
- Confirm every contract address and ABI on X Layer before relying on it; never guess.
- Clean, neat, well-structured code in clear modules; actively maintained open-source tools for compiling, testing,
  deploying and verifying.
- Every feature added must be listed in `docs/CLAIMS.md` with its evidence.
- Do not list Claude as an author or co-author in the repository, commits or any metadata.
