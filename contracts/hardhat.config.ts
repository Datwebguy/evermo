import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";

const rpc = process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech";
const deployerKey = process.env.DEPLOYER_KEY;

export default defineConfig({
  plugins: [hardhatEthers, hardhatNodeTestRunner],
  solidity: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun" } },
  chainDescriptors: { 196: { name: "X Layer", chainType: "l1", hardforkHistory: { cancun: { blockNumber: 0 } } } as any },
  networks: {
    xfork: { type: "edr-simulated", chainType: "l1", chainId: 196, forking: { url: rpc } },
    xlayer: { type: "http", chainType: "l1", chainId: 196, url: rpc, accounts: deployerKey ? [deployerKey] : [] },
  },
});
