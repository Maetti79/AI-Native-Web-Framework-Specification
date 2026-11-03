import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createKernel,
  deserialize,
  migrateGraph,
  validateGraph,
  resolveNode,
} from "../src/kernel.mjs";
import { assertValue, canonicalValue } from "../dist/data.mjs";
import { createCompiler } from "../dist/compiler.mjs";
import { seed } from "../src/graph.mjs";
const legacy = JSON.parse(
  await readFile(
    new URL("./fixtures/northstar-v1.json", import.meta.url),
    "utf8",
  ),
);
const contacts = JSON.parse(
  await readFile(new URL("../examples/contacts.json", import.meta.url), "utf8"),
);
const node = (g, id) => g.nodes.find((n) => n.id === id);
test("schema-1 migration is immutable, version-preserving and upgrades bound data and cycle actions", () => {
  const old = structuredClone(legacy);
  old.version = 17;
  const before = JSON.stringify(old),
    graph = migrateGraph(old);
  assert.equal(JSON.stringify(old), before);
  assert.equal(graph.schemaVersion, 2);
  assert.equal(graph.version, 17);
  assert.ok(Array.isArray(node(graph, "revenue").props.series));
  assert.ok(Array.isArray(node(graph, "series-state").props.value));
  assert.ok(
    Array.isArray(node(graph, "period-action").events.click[1].values[0]),
  );
  const k = createKernel(graph);
  k.dispatch("period-action", "click");
  assert.deepEqual(
    node(k.get(), "series-state").props.value,
    [40, 52, 59, 55, 69, 78],
  );
  assert.equal(k.get().version, 18);
});
test("unversioned legacy graphs migrate; omitted literal values do not hide bound data", () => {
  const old = structuredClone(legacy);
  delete old.schemaVersion;
  delete node(old, "revenue").props.series;
  const graph = deserialize(JSON.stringify(old));
  assert.ok(Array.isArray(node(graph, "series-state").props.value));
  assert.equal(validateGraph(graph), true);
});
test("migration is idempotent and does not guess at arbitrary text state", () => {
  const graph = migrateGraph(seed);
  assert.deepEqual(migrateGraph(graph), graph);
  const old = structuredClone(legacy);
  node(old, "search-state").props.value = "[1,2,3]";
  assert.equal(node(migrateGraph(old), "search-state").props.value, "[1,2,3]");
});
test("malformed legacy datasets and future schemas fail before replacing current state", () => {
  const old = structuredClone(legacy);
  node(old, "series-state").props.value = "not JSON";
  assert.throws(
    () => deserialize(JSON.stringify(old)),
    (e) => e.code === "MIGRATION",
  );
  assert.throws(() =>
    deserialize(JSON.stringify({ ...seed, schemaVersion: 99 })),
  );
  assert.equal(
    node(legacy, "series-state").props.value,
    "[23,30,26,38,35,44,40,52,59,55,69,78]",
  );
});
test("structured state roundtrips nested records, arrays, numbers, booleans and null", () => {
  const k = createKernel(seed);
  const value = {
    profile: { name: "Maya", active: true },
    tags: ["design", null],
    score: 4.5,
  };
  k.apply([
    {
      op: "add",
      parent: "app",
      node: { id: "record", type: "state", props: { value }, children: [] },
    },
  ]);
  assert.deepEqual(
    node(deserialize(k.serialize()), "record").props.value,
    value,
  );
  value.profile.name = "Mutated";
  assert.equal(node(k.get(), "record").props.value.profile.name, "Maya");
});
test("data bounds reject cycles, non-finite numbers, excessive depth and prototype keys", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => assertValue(cyclic));
  assert.throws(() => assertValue({ n: Infinity }));
  let deep = 0;
  for (let i = 0; i < 10; i++) deep = { value: deep };
  assert.throws(() => assertValue(deep));
  assert.throws(() =>
    assertValue(JSON.parse('{"__proto__":{"polluted":true}}')),
  );
  assert.throws(() => assertValue(new Date()));
  assert.equal({}.polluted, undefined);
});
test("structured property validation rejects malformed series and mismatched table widths atomically", () => {
  const k = createKernel(seed),
    before = k.serialize();
  assert.throws(() =>
    k.apply([{ op: "set", id: "revenue", key: "series", value: "[1,2]" }]),
  );
  assert.throws(() =>
    k.apply([
      {
        op: "set",
        id: "subscriptions",
        key: "rows",
        value: [["Name", "Plan"], ["Acme"]],
      },
    ]),
  );
  assert.equal(k.serialize(), before);
});
test("canonical addresses ignore nested record key insertion order", () => {
  assert.equal(
    canonicalValue({ b: 2, a: { y: 2, x: 1 } }),
    canonicalValue({ a: { x: 1, y: 2 }, b: 2 }),
  );
  const k = createKernel(seed);
  k.apply([
    {
      op: "add",
      parent: "app",
      node: {
        id: "record",
        type: "state",
        props: { value: { a: 1, b: 2 } },
        children: [],
      },
    },
  ]);
  const compiler = createCompiler();
  compiler.compile(k.get());
  k.apply([{ op: "set", id: "record", key: "value", value: { b: 2, a: 1 } }]);
  assert.equal(compiler.compile(k.get()).compiled, 0);
});
function fill(
  k,
  name = "Maya Chen",
  company = "Orbit Studio",
  email = "maya@example.com",
) {
  k.dispatch("name", "change", name);
  k.dispatch("company", "change", company);
  k.dispatch("email", "change", email);
}
test("contact form appends its candidate row and clears all drafts in one undoable transaction", () => {
  const k = createKernel(contacts);
  fill(k);
  const before = k.get();
  k.dispatch("create", "click");
  assert.equal(k.get().version, before.version + 1);
  assert.deepEqual(node(k.get(), "contacts").props.value.at(-1), [
    "Maya Chen",
    "Orbit Studio",
    "maya@example.com",
  ]);
  assert.equal(node(k.get(), "draft-name").props.value, "");
  k.undo();
  assert.deepEqual(k.get().nodes, before.nodes);
  k.redo();
  assert.equal(node(k.get(), "contacts").props.value.length, 5);
});
test("required form data and oversized target arrays reject without clearing drafts or history", () => {
  const k = createKernel(contacts);
  fill(k, "", "Orbit", "maya@example.com");
  let before = k.serialize();
  assert.throws(
    () => k.dispatch("create", "click"),
    (e) => e.code === "REQUIRED",
  );
  assert.equal(k.serialize(), before);
  const rows = [
    ["Name", "Company", "Email"],
    ...Array.from({ length: 499 }, (_, i) => [
      String(i),
      "Acme",
      "mail@example.com",
    ]),
  ];
  k.apply([{ op: "set", id: "contacts", key: "value", value: rows }]);
  fill(k);
  before = k.serialize();
  assert.throws(() => k.dispatch("create", "click"));
  assert.equal(k.serialize(), before);
});
test("row deletion uses original dataset indices; header deletion and stale indices are rejected", () => {
  const k = createKernel(contacts);
  k.dispatch("search", "change", "Sofia");
  k.dispatch("directory", "remove", 3);
  assert.equal(node(k.get(), "contacts").props.value.length, 3);
  assert.equal(node(k.get(), "contacts").props.value[1][0], "Amelia Brooks");
  const before = k.serialize();
  assert.throws(() => k.dispatch("directory", "remove", 0));
  assert.throws(() => k.dispatch("directory", "remove", 99));
  assert.equal(k.serialize(), before);
  k.undo();
  assert.equal(
    resolveNode(k.get(), node(k.get(), "directory")).props.rows[3][0],
    "Sofia Rossi",
  );
});
test("append references must target existing scalar state", () => {
  const graph = structuredClone(contacts);
  node(graph, "create").events.click[0].items[0] = {
    source: { node: "contacts", key: "value" },
  };
  assert.throws(() => createKernel(graph));
});
