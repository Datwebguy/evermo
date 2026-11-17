import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

// A local copy of X Layer mainnet. Every transaction runs against the real deployed contracts; nothing is sent to the chain.
export default defineConfig({
  plugins: [hardhatEthers],
  chainDescriptors: { 196: { name: "X Layer", chainType: "l1", hardforkHistory: { cancun: { blockNumber: 0 } } } as any },
  networks: {
    xfork: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 196,
      forking: { url: process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech" },
    },
  },
});
