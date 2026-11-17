// Opens a real on-chain site through the official https gateway in headless Chromium, with a simulated wallet extension.
import { chromium } from "playwright";

const SITE = process.env.SITE ?? "https://4246-0.tapekit.org/";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext();
await ctx.addInitScript(() => { window.ethereum = { isTestWallet: true, request: async () => null }; });
const page = await ctx.newPage();
await page.goto(SITE, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
let result;
for (let i = 0; i < 20 && !result; i++) {
  await page.waitForTimeout(4000);
  try {
    const ready = await page.evaluate(() => !!navigator.serviceWorker?.controller && document.readyState === "complete");
    if (!ready) continue;
    await page.waitForTimeout(3000);
    result = await page.evaluate(async () => {
      const r = { servedByGatewayWorker: !!navigator.serviceWorker.controller, walletVisible: !!window.ethereum?.isTestWallet };
      try {
        const res = await fetch("https://rpc.xlayer.tech", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
        r.xlayerRpc = (await res.json()).result;
      } catch (e) { r.xlayerRpc = "blocked"; }
      try { localStorage.setItem("t", "1"); r.storage = localStorage.getItem("t") === "1"; } catch { r.storage = false; }
      return r;
    });
  } catch { /* the gateway reloads once after installing its service worker */ }
}
console.log(SITE, JSON.stringify(result));
await browser.close();
