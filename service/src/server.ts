// Evermo agent service: TAP-11 manifests, TAP-13 signed answers, TAP-15 tools, TAP-17 receipts,
// budget charges and track-record entries on X Layer, and TapeSend delivery of alerts.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { Wallet, getAddress, keccak256 } from "ethers";
import { ai, chain, deployment } from "./config.ts";
import { sign, digest, type Envelope } from "./tap13.ts";
import { buildManifest, delegationSigner, MAX_DELEGATION, type AgentDef } from "./manifest.ts";
import { encodeReceipt, meteredChat, priceOf, PATH, type Receipt } from "./ai.ts";
import { stores } from "./store.ts";
import { ownerOfCall, OWNER_HEADER } from "./auth.ts";
import { containerOf, holderOf, inboxKey, writer } from "./chain.ts";
import { seal, endpointID } from "./tapesend.ts";
import * as pw from "./agents/positionWatch.ts";
import * as trc from "./agents/tokenRiskCheck.ts";
import { verifyAgentAt } from "./verify.ts";
import { Indexer } from "./indexer.ts";
import { catalog } from "./catalog.ts";
import { provider } from "./chain.ts";
import { join } from "node:path";

const cfg = deployment();
const db = stores(cfg.dataDir);
const signer = new Wallet(cfg.operatorKey);
const op = writer(cfg.operatorKey);

type Deployed = { slug: string; kind: "positionWatch" | "tokenRiskCheck"; circuits: string; tokenId: string; priceUsdt: string;
  sender: { circuits: string; tokenId: string } };
type Agent = Deployed & { def: AgentDef; tokenIdN: bigint; container: string; agentId: string };

const defs = { positionWatch: pw.def, tokenRiskCheck: trc.def } as const;
const deployed: Deployed[] = JSON.parse(readFileSync(cfg.agentsFile, "utf8"));
const registry = op.registry(cfg.registry), budget = op.budget(cfg.budget);

const ix = new Indexer(join(cfg.dataDir, "index.db"), provider, { registry: cfg.registry, budget: cfg.budget, market: cfg.market }, cfg.deployBlock);
const cat = catalog(provider, ix, { registry: cfg.registry, market: cfg.market });
ix.start();

const agents = new Map<string, Agent>();
for (const d of deployed) {
  const tokenIdN = BigInt(d.tokenId);
  const { container, opened } = await containerOf(d.circuits, tokenIdN);
  if (!opened) throw new Error(`${d.slug}: container is not opened`);
  agents.set(d.slug, { ...d, def: defs[d.kind], tokenIdN, container, agentId: await registry.agentIdOf(d.circuits, tokenIdN) });
}

// ---------- helpers ----------
class Fail extends Error { constructor(public code: string, msg: string, public http = 200) { super(msg); } }
const usdtUnits = (s: string) => { const [i, f = ""] = s.split("."); return BigInt(i) * 1_000_000n + BigInt((f + "000000").slice(0, 6)); };

async function readBody(req: IncomingMessage, limit = 256 * 1024): Promise<Uint8Array> {
  const parts: Buffer[] = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new Fail("BAD_REQUEST", "Request too large"); parts.push(c); }
  return new Uint8Array(Buffer.concat(parts));
}
function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*",
    "access-control-expose-headers": "x-tapeapi-receipt", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

/** The owner's delegation of the signing key, valid only while the same owner holds the agent. */
async function delegationFor(a: Agent) {
  const d = db.delegations.get(a.slug);
  if (!d || d.expires <= Date.now() / 1000) return null;
  const holder = await holderOf(a.circuits, a.tokenIdN);
  return getAddress(holder) === getAddress(d.holder) ? d : null;
}

async function manifestOf(a: Agent) {
  const d = await delegationFor(a);
  if (!d) return null;
  return buildManifest({ agent: a.def, circuits: a.circuits, tokenId: a.tokenIdN, container: a.container, signer: signer.address,
    delegation: { expires: d.expires, sig: d.sig }, liveUrl: `${cfg.publicUrl}/a/${a.slug}`, model: ai.model, price: await priceOf(ai.model) });
}

/** Charges the agent's budget for one owner call. The budget circuit decides on chain. */
async function charge(a: Agent, ref: string, aiUsd: bigint) {
  // aiUsd is in 1e-8 USD; USDT0 has 6 decimals. Round up, then add the published margin.
  const aiUnits = (aiUsd * (10_000n + cfg.aiMarginBps) + 10_000n * 100n - 1n) / (10_000n * 100n);
  const total = usdtUnits(a.priceUsdt) + aiUnits;
  if (total === 0n) return { charged: "0", allowed: true, tx: null as string | null };
  const [, allowed] = await budget.check(a.agentId, op.address, cfg.usdt0, cfg.payee, total);
  const tx = await budget.pay(a.agentId, cfg.usdt0, cfg.payee, total, ref);
  await tx.wait();
  return { charged: (Number(total) / 1e6).toFixed(6), allowed: Boolean(allowed), tx: tx.hash as string };
}

