import { test } from "node:test";
import assert from "node:assert/strict";
import { specs, netlistOf } from "../src/rules.ts";
import { assertWellFormed, decode, encode, evaluate, packBits, unpackBits } from "../src/netlist.ts";

for (const spec of specs) {
  test(`${spec.name}: matches its rule on every input`, () => {
    const net = netlistOf(spec);
    assertWellFormed(net);
    const n = spec.inputs.length;
    for (let v = 0; v < 1 << n; v++) {
      const bits = Array.from({ length: n }, (_, i) => (v >> i) & 1);
      assert.deepEqual(evaluate(net, bits), spec.reference(bits), `inputs ${bits.join("")}`);
    }
  });

  test(`${spec.name}: encodes and decodes losslessly`, () => {
    const net = netlistOf(spec);
    assert.deepEqual(decode(encode(net), net.nIn, net.nOut), net);
  });
}

test("bit packing is least significant bit first", () => {
  assert.equal(packBits([1, 0, 1, 1]), "0x0d");
  assert.deepEqual(unpackBits("0x0d", 4), [1, 0, 1, 1]);
  assert.equal(packBits([0, 0, 0, 0, 0, 0, 0, 0, 1]), "0x0001");
});
