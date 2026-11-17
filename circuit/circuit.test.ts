import assert from "node:assert/strict";
import { test } from "node:test";
import { NUM_INPUTS, reference, toBits } from "./rules.ts";
import { evaluate, synthesize } from "./synth.ts";

test("netlist matches the reference rules for every input", () => {
  const net = synthesize();
  for (let row = 0; row < 1 << NUM_INPUTS; row++) {
    const bits = toBits(row);
    assert.deepEqual(evaluate(net, bits), reference(bits), `row ${row}`);
  }
});

test("rule sanity", () => {
  const net = synthesize();
  const run = (bucket: number, eligible: number, size: number) =>
    evaluate(net, [bucket & 1, (bucket >> 1) & 1, (bucket >> 2) & 1, eligible, size & 1, (size >> 1) & 1]);
  assert.equal(run(0, 1, 3)[4], 0); // too young
  assert.equal(run(5, 0, 3)[4], 0); // ineligible
  assert.equal(run(1, 1, 0)[4], 1);
  assert.deepEqual(run(7, 1, 3).slice(0, 4), [1, 1, 1, 1]); // saturates at tier 15
});