async function record(a: Agent, ref: string) {
  const tx = await registry.recordWork(a.agentId, ref);
  await tx.wait();
  return tx.hash as string;
}

/** Sends a sealed message to the agent's container over TapeSend. Returns null when the owner has no inbox key. */
async function deliver(a: Agent, subject: string, body: string) {
  const k = await inboxKey(a.circuits, a.tokenIdN);
  if (!k) return null;
  const sender = await containerOf(a.sender.circuits, BigInt(a.sender.tokenId));
  const ref = new Uint8Array(randomBytes(32));
  const payload = seal([k.key], { v: 1, kind: "message", subject, body, ts: Date.now() }, k.endpoint, endpointID(chain.id, sender.container), ref, chain.hub);
  const tx = await op.send(a.sender.circuits, BigInt(a.sender.tokenId), k.endpoint, ref, payload);
  await tx.wait();
  return tx.hash as string;
}

// ---------- methods ----------
async function run(a: Agent, method: string, params: any): Promise<{ result: any; aiUsd: bigint; receipt?: Receipt }> {
  if (a.kind === "positionWatch" && method === "health") return { result: await pw.health(params), aiUsd: 0n };
  if (a.kind === "tokenRiskCheck" && method === "check") {
    const facts = await trc.facts(params);
    const req = new TextEncoder().encode(JSON.stringify({ model: ai.model, messages: [
      { role: "system", content: "You review tokens for everyday traders. Using only the facts given, write 3 to 5 short sentences in plain words: what the token is, who can change it, how much liquidity it has, and what to be careful about. Do not invent facts. If something is unknown, say so." },
      { role: "user", content: JSON.stringify(facts) }], reasoning_effort: "minimal" }));
    const m = await meteredChat(signer, a.container, ai.model, req);
    db.receipts.set(`${a.slug}:${m.receipt.id}`, m.receipt);
    const summary = m.status === 200 ? m.json?.choices?.[0]?.message?.content ?? null : null;
    const usd = m.receipt.result as any;
    const aiUsd = usd.prices ? usdToUnits(usd.prices[0].amount) : 0n;
    return { result: { ...facts, summary, summaryReceipt: m.receipt.id }, aiUsd, receipt: m.receipt };
  }
  throw new Fail("METHOD_NOT_FOUND", "This agent has no method " + method);
}
const usdToUnits = (s: string) => BigInt(s.replace(".", ""));

async function call(a: Agent, req: IncomingMessage, method: string): Promise<{ env: Envelope; extra?: Record<string, string> }> {
  let id = "", params: any = {};
  const ts = () => Math.floor(Date.now() / 1000);
  try {
    let body: any;
    try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readBody(req))); } catch { throw new Fail("BAD_REQUEST", "Body is not JSON"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Fail("BAD_REQUEST", "Body must be an object");
    if (typeof body.id !== "string" || body.id.length < 1 || body.id.length > 128 || !body.id.isWellFormed()) throw new Fail("BAD_REQUEST", "id must be a string of 1 to 128 characters");
    id = body.id;
    if (body.method !== undefined && body.method !== method) throw new Fail("BAD_REQUEST", "method does not match the path");
    params = body.params ?? {};
    if (typeof params !== "object" || Array.isArray(params) || params === null) throw new Fail("BAD_REQUEST", "params must be an object");

    if (method === "receipt") {
      const r = typeof params.id === "string" ? db.receipts.get(`${a.slug}:${params.id}`) : undefined;
      if (!r || (params.requestSha256 && r.params.requestSha256 !== params.requestSha256)) throw new Fail("BAD_REQUEST", "No receipt with this id");
      return { env: await sign(signer, a.container, id, method, params, { ok: true, result: r }) };
    }

    const owner = ownerOfCall(req.headers[OWNER_HEADER] as string | undefined, a.agentId, id, method, params);
    const holder = getAddress(await holderOf(a.circuits, a.tokenIdN));
    const isOwner = owner !== null && getAddress(owner) === holder;
    if (owner !== null && !isOwner) throw new Fail("BAD_REQUEST", "Only the agent's current owner can make paid calls");
    if (isOwner) {
      const key = `${a.slug}:${holder}:${id}`;
      if (db.calls.get(key)) throw new Fail("BAD_REQUEST", "This request id was already used");
      db.calls.set(key, ts());
    }

    const out = await run(a, method, params);
    const env = await sign(signer, a.container, id, method, params, { ok: true, result: out.result });
    if (!isOwner) return { env };

    // Owner call: the signed answer's digest is the reference on chain.
    const ref = digest(a.container, id, method, params, true, out.result, env.ts);
    const paid = await charge(a, ref, out.aiUsd);
    const work = paid.allowed ? await record(a, ref) : null;
    return { env, extra: { "x-evermo-ref": ref, "x-evermo-payment": JSON.stringify(paid), ...(work ? { "x-evermo-record": work } : {}) } };
  } catch (e: any) {
    const f = e instanceof Fail ? e : e instanceof pw.BadInput ? new Fail("BAD_REQUEST", e.message) : new Fail("INTERNAL", "The agent could not finish this request");
    if (!(e instanceof Fail) && !(e instanceof pw.BadInput)) console.error(e);
    return { env: await sign(signer, a.container, id, method, params, { ok: false, error: { code: f.code, message: f.message } }) };
  }
}

