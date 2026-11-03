import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
test("studio compound command, inspector, history, undo/redo and persisted reload", async () => {
  const dom = new JSDOM(
    await readFile(new URL("../index.html", import.meta.url), "utf8"),
    { url: "http://localhost:4173" },
  );
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  await import("../src/studio.mjs");
  const $ = (id) => document.getElementById(id);
  $("command").value =
    "Make this card dark blue and change its title to Revenue.";
  $("send").click();
  assert.match(
    document.querySelector('[data-aiws-id="mrr"]').textContent,
    /Revenue/,
  );
  assert.equal($("patch-history").children.length, 1);
  assert.equal(
    JSON.parse(localStorage.getItem("aiws.graph")).nodes.find(
      (n) => n.id === "mrr",
    ).props.background,
    "#142e58",
  );
  $("undo").click();
  assert.match(
    document.querySelector('[data-aiws-id="mrr"]').textContent,
    /Monthly revenue/,
  );
  $("redo").click();
  assert.match(
    document.querySelector('[data-aiws-id="mrr"]').textContent,
    /Revenue/,
  );
  assert.match($("compiler-metrics").textContent, /1 compiled/);
  document.querySelector('[data-aiws-id="users"]').click();
  assert.match($("selection-panel").textContent, /#users/);
  const input = document.querySelector('input[aria-label="label"]');
  input.value = "Customers";
  input.dispatchEvent(new dom.window.Event("change"));
  assert.match(
    document.querySelector('[data-aiws-id="users"]').textContent,
    /Customers/,
  );
  const saved = localStorage.getItem("aiws.graph");
  const reload = new JSDOM(
    await readFile(new URL("../index.html", import.meta.url), "utf8"),
    { url: "http://localhost:4173" },
  );
  globalThis.document = reload.window.document;
  globalThis.localStorage = reload.window.localStorage;
  localStorage.setItem("aiws.graph", saved);
  await import("../src/studio.mjs?reload");
  assert.match(
    document.querySelector('[data-aiws-id="users"]').textContent,
    /Customers/,
  );
  dom.window.close();
  reload.window.close();
});
