import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const deployerKey = process.env.DEPLOYER_KEY;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    xlayer: {
      type: "http",
      chainType: "l1",
      chainId: 196,
      url: process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech",
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
});