// ---------- MCP (tools/list, tools/call) ----------
async function mcp(a: Agent, req: IncomingMessage) {
  const m = JSON.parse(new TextDecoder().decode(await readBody(req)));
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: m.id ?? null, result });
  if (m.method === "initialize") return reply({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: a.def.name, version: "1" } });
  if (m.method === "tools/list") return reply({ tools: a.def.tools });
  if (m.method === "tools/call") {
    try {
      const { result } = await run(a, m.params?.name, m.params?.arguments ?? {});
      return reply({ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result });
    } catch (e: any) { return reply({ content: [{ type: "text", text: e.message }], isError: true }); }
  }
  return { jsonrpc: "2.0", id: m.id ?? null, error: { code: -32601, message: "Method not found" } };
}

// ---------- watches: Position Watch checks owners' accounts and sends alerts ----------
let watching = false;
async function watchOnce() {
  if (watching) return; // one round at a time, so an alert is never sent or charged twice
  watching = true;
  try {
  for (const [key, w] of db.watches.all()) {
    const a = agents.get(w.slug);
    if (!a) continue;
    try {
      const holder = getAddress(await holderOf(a.circuits, a.tokenIdN));
      if (holder !== getAddress(w.holder)) { db.watches.delete(key); continue; } // new owner: the old owner's watch ends
      const h = await pw.health({ account: w.account, warnBelow: w.warnBelow });
      if (h.atRisk && !w.atRisk) {
        const id = "watch-" + randomBytes(8).toString("hex");
        const env = await sign(signer, a.container, id, "health", { account: w.account, warnBelow: w.warnBelow }, { ok: true, result: h });
        const ref = digest(a.container, id, "health", { account: w.account, warnBelow: w.warnBelow }, true, h, env.ts);
        const paid = await charge(a, ref, 0n);
        if (paid.allowed) {
          await record(a, ref);
          await deliver(a, "Lending health warning", `${h.summary}\nAccount ${h.account}\nCollateral $${h.collateralUsd}, debt $${h.debtUsd}.\nSigned answer: ${JSON.stringify(env)}`);
        }
      }
      db.watches.set(key, { ...w, atRisk: h.atRisk });
    } catch (e) { console.error("watch", key, e); }
  }
  } finally { watching = false; }
}

