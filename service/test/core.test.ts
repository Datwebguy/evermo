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

test("metering of a real NEAR AI usage object", () => {
  const p = { currency: "USD", unit: "1M tokens" as const, input: "0.05", output: "0.40", cacheRead: "0.005" };
  const u = usageFromOpenAI({ prompt_tokens: 13, completion_tokens: 74, completion_tokens_details: { reasoning_tokens: 64 } })!;
  assert.equal(fmt(amount(p, u)), "0.00003025");
  assert.equal(usageFromOpenAI({ prompt_tokens: 1 }), null);
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
