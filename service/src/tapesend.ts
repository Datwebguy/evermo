// TAP-10 §15–16: sealed TapeSend payloads (suite 1: X25519, HKDF-SHA256, XChaCha20-Poly1305).
import { x25519 } from "@noble/curves/ed25519.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "node:crypto";
import { getBytes, concat, zeroPadValue, toBeHex } from "ethers";

const te = (s: string) => new TextEncoder().encode(s);
const cat = (...a: Uint8Array[]) => getBytes(concat(a));
const P25519 = (1n << 255n) - 19n;
const LOW_ORDER = new Set([0n, 1n, 325606250916557431795983626356110631294008115727848805560023387167927233504n,
  39382357235489614581723060781553021112529911719440698176882885853963445705823n, P25519 - 1n]);
export const XLAYER_BIT = 1n << 2n; // §2.1 bitmap bit 2

export function endpointID(chainId: number, container: string): Uint8Array {
  return cat(new Uint8Array(4), getBytes(zeroPadValue(toBeHex(chainId), 8)), getBytes(container));
}

/** §14.4 step 3. */
export function keyAcceptable(key: Uint8Array): boolean {
  if (key.length !== 32 || key[31] & 0x80) return false;
  let u = 0n; for (let i = 31; i >= 0; i--) u = (u << 8n) | BigInt(key[i]);
  return u < P25519 && !LOW_ORDER.has(u);
}

function xOf(to: Uint8Array, from: Uint8Array, ref: Uint8Array, hub: string) {
  return cat(te("TAP-10/X/v2"), to, from, ref, getBytes(hub));
}
function shared(priv: Uint8Array, pub: Uint8Array) {
  const ss = x25519.getSharedSecret(priv, pub);
  if (ss.every((b) => b === 0)) throw new Error("bad key");
  return ss;
}

export type Content = { v: 1; kind: "message"; subject?: string; body: string; ts?: number };

export function seal(keys: Uint8Array[], content: Content, to: Uint8Array, from: Uint8Array, ref: Uint8Array, hub: string): Uint8Array {
  if (keys.length < 1 || keys.length > 16) throw new Error("1..16 keys");
  for (const k of keys) if (!keyAcceptable(k)) throw new Error("recipient key rejected");
  const e = new Uint8Array(randomBytes(32)), E = x25519.getPublicKey(e);
  const N = new Uint8Array(randomBytes(24)), K = new Uint8Array(randomBytes(32));
  const D = sha256(cat(te("TAP-10/commit/v2"), K));
  const P = cat(new Uint8Array([0x54, 0x53, 0x02, 0x01]), E, N, D, new Uint8Array([keys.length]));
  const X = xOf(to, from, ref, hub);
  const S = cat(...keys.map((R) => {
    const kek = hkdf(sha256, shared(e, R), te("TAP-10/wrap/v2"), cat(E, R, X), 32);
    return cat(sha256(R).slice(0, 8), xchacha20poly1305(kek, N, cat(P, X)).encrypt(K));
  }));
  const C = xchacha20poly1305(K, N, cat(P, S, X)).encrypt(te(JSON.stringify(content)));
  const out = cat(P, S, C);
  if (out.length > 16000) throw new Error("message too large");
  return out;
}

export function open(priv: Uint8Array, payload: Uint8Array, to: Uint8Array, from: Uint8Array, ref: Uint8Array, hub: string): Content {
  if (payload.length < 93 || payload[0] !== 0x54 || payload[1] !== 0x53 || payload[2] !== 2 || payload[3] !== 1) throw new Error("unsupported");
  const n = payload[92];
  if (n < 1 || n > 16 || payload.length < 93 + 56 * n + 16) throw new Error("damaged");
  const P = payload.slice(0, 93), E = P.slice(4, 36), N = P.slice(36, 60), D = P.slice(60, 92);
  const S = payload.slice(93, 93 + 56 * n), C = payload.slice(93 + 56 * n);
  const R = x25519.getPublicKey(priv), fp = sha256(R).slice(0, 8), X = xOf(to, from, ref, hub);
  for (let i = 0; i < n; i++) {
    const slot = S.slice(56 * i, 56 * i + 56);
    if (!slot.slice(0, 8).every((b, j) => b === fp[j])) continue;
    try {
      const kek = hkdf(sha256, shared(priv, E), te("TAP-10/wrap/v2"), cat(E, R, X), 32);
      const K = xchacha20poly1305(kek, N, cat(P, X)).decrypt(slot.slice(8));
      if (!sha256(cat(te("TAP-10/commit/v2"), K)).every((b, j) => b === D[j])) continue;
      return JSON.parse(new TextDecoder().decode(xchacha20poly1305(K, N, cat(P, S, X)).decrypt(C)));
    } catch { /* try next slot */ }
  }
  throw new Error("not for this key");
}
