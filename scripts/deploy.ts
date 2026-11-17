/**
 * Deploys the credit token plus one vault (with Aave V3 yield source) per configured asset.
 *
 *   DEPLOYER_KEY=0x... PROCESSOR=0x... CIRCUIT_ID=1 TREASURY=0x... AAVE_POOL=0x... \
 *   ASSETS='[{"asset":"0x..","aToken":"0x..","sizeTiers":["100","1000","10000"]}]' \
 *   npx hardhat run scripts/deploy.ts --network xlayer
 *
 * sizeTiers are in whole asset units (converted to 18-decimal normalized amounts here).
 */
import { network } from "hardhat";

const env = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
};

interface AssetConfig {
  asset: string;
  aToken: string;
  sizeTiers: [string, string, string];
}

const { ethers } = await network.create();
const [deployer] = await ethers.getSigners();

const processor = env("PROCESSOR");
const circuitId = BigInt(env("CIRCUIT_ID"));
const treasury = env("TREASURY");
const aavePool = env("AAVE_POOL");
const bucketSeconds = BigInt(process.env.BUCKET_SECONDS ?? 7 * 24 * 3600);
const performanceFeeBps = Number(process.env.PERFORMANCE_FEE_BPS ?? 1000);
const claimFeeBps = Number(process.env.CLAIM_FEE_BPS ?? 200);
const assets: AssetConfig[] = JSON.parse(env("ASSETS"));

console.log(`Deployer: ${deployer.address}`);

const credit = await ethers.deployContract("EvermoCredit", [deployer.address]);
await credit.waitForDeployment();
console.log(`EvermoCredit: ${await credit.getAddress()}`);

for (const a of assets) {
  const source = await ethers.deployContract("AaveV3YieldSource", [a.asset, aavePool, a.aToken]);
  await source.waitForDeployment();

  const vault = await ethers.deployContract("EvermoVault", [
    {
      asset: a.asset,
      yieldSource: await source.getAddress(),
      credit: await credit.getAddress(),
      processor,
      circuitId,
      bucketSeconds,
      sizeTiers: a.sizeTiers.map((t) => ethers.parseUnits(t, 18)),
      treasury,
      performanceFeeBps,
      claimFeeBps,
    },
    deployer.address,
  ]);
  await vault.waitForDeployment();

  await (await source.bindVault(await vault.getAddress())).wait();
  await (await credit.setMinter(await vault.getAddress(), true)).wait();

  console.log(`Vault(${a.asset}): ${await vault.getAddress()}`);
  console.log(`  receipt: ${await vault.receipt()}`);
  console.log(`  yieldSource: ${await source.getAddress()}`);
}
