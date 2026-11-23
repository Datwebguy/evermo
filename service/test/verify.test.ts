import { test } from "node:test";
import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { verifyManifest } from "../src/verify.ts";
import { signDelegation } from "../src/manifest.ts";

const hub = "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee";
const circuits = "0x60918C204F3c94630D3D793738Fc36293c8405D6";
const now = 1_800_000_000;

async function fixture() {
  const owner = Wallet.createRandom(), signer = Wallet.createRandom(), container = Wallet.createRandom().address;
  const expires = now + 86400;
  const m = { tapeapi: "0.1", name: "Outside agent", circuits, tokenId: "7", container, signer: signer.address,
    delegation: { expires, sig: await signDelegation(owner, 196, hub, container, signer.address, expires) },
    endpoints: { live: ["https://agent.example/api"] }, methods: [{ name: "ask", priceBEM: "0", params: {}, returns: "x", description: "x" }] };
  let holder = owner.address;
  const chain = { chainId: 196, hub, holderOf: async () => holder, containerOf: async () => ({ container, opened: true }) };
  return { m, chain, setHolder: (a: string) => { holder = a; } };
}

test("an outside agent approved by its current owner passes", async () => {
  const { m, chain } = await fixture();
  assert.deepEqual((await verifyManifest(m, chain, now)).problems, []);
});

test("after the agent changes hands the old approval is refused", async () => {
  const { m, chain, setHolder } = await fixture();
  setHolder(Wallet.createRandom().address);
  assert.match((await verifyManifest(m, chain, now)).problems.join(), /current owner/);
});

test("wrong container, expired approval and plain http are refused", async () => {
  const f = await fixture();
  assert.equal((await verifyManifest({ ...f.m, container: Wallet.createRandom().address }, f.chain, now)).ok, false);
  assert.equal((await verifyManifest(f.m, f.chain, now + 2 * 86400)).ok, false);
  assert.equal((await verifyManifest({ ...f.m, endpoints: { live: ["http://x"] } }, f.chain, now)).ok, false);
});
