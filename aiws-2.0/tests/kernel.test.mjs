import test from "node:test";
import assert from "node:assert/strict";
import {
  createKernel,
  validateGraph,
  contextSlice,
  AIWSError,
} from "../src/kernel.mjs";
import { seed } from "../src/graph.mjs";
import { routeIntent } from "../src/intent.mjs";
test("seed graph validates", () => assert.equal(validateGraph(seed), true));
test("patch changes only selected property", () => {
  const k = createKernel(seed);
  const before = k.get();
  const r = k.apply([
    { op: "set", id: "mrr", key: "label", value: "New label" },
  ]);
  assert.deepEqual(r.touched, ["mrr"]);
  assert.equal(
    k.get().nodes.find((n) => n.id === "mrr").props.label,
    "New label",
  );
  assert.equal(
    before.nodes.find((n) => n.id === "mrr").props.label,
    "Monthly revenue",
  );
});
test("version conflict fails without mutation", () => {
  const k = createKernel(seed);
  assert.throws(
    () => k.apply([{ op: "set", id: "mrr", key: "label", value: "X" }], 99),
    (e) => e.code === "CONFLICT",
  );
  assert.equal(k.get().version, 0);
});
test("rollback restores after invalid transactional patch", () => {
  const k = createKernel(seed);
  assert.throws(() =>
    k.apply([
      { op: "set", id: "mrr", key: "label", value: "Changed" },
      { op: "set", id: "missing", key: "label", value: "X" },
    ]),
  );
  assert.equal(
    k.get().nodes.find((n) => n.id === "mrr").props.label,
    "Monthly revenue",
  );
});
test("undo restores graph state", () => {
  const k = createKernel(seed);
  k.apply([{ op: "set", id: "mrr", key: "value", value: "42" }]);
  assert.equal(k.undo(), true);
  assert.equal(
    k.get().nodes.find((n) => n.id === "mrr").props.value,
    "€84,290",
  );
});
test("add and remove leaf", () => {
  const k = createKernel(seed);
  k.apply([
    {
      op: "add",
      parent: "metrics",
      node: {
        id: "newmetric",
        type: "metric",
        props: { label: "Test" },
        children: [],
      },
    },
  ]);
  assert.equal(k.get().nodes.length, seed.nodes.length + 1);
  k.apply([{ op: "remove", id: "newmetric" }]);
  assert.equal(k.get().nodes.length, seed.nodes.length);
});
test("prototype pollution key is forbidden", () => {
  const k = createKernel(seed);
  assert.throws(() =>
    k.apply([{ op: "set", id: "mrr", key: "__proto__", value: "x" }]),
  );
});
test("graph cycle rejected", () => {
  const g = structuredClone(seed);
  g.nodes.find((n) => n.id === "mrr").children.push("app");
  assert.throws(() => validateGraph(g));
});
test("context slice limits target", () => {
  const c = contextSlice({ version: 0, ...seed }, "mrr");
  assert.equal(c.target.id, "mrr");
  assert.equal(c.parent.id, "metrics");
  assert.equal(c.allowed.length, 1);
});
test("deterministic command routing", () => {
  const p = routeIntent("make blue", "mrr", { version: 0, ...seed });
  assert.equal(p.kind, "patch");
  assert.equal(p.ops[0].id, "mrr");
});
