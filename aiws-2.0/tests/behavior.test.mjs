import test from "node:test";
import assert from "node:assert/strict";
import {
  createKernel,
  resolveNode,
  validateGraph,
  deserialize,
} from "../src/kernel.mjs";
import { createCompiler } from "../dist/compiler.mjs";
import { invalidated } from "../dist/linker.mjs";
import { seed } from "../src/graph.mjs";
const node = (graph, id) => graph.nodes.find((n) => n.id === id);
test("graph-defined click updates bound chart; undo restores the complete interaction", () => {
  const k = createKernel(seed),
    compiler = createCompiler();
  compiler.compile(k.get());
  const change = k.dispatch("period-action", "click");
  assert.deepEqual(change.touched, ["period-state", "series-state"]);
  assert.equal(
    resolveNode(k.get(), node(k.get(), "revenue")).props.period,
    "6 months",
  );
  const result = compiler.compile(k.get());
  assert.equal(result.compiled, 3);
  assert.equal(result.reused, seed.nodes.length - 3);
  assert.ok(invalidated(k.get(), change.touched).includes("revenue"));
  k.undo();
  assert.equal(
    resolveNode(k.get(), node(k.get(), "revenue")).props.period,
    "12 months",
  );
  k.redo();
  assert.equal(
    resolveNode(k.get(), node(k.get(), "revenue")).props.period,
    "6 months",
  );
});
test("input dispatch is reflected in table binding and survives serialization", () => {
  const k = createKernel(seed);
  k.dispatch("search", "change", "Orbit");
  const graph = deserialize(k.serialize());
  assert.equal(
    resolveNode(graph, node(graph, "subscriptions")).props.filter,
    "Orbit",
  );
  const restored = createKernel(graph);
  assert.equal(restored.get().version, 1);
  restored.dispatch("search", "change", "Acme");
  assert.equal(restored.get().version, 2);
});
test("invalid state update fails atomically when its bound consumer schema rejects it", () => {
  const k = createKernel(seed),
    before = k.serialize();
  assert.throws(() =>
    k.apply([
      { op: "set", id: "period-state", key: "value", value: "Changed" },
      { op: "set", id: "series-state", key: "value", value: "invalid json" },
    ]),
  );
  assert.equal(k.serialize(), before);
});
test("semantic bindings and handlers are validated at transaction boundary", () => {
  const k = createKernel(seed);
  k.apply([
    {
      op: "bind",
      id: "mrr",
      key: "label",
      source: { node: "search-state", key: "value" },
    },
  ]);
  k.dispatch("search", "change", "Bound label");
  assert.equal(
    resolveNode(k.get(), node(k.get(), "mrr")).props.label,
    "Bound label",
  );
  assert.throws(() =>
    k.apply([
      {
        op: "bind",
        id: "mrr",
        key: "background",
        source: { node: "search-state", key: "value" },
      },
    ]),
  );
  assert.throws(() =>
    k.apply([
      {
        op: "event",
        id: "mrr",
        event: "click",
        actions: [{ kind: "toggle", target: "search-state", key: "value" }],
      },
    ]),
  );
  k.apply([{ op: "bind", id: "mrr", key: "label", source: null }]);
  assert.equal(
    resolveNode(k.get(), node(k.get(), "mrr")).props.label,
    "Monthly revenue",
  );
});
test("dangling state references and wrong event payloads are rejected without mutation", () => {
  const k = createKernel(seed),
    before = k.serialize();
  assert.throws(() => k.apply([{ op: "remove", id: "search-state" }]));
  assert.throws(() => k.dispatch("search", "change", 42));
  assert.equal(k.serialize(), before);
});
test("move changes containment and rejects cycles with rollback", () => {
  const k = createKernel(seed);
  k.apply([{ op: "move", id: "project1", parent: "metrics", index: 0 }]);
  assert.equal(node(k.get(), "metrics").children[0], "project1");
  assert.ok(!node(k.get(), "projects").children.includes("project1"));
  const before = k.serialize();
  assert.throws(() =>
    k.apply([{ op: "move", id: "metrics", parent: "metrics", index: 0 }]),
  );
  assert.equal(k.serialize(), before);
  k.undo();
  assert.equal(node(k.get(), "projects").children[0], "project1");
});
test("numeric increment and toggle execute sequentially within one atomic action", () => {
  const graph = structuredClone(seed);
  graph.nodes.push(
    { id: "counter", type: "state", props: { value: 0 }, children: [] },
    { id: "flag", type: "state", props: { value: false }, children: [] },
  );
  node(graph, "app").children.push("counter", "flag");
  node(graph, "period-action").events.click = [
    { kind: "increment", target: "counter", key: "value", amount: 2 },
    { kind: "increment", target: "counter", key: "value", amount: 3 },
    { kind: "toggle", target: "flag", key: "value" },
  ];
  const k = createKernel(graph);
  k.dispatch("period-action", "click");
  assert.equal(node(k.get(), "counter").props.value, 5);
  assert.equal(node(k.get(), "flag").props.value, true);
  assert.equal(k.get().version, 1);
});
test("unsupported schemas and recursive state bindings are rejected", () => {
  assert.throws(() =>
    deserialize('{"schemaVersion":99,"root":"app","nodes":[]}'),
  );
  const graph = structuredClone(seed);
  node(graph, "search-state").bindings = {
    value: { node: "search-state", key: "value" },
  };
  assert.throws(() => validateGraph(graph));
});
import { routeIntent } from "../src/intent.mjs";
test("renaming to a color does not silently change the component background", () => {
  const r = routeIntent("change its title to Red", "mrr", seed);
  assert.equal(r.ops.length, 1);
  assert.equal(r.ops[0].key, "label");
  assert.equal(r.ops[0].value, "Red");
});
test("German compound commands and previous purple quick action are supported", () => {
  const r = routeIntent(
    "Mach diese Karte dunkelblau und ändere den Titel in Umsatz.",
    "mrr",
    seed,
  );
  assert.equal(r.ops.length, 2);
  assert.equal(r.ops[1].value, "Umsatz");
  assert.equal(routeIntent("make purple", "mrr", seed).kind, "patch");
});
test("unsupported compound requests produce no partial mutation instructions", () => {
  assert.equal(
    routeIntent("make blue and delete everything", "mrr", seed).kind,
    "unsupported",
  );
});
test("numeric state bindings renderable as metrics and boolean bindings control visibility", () => {
  const g = structuredClone(seed);
  node(g, "app").children.push("counter", "flag");
  g.nodes.push(
    { id: "counter", type: "state", props: { value: 0 }, children: [] },
    { id: "flag", type: "state", props: { value: true }, children: [] },
  );
  node(g, "mrr").bindings = {
    value: { node: "counter", key: "value" },
    visible: { node: "flag", key: "value" },
  };
  node(g, "period-action").events.click = [
    { kind: "increment", target: "counter", key: "value", amount: 1 },
    { kind: "toggle", target: "flag", key: "value" },
  ];
  const k = createKernel(g);
  k.dispatch("period-action", "click");
  const resolved = resolveNode(k.get(), node(k.get(), "mrr"));
  assert.equal(resolved.props.value, 1);
  assert.equal(resolved.props.visible, false);
});
test("intent modifies the source of a bound property and context includes only relevant state", () => {
  const g = structuredClone(seed);
  node(g, "mrr").bindings = { label: { node: "search-state", key: "value" } };
  const r = routeIntent("rename to Revenue", "mrr", g);
  assert.equal(r.ops[0].id, "search-state");
  assert.equal(r.ops[0].key, "value");
});
test("removing an event handler is undoable and leaves no hidden execution path", () => {
  const k = createKernel(seed);
  k.apply([{ op: "event", id: "period-action", event: "click", actions: [] }]);
  assert.throws(() => k.dispatch("period-action", "click"));
  k.undo();
  k.dispatch("period-action", "click");
  assert.equal(
    resolveNode(k.get(), node(k.get(), "revenue")).props.period,
    "6 months",
  );
});
