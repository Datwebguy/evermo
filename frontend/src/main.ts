import { BrowserProvider, Contract, JsonRpcSigner, formatUnits, id, parseUnits } from "ethers";
import { CREDIT_ABI, ERC20_ABI, VAULT_ABI } from "./abi";
import { CHAIN_ID, CREDIT_ADDRESS, VAULTS } from "./config";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const setText = (sel: string, text: string) => ($(sel).textContent = text);

let signer: JsonRpcSigner | undefined;

function status(message: string, isError = false) {
  const el = $("#status");
  el.textContent = message;
  el.dataset.error = String(isError);
}

async function run(label: string, fn: () => Promise<void>) {
  try {
    status(`${label}…`);
    await fn();
    status(`${label}: done`);
    await refresh();
  } catch (err) {
    status(err instanceof Error ? err.message : String(err), true);
  }
}

function selectedVault() {
  const cfg = VAULTS[Number($<HTMLSelectElement>("#vault").value)];
  if (!cfg || !signer) throw new Error("Connect your wallet and pick a vault");
  return new Contract(cfg.vault, VAULT_ABI, signer);
}

async function tokens() {
  const vault = selectedVault();
  const asset = new Contract(await vault.asset(), ERC20_ABI, signer);
  const receipt = new Contract(await vault.receipt(), ERC20_ABI, signer);
  const credit = new Contract(CREDIT_ADDRESS, CREDIT_ABI, signer);
  return { vault, asset, receipt, credit, decimals: Number(await asset.decimals()), symbol: await asset.symbol() };
}

async function refresh() {
  if (!signer) return;
  const { vault, asset, receipt, credit, decimals, symbol } = await tokens();
  const me = await signer.getAddress();
  const [wallet, held, pending, preview, creditBal] = await Promise.all([
    asset.balanceOf(me),
    receipt.balanceOf(me),
    vault.pendingYield(me),
    vault.previewClaim(me),
    credit.balanceOf(me),
  ]);
  setText("#wallet", `${formatUnits(wallet, decimals)} ${symbol}`);
  setText("#receipt", `${formatUnits(held, decimals)} ev${symbol}`);
  setText("#pending", `${formatUnits(pending, decimals)} ${symbol}`);
  setText("#rate", preview.allowed ? `${Number(preview.rateBps) / 100}%` : "claim not allowed yet");
  setText("#credits-preview", `${formatUnits(preview.creditsAfterFee, 18)} EVC`);
  setText("#credit-balance", `${formatUnits(creditBal, 18)} EVC`);
}

async function connect() {
  const eth = (window as unknown as { ethereum?: ConstructorParameters<typeof BrowserProvider>[0] }).ethereum;
  if (!eth) return status("No wallet found. Install an EVM wallet.", true);
  const provider = new BrowserProvider(eth);
  await provider.send("eth_requestAccounts", []);
  if (Number((await provider.getNetwork()).chainId) !== CHAIN_ID) {
    await provider.send("wallet_switchEthereumChain", [{ chainId: "0x" + CHAIN_ID.toString(16) }]);
  }
  signer = await new BrowserProvider(eth).getSigner();
  $("#connect").textContent = `${(await signer.getAddress()).slice(0, 6)}…${(await signer.getAddress()).slice(-4)}`;
  await refresh();
}

function init() {
  const select = $<HTMLSelectElement>("#vault");
  VAULTS.forEach((v, i) => select.append(new Option(v.label, String(i))));
  if (!VAULTS.length || !CREDIT_ADDRESS) status("No deployment configured (see frontend/src/config.ts).", true);

  select.addEventListener("change", () => void refresh());
  $("#connect").addEventListener("click", () => void run("Connecting", connect));

  $("#deposit").addEventListener("click", () =>
    run("Deposit", async () => {
      const { vault, asset, decimals } = await tokens();
      const amount = parseUnits($<HTMLInputElement>("#deposit-amount").value, decimals);
      const me = await signer!.getAddress();
      if ((await asset.allowance(me, await vault.getAddress())) < amount) {
        await (await asset.approve(await vault.getAddress(), amount)).wait();
      }
      await (await vault.deposit(amount)).wait();
    }),
  );

  $("#claim").addEventListener("click", () =>
    run("Claim", async () => {
      await (await selectedVault().claim()).wait();
    }),
  );

  $("#burn").addEventListener("click", () =>
    run("Burn", async () => {
      const { credit } = await tokens();
      const amount = parseUnits($<HTMLInputElement>("#burn-amount").value, 18);
      const action = id($<HTMLSelectElement>("#burn-action").value);
      await (await credit.burnForFee(amount, action, "0x")).wait();
    }),
  );

  $("#withdraw").addEventListener("click", () =>
    run("Withdraw", async () => {
      const { vault, decimals } = await tokens();
      const amount = parseUnits($<HTMLInputElement>("#withdraw-amount").value, decimals);
      await (await vault.withdraw(amount)).wait();
    }),
  );
}

init();
