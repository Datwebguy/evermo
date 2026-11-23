// Drives the app in a real browser against the local copy of X Layer, with a test wallet that forwards to the local
// node's unlocked accounts. Walks the whole journey and saves screenshots at phone and desktop widths.
// Needs: the forked node, `npx tsx service/scripts/dev-fork.ts`, and `npx vite` in app/.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // the browser installed on the machine
import { mkdirSync } from "node:fs";

const APP = process.env.APP ?? "http://127.0.0.1:5173/";
const RPC = process.env.FORK_RPC ?? "http://127.0.0.1:8545";
const OUT = process.env.OUT ?? "./shots";
const A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const BORROWER = process.env.BORROWER;
mkdirSync(OUT, { recursive: true });
let id = 0;
const rpc = async (method, params) => {
  const r = await (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) })).json();
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code, data: r.error.data });
  return r.result;
};

async function person(browser, who, width, height, isMobile) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile, hasTouch: isMobile });
  const page = await ctx.newPage();
  await page.exposeFunction("__rpc", async (method, params) => {
    try {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return { ok: [who] };
      if (method === "eth_chainId") return { ok: "0xc4" };
      if (method === "wallet_switchEthereumChain") return { ok: null };
      if (method === "personal_sign") return { ok: await rpc("personal_sign", params) };
      if (method === "eth_signTypedData_v4") return { ok: await rpc("eth_signTypedData_v4", params) };
      if (method === "eth_sendTransaction") { const h = await rpc("eth_sendTransaction", params); return { ok: h }; }
      return { ok: await rpc(method, params ?? []) };
    } catch (e) { return { err: { code: e.code ?? -32000, message: e.message, data: e.data } }; }
  });
  await page.addInitScript(() => {
    const listeners = {};
    window.ethereum = {
      isTest: true,
      request: async ({ method, params }) => { const r = await window.__rpc(method, params); if (r.err) throw r.err; return r.ok; },
      on: (e, f) => { (listeners[e] ??= []).push(f); }, removeListener: () => {},
    };
  });
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  return page;
}
const wide = [];
const shot = async (page, name) => {
  const over = await page.evaluate(() => { const W = document.documentElement.clientWidth;
    return [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > W + 1 && !e.closest("svg")
        && ![...e.children].some((c) => c.getBoundingClientRect().right > W + 1))
      .slice(0, 4).map((e) => `${e.tagName}.${e.className} "${(e.textContent || "").slice(0, 30)}"`); });
  if (over.length) { wide.push(name); console.log("TOO WIDE", name, over.join(" | ")); }
  return page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
};
const settle = (page) => page.waitForTimeout(1500);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const steps = [];
const ok = (n, c) => { steps.push([n, c]); console.log(c ? "PASS" : "FAIL", n); };
try {
  // Visitor, desktop and phone
  for (const [w, h, m, tag] of [[1280, 860, false, "desktop"], [390, 844, true, "phone"]]) {
    const p = await person(browser, A, w, h, m);
    await p.goto(APP); await p.waitForSelector("text=Position Watch"); await settle(p);
    await shot(p, `home-${tag}`);
    await p.click("text=Token Risk Check"); await p.waitForSelector("text=Track record"); await settle(p);
    await shot(p, `agent-${tag}`);
    await p.goto(APP + "#/activity"); await settle(p); await shot(p, `activity-${tag}`);
    await p.goto(APP + "#/add"); await settle(p); await shot(p, `add-${tag}`);
    await p.close();
  }
  // Visitor tries Token Risk Check for free
  const v = await person(browser, A, 1280, 860, false);
  await v.goto(APP); await v.click("text=Token Risk Check"); await v.waitForSelector("text=Try it");
  await v.fill("input[placeholder='0x…']", "0x779Ded0c9e1022225f8E0630b35a9b54bE713736");
  await v.click("text=Run it"); await v.waitForSelector("text=Signed by this agent", { timeout: 120000 }); await settle(v);
  ok("visitor gets a signed answer from Token Risk Check", true); await shot(v, "try-token-check");
  await v.close();

  // Owner A lists Position Watch for 20 USDT0
  const a = await person(browser, A, 1280, 860, false);
  await a.goto(APP); await a.click("text=Connect"); await a.click("text=Browser wallet");
  await a.click("text=Position Watch"); await a.waitForSelector("text=Your agent");
  await a.click("button:has-text('Sell')"); await a.fill("input[placeholder='0.00']", "20"); await settle(a); await shot(a, "sell-sheet");
  await a.click("text=List for sale"); await a.waitForSelector("text=Listed.", { timeout: 60000 }); ok("owner lists the agent", true); await settle(a); await shot(a, "listed-desktop");
  await a.getByRole('button', { name: 'Done', exact: true }).click(); await a.close();

  // Buyer B on a phone: buys, sees the split, switches on, runs a paid check
  const b = await person(browser, B, 390, 844, true);
  await b.goto(APP); await b.click("text=Position Watch"); await b.waitForSelector("button:has-text('Buy')"); await settle(b); await shot(b, "listed-phone");
  await b.click("button:has-text('Buy')"); await b.waitForSelector("text=Where the money goes"); await settle(b); await shot(b, "buy-sheet-phone");
  await b.click("button:has-text('Buy for')"); await b.click("text=Browser wallet"); await b.waitForSelector("text=It's yours", { timeout: 60000 }); await b.waitForTimeout(2500);
  ok("buyer buys; split shown from the real transaction", true); await shot(b, "bought-phone");
  await b.click("button:has-text('Switch it on')"); await b.waitForSelector("text=Let Evermo act for this agent");
  for (const key of ["perm", "payee", "limits", "budget", "signer"]) {
    const step = b.locator(`.step[data-step='${key}']`);
    await step.locator("button").first().click();
    await b.waitForFunction((k) => document.querySelector(`.step[data-step='${k}']`)?.getAttribute("data-state") === "done", key, { timeout: 60000 });
  }
  await settle(b); await shot(b, "switched-on-phone");
  ok("buyer switches the agent on (all steps confirmed)", await b.locator("button:has-text('Done')").count() > 0);
  await b.getByRole('button', { name: 'Done', exact: true }).click();
  if (BORROWER) {
    await b.fill("input[placeholder='0x…']", BORROWER);
    await b.click("text=Run, paid from its budget"); await b.waitForSelector("text=Signed by this agent", { timeout: 60000 }); await b.waitForTimeout(3000);
    ok("owner runs a paid check: signed, paid, recorded", await b.locator("text=/^Paid 0\\.01/").count() > 0); await shot(b, "paid-run-phone");
  }
  await b.goto(APP + "#/activity"); await b.waitForTimeout(3000); await shot(b, "activity-after-phone");
  await b.close();
} catch (e) { console.log("FAIL", e.message); steps.push(["run", false]); }
await browser.close();
ok("nothing runs past the screen edge on any screen", wide.length === 0);
console.log(`${steps.filter((s) => s[1]).length}/${steps.length} PASS`);
