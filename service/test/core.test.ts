import { test } from "node:test";
import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { canonicalJSON } from "../src/canonical.ts";
import { sign, recover } from "../src/tap13.ts";
import { amount, fmt, usageFromOpenAI, pricesFromModels } from "../src/pricing.ts";
import { toolsSha256 } from "../src/tools.ts";

test("canonical JSON sorts keys and drops undefined", () => {
  assert.equal(canonicalJSON({ b: 1, a: [true, null, "x"], c: undefined }), '{"a":[true,null,"x"],"b":1}');
});

test("signed answers recover to the signer and break on tampering", async () => {
  const w = Wallet.createRandom();
  const c = Wallet.createRandom().address;
  const env = await sign(w, c, "r1", "check", { token: "0xabc" }, { ok: true, result: { score: 3 } }, 1_800_000_000);
  assert.equal(recover(env, "check", { token: "0xabc" }), w.address);
  assert.notEqual(recover({ ...env, result: { score: 4 } }, "check", { token: "0xabc" }), w.address);
  assert.notEqual(recover(env, "check", { token: "0xabd" }), w.address);
});

test("metering uses integer maths and rounds up", () => {
  const p = { currency: "USD", unit: "1M tokens" as const, input: "0.05", output: "0.40", cacheRead: "0.005" };
  const u = usageFromOpenAI({ prompt_tokens: 13, completion_tokens: 74, completion_tokens_details: { reasoning_tokens: 64 } });
  // 0.05*13 + 0.40*74 = 0.65 + 29.6 = 30.25 µUSD → 30.25e-6 USD = 3025 units of 1e-8 → ceil(3025e6... ) 
  assert.equal(amount(p, u), 3025n);
  assert.equal(fmt(3025n), "0.00003025");
  assert.equal(amount(p, { prompt: 1, completion: 0, cacheRead: 0, reasoning: 0 }), 5n);
  assert.equal(amount(p, { prompt: 3, completion: 0, cacheRead: 3, reasoning: 0 }), 2n); // 0.015e-6 USD → 1.5 → 2
});

test("prices are read from the provider list", () => {
  const m = pricesFromModels({ data: [{ id: "x/y", textPricing: { currency: "USD", unit: "million_tokens", tiers: { default: { short: { uncachedInput: "0.05", cachedInput: "0.005", output: "0.40" } } } } }, { id: "bad" }] });
  assert.deepEqual(m.get("x/y"), { currency: "USD", unit: "1M tokens", input: "0.05", output: "0.40", cacheRead: "0.005" });
  assert.equal(m.size, 1);
});

test("tool hash ignores order and uncovered fields, changes on description edits", () => {
  const a = { name: "a", description: "A", inputSchema: { type: "object" } };
  const b = { name: "b", description: "B", inputSchema: { type: "object" } };
  const h = toolsSha256([a, b]);
  assert.equal(h, toolsSha256([b, { ...a, extra: 1 } as any]));
  assert.notEqual(h, toolsSha256([{ ...a, description: "A!" }, b]));
});
