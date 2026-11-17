# Verification scripts

Reproduce every check in `docs/VERIFICATION.md`. Nothing here spends real funds.

```sh
cd verification
npm install
npm run live      # read-only checks on X Layer mainnet: deployments, beacon, eval, fees, processors
npm run fork      # full TapeOut flow on a local copy of X Layer mainnet
npm run gateway   # opens an on-chain site through the official https gateway (needs Chromium; set CHROMIUM_PATH to use a local one)
```

`npm run fork` prints PASS/FAIL for: minting a NAND, taping out, `eval`, opening a container, uploading a site file, an
uploader key, sending a TapeSend message to an agent's inbox, and control moving to the new owner after a sale.

Set `XLAYER_RPC_URL` to use another X Layer RPC.
