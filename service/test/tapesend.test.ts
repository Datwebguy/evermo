import { test } from "node:test";
import assert from "node:assert/strict";
import { x25519 } from "@noble/curves/ed25519.js";
import { randomBytes } from "node:crypto";
import { seal, open, endpointID } from "../src/tapesend.ts";

const hub = "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee";
const to = endpointID(196, "0x1111111111111111111111111111111111111111");
const from = endpointID(196, "0x2222222222222222222222222222222222222222");
const ref = new Uint8Array(32).fill(7);

test("sealed message opens only for the recipient, sender, ref and hub it was made for", () => {
  let r: Uint8Array, R: Uint8Array;
  do { r = new Uint8Array(randomBytes(32)); R = x25519.getPublicKey(r); } while (R[31] & 0x80);
  const msg = { v: 1 as const, kind: "message" as const, subject: "Alert", body: "Health 1.08" };
  const p = seal([R], msg, to, from, ref, hub);
  assert.deepEqual(open(r, p, to, from, ref, hub), msg);
  assert.throws(() => open(r, p, to, from, new Uint8Array(32), hub));
  assert.throws(() => open(r, p, from, to, ref, hub));
  assert.throws(() => open(new Uint8Array(randomBytes(32)), p, to, from, ref, hub));
});