// ---------- routes ----------
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "OPTIONS") return send(res, 204, "", { "access-control-allow-headers": `content-type, authorization, ${OWNER_HEADER}`, "access-control-allow-methods": "GET, POST" });
    if (req.method === "GET" && url.pathname === "/check-agent") {
      const at = url.searchParams.get("url") ?? "";
      if (!/^https:\/\/[^\s]+$/.test(at)) return send(res, 400, { error: "Give the agent's https address" });
      const c = await verifyAgentAt(at, { chainId: chain.id, hub: chain.hub, holderOf, containerOf });
      return send(res, 200, { ok: c.ok, problems: c.problems, name: c.manifest?.name ?? null, circuits: c.manifest?.circuits ?? null, tokenId: c.manifest?.tokenId ?? null });
    }
    if (req.method === "GET" && url.pathname === "/agents") return send(res, 200, { agents: await cat.list(), indexedTo: ix.head() });
    const ah = url.pathname.match(/^\/agents\/(0x[0-9a-fA-F]{64})(\/history)?$/);
    if (req.method === "GET" && ah) {
      if (ah[2]) return send(res, 200, { items: ix.history(ah[1]), indexedTo: ix.head() });
      return send(res, 200, await cat.get(ah[1]));
    }
    if (req.method === "GET" && url.pathname === "/activity") return send(res, 200, { items: ix.recent(), indexedTo: ix.head() });
    if (req.method === "GET" && url.pathname === "/live") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", "access-control-allow-origin": "*", connection: "keep-alive" });
      const on = (it: unknown) => res.write(`data: ${JSON.stringify(it)}\n\n`);
      const ping = setInterval(() => res.write(": ping\n\n"), 25000);
      ix.on("item", on);
      req.on("close", () => { ix.off("item", on); clearInterval(ping); });
      return;
    }
    if (url.pathname === "/health") return send(res, 200, { ok: true, agents: [...agents.keys()] });
    const m = url.pathname.match(/^\/a\/([a-z0-9-]+)(\/.*)?$/);
    const a = m && agents.get(m[1]);
    if (!a) return send(res, 404, { error: "Not found" });
    const rest = m![2] ?? "/";

    if (req.method === "GET" && rest === "/.well-known/tapeapi.json") {
      const man = await manifestOf(a);
      return man ? send(res, 200, man) : send(res, 404, { error: "The owner has not switched this agent on yet" });
    }
    if (req.method === "POST" && rest === "/delegation") {
      const b = JSON.parse(new TextDecoder().decode(await readBody(req)));
      const now = Date.now() / 1000;
      if (!Number.isSafeInteger(b.expires) || b.expires <= now || b.expires > now + MAX_DELEGATION) return send(res, 400, { error: "The end date must be within 366 days" });
      const by = delegationSigner(chain.id, chain.hub, a.container, signer.address, b.expires, b.sig);
      const holder = await holderOf(a.circuits, a.tokenIdN);
      if (getAddress(by) !== getAddress(holder)) return send(res, 403, { error: "Only the agent's current owner can switch it on" });
      db.delegations.set(a.slug, { holder: getAddress(holder), expires: b.expires, sig: b.sig });
      return send(res, 200, { ok: true, signer: signer.address });
    }
    if (req.method === "POST" && rest === "/watch" && a.kind === "positionWatch") {
      const b = JSON.parse(new TextDecoder().decode(await readBody(req)));
      const params = { account: b.account, warnBelow: b.warnBelow ?? "1.2" };
      const owner = ownerOfCall(req.headers[OWNER_HEADER] as string | undefined, a.agentId, String(b.id ?? ""), "watch", params);
      const holder = getAddress(await holderOf(a.circuits, a.tokenIdN));
      if (!owner || getAddress(owner) !== holder) return send(res, 403, { error: "Only the agent's current owner can set a watch" });
      await pw.health(params); // validates the account and level
      db.watches.set(`${a.slug}:${getAddress(params.account)}`, { slug: a.slug, account: getAddress(params.account), warnBelow: params.warnBelow, atRisk: false, holder });
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && rest === "/mcp") return send(res, 200, await mcp(a, req));
    if (req.method === "POST" && rest === PATH) {
      const body = await readBody(req, 1024 * 1024);
      let parsed: any; try { parsed = JSON.parse(new TextDecoder().decode(body)); } catch { parsed = null; }
      if (!parsed || parsed.stream === true) return send(res, 400, { error: { message: "Send a JSON request without streaming", type: "invalid_request_error", param: null, code: null } }, { "x-tapeapi-sidecar-error": "1" });
      const owner = ownerOfCall(req.headers[OWNER_HEADER] as string | undefined, a.agentId, keccak256(body), "openai_chat", {});
      const holder = getAddress(await holderOf(a.circuits, a.tokenIdN));
      if (!owner || getAddress(owner) !== holder) return send(res, 403, { error: { message: "Only the agent's current owner can use its AI", type: "permission_error", param: null, code: null } }, { "x-tapeapi-sidecar-error": "1" });
      const mt = await meteredChat(signer, a.container, typeof parsed.model === "string" ? parsed.model : ai.model, body);
      db.receipts.set(`${a.slug}:${mt.receipt.id}`, mt.receipt);
      const r = mt.receipt.result as any;
      if (r.prices) await charge(a, digest(a.container, mt.receipt.id, "openai_chat", mt.receipt.params, true, r, mt.receipt.ts), usdToUnits(r.prices[0].amount));
      res.writeHead(mt.status, { "content-type": mt.contentType, "x-tapeapi-receipt": encodeReceipt(mt.receipt),
        "access-control-allow-origin": "*", "access-control-expose-headers": "x-tapeapi-receipt" });
      return res.end(mt.body);
    }
    const mm = rest.match(/^\/([A-Za-z_][A-Za-z0-9_]{0,63})$/);
    if (req.method === "POST" && mm) {
      const { env, extra } = await call(a, req, mm[1]);
      return send(res, 200, env, extra);
    }
    return send(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: "Something went wrong" });
  }
});

server.listen(cfg.port, () => console.log(`Evermo agent service on :${cfg.port} (${[...agents.keys()].join(", ")})`));
setInterval(() => void watchOnce(), cfg.watchEveryMinutes * 60_000);
