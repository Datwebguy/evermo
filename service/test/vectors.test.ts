// Checks against the official TAP test vectors.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet, keccak256, toUtf8Bytes, getBytes } from "ethers";
import { canonicalJSON } from "../src/canonical.ts";
import { digest, sign, recover } from "../src/tap13.ts";
import { toolsSha256 } from "../src/tools.ts";
import { amount, fmt } from "../src/pricing.ts";
import { delegationSigner, signDelegation, MAX_DELEGATION } from "../src/manifest.ts";

const v = (f: string) => JSON.parse(readFileSync(new URL("./vectors/" + f, import.meta.url), "utf8"));

test("TAP-11 canonical JSON", () => {
  for (const c of v("tap-11-canonical-json.json").cases) {
    if (c.canonical === undefined) continue;
    assert.equal(canonicalJSON(JSON.parse(c.input)), c.canonical, c.input);
    if (c.keccak256) assert.equal(keccak256(toUtf8Bytes(c.canonical)), c.keccak256);
  }
});

test("TAP-11 delegation", async () => {
  const d = v("tap-11-delegation.json");
  for (const c of d.valid) assert.equal(delegationSigner(c.chainId, d.constants.verifyingContract, c.container, c.signer, c.expires, c.sig), d.holderAddress, c.name);
  for (const c of d.invalid) {
    let who = ""; try { who = delegationSigner(c.chainId, d.constants.verifyingContract, c.container, c.signer, c.expires, c.sig); } catch { /* rejected */ }
    assert.notEqual(who, d.holderAddress, c.name);
  }
  const c = d.valid[0];
  assert.equal(await signDelegation(new Wallet(d.holderKey), c.chainId, d.constants.verifyingContract, c.container, c.signer, c.expires), c.sig);
  assert.equal(MAX_DELEGATION, 31622400);
});

test("TAP-13 envelopes", async () => {
  const d = v("tap-13-envelope.json");
  const w = new Wallet(d.signerKey);
  for (const c of d.cases) {
    assert.equal(digest(d.container, c.id, c.method, c.params, c.ok, c.body, c.ts), c.digest, c.name);
    const env = await sign(w, d.container, c.id, c.method, c.params, c.ok ? { ok: true, result: c.body } : { ok: false, error: c.body }, c.ts);
    if (c.sig) assert.equal(env.sig, c.sig, c.name);
    assert.equal(recover(env, c.method, c.params), d.signerAddress);
  }
});

test("TAP-15 tool digest", () => {
  for (const c of v("tap-15-tools-digest.json").positive) assert.equal(toolsSha256(JSON.parse(c.toolsJson)), c.toolsSha256, c.name);
});

test("TAP-17 amounts", () => {
  for (const c of v("tap-17-amounts.json").amounts) assert.equal(fmt(amount(c.price, c.usage)), c.amount, c.name);
});
