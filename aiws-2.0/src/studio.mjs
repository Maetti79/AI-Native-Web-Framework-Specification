import {
  createKernel,
  contextSlice,
  patchBytes,
  deserialize,
  resolveNode,
} from "./kernel.mjs";
import { seed } from "./graph.mjs";
import { renderGraph } from "./runtime.mjs";
import { routeIntent } from "./intent.mjs";
import { exportApplication } from "./export.mjs";
const $ = (id) => document.getElementById(id);
let selected = "mrr",
  kernel,
  unsubscribe,
  noticeTimer;
const history = [];
function notify(message, error = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = "toast show" + (error ? " error" : "");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function persist() {
  try {
    localStorage.setItem("aiws.graph", kernel.serialize());
    $("save-state").textContent = "Saved locally";
  } catch {
    $("save-state").textContent = "Not saved";
    notify(
      "Browser storage is unavailable. Export your graph to keep changes.",
      true,
    );
  }
}
function load(graph) {
  const next = createKernel(graph);
  unsubscribe?.();
  kernel = next;
  history.length = 0;
  if (!graph.nodes.some((n) => n.id === selected)) selected = graph.root;
  unsubscribe = kernel.subscribe((snapshot, change) => {
    persist();
    history.unshift(change);
    history.length = Math.min(history.length, 40);
    render();
  });
  render();
}
function choose(id) {
  selected = id;
  render();
}
function commit(ops) {
  const result = kernel.apply(ops, kernel.get().version);
  notify(
    `Committed · ${result.touched.length} nodes · ${patchBytes(ops)} bytes`,
  );
  return result;
}
function dispatch(id, event, payload) {
  try {
    kernel.dispatch(id, event, payload);
    notify("Application state updated");
  } catch (error) {
    notify(error.message, true);
  }
}
function button(text, action) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.onclick = action;
  return b;
}
function render() {
  const graph = kernel.get(),
    node = graph.nodes.find((n) => n.id === selected);
  if (!node) {
    selected = graph.root;
    return render();
  }
  const app = graph.nodes.find((n) => n.id === graph.root);
  $("application-name").textContent = app.props.title || "Application";
  $("application-badge").textContent = app.props.title || "LIVE DEMO";
  $("example-select").value =
    {
      NORTHSTAR: "northstar",
      "Counter lab": "counter",
      "PEOPLE / CRM": "contacts",
    }[app.props.title] || "";
  $("example-picker").value = $("example-select").value;
  const metrics = renderGraph(
    graph,
    $("app-preview"),
    selected,
    choose,
    dispatch,
  );
  $("compiler-metrics").textContent =
    `${metrics.compiled} compiled · ${metrics.reused} reused · ${metrics.durationMs.toFixed(2)} ms · ${metrics.bytes} artifact bytes`;
  $("version").textContent = `GRAPH v${graph.version}`;
  $("undo").disabled = !kernel.canUndo();
  $("redo").disabled = !kernel.canRedo();
  $("selection-state").textContent = "ACTIVE";
  const panel = $("selection-panel");
  panel.replaceChildren();
  const info = document.createElement("div");
  info.className = "node-info";
  const icon = document.createElement("span");
  icon.className = "node-type-icon";
  icon.textContent = "◇";
  const desc = document.createElement("div"),
    title = document.createElement("strong"),
    type = document.createElement("small");
  title.textContent =
    node.props.label || node.props.title || node.props.text || node.id;
  type.textContent = `${node.type.toUpperCase()} · #${node.id}`;
  desc.append(title, type);
  info.append(icon, desc);
  panel.append(info);
  renderData(graph, node);
  const props = $("properties");
  props.replaceChildren();
  for (const [key, value] of Object.entries(node.props)) {
    const row = document.createElement("div");
    row.className = "prop-row";
    const label = document.createElement("label");
    label.textContent = key;
    const input = document.createElement(
      typeof value === "object" ? "textarea" : "input",
    );
    const effective = resolveNode(graph, node).props[key];
    input.value =
      typeof effective === "object"
        ? JSON.stringify(effective, null, 2)
        : String(effective);
    input.id = `prop-${key}`;
    label.htmlFor = input.id;
    input.setAttribute("aria-label", key);
    if (input.tagName === "INPUT")
      input.type = typeof value === "number" ? "number" : "text";
    input.disabled = Boolean(node.bindings?.[key]);
    if (input.disabled)
      input.title = `Bound to ${node.bindings[key].node}.${node.bindings[key].key}`;
    input.onkeydown = (e) => {
      if (e.key === "Enter" && input.tagName === "INPUT") input.blur();
    };
    input.onchange = () => {
      try {
        const next =
          typeof value === "object"
            ? JSON.parse(input.value)
            : typeof value === "number"
              ? Number(input.value)
              : typeof value === "boolean"
                ? parseBoolean(input.value)
                : input.value;
        commit([{ op: "set", id: node.id, key, value: next }]);
      } catch (error) {
        notify(error.message, true);
        render();
      }
    };
    row.append(label, input);
    props.append(row);
  }
  const bindingKey = $("bind-property"),
    previousKey = bindingKey.value;
  bindingKey.replaceChildren();
  for (const key of contextSlice(graph, selected).schema) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    bindingKey.append(option);
  }
  if ([...bindingKey.options].some((o) => o.value === previousKey))
    bindingKey.value = previousKey;
  const source = $("bind-source");
  source.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "No binding (local value)";
  source.append(empty);
  for (const state of graph.nodes.filter((n) => n.type === "state")) {
    const option = document.createElement("option");
    option.value = state.id;
    option.textContent = `${state.id} · ${typeof state.props.value}`;
    source.append(option);
  }
  source.value = node.bindings?.[bindingKey.value]?.node || "";
  bindingKey.onchange = () => {
    source.value = node.bindings?.[bindingKey.value]?.node || "";
  };
  $("apply-binding").disabled = node.type === "state";
  const event =
    node.type === "input"
      ? "change"
      : node.type === "table"
        ? "remove"
        : "click";
  $("event-input").value = JSON.stringify(node.events?.[event] || [], null, 2);
  $("apply-event").disabled = !["action", "input", "table"].includes(node.type);
  $("binding-info").textContent = JSON.stringify(
    { bindings: node.bindings || {}, events: node.events || {} },
    null,
    2,
  );
  $("context-info").textContent = JSON.stringify(
    contextSlice(graph, selected),
    null,
    2,
  );
  $("delete-node").disabled =
    node.id === graph.root || node.children.length > 0;
  const explorer = $("graph-explorer");
  explorer.replaceChildren();
  const map = new Map(graph.nodes.map((n) => [n.id, n]));
  const pending = [[graph.root, 0]];
  while (pending.length) {
    const [id, depth] = pending.pop(),
      n = map.get(id);
    const b = button(`${n.id} · ${n.type} · r${n.revision || 0}`, () =>
      choose(id),
    );
    b.style.paddingLeft = `${8 + depth * 12}px`;
    b.setAttribute("aria-pressed", String(id === selected));
    explorer.append(b);
    for (const child of [...n.children].reverse())
      pending.push([child, depth + 1]);
  }
  const list = $("patch-history");
  list.replaceChildren();
  if (!history.length) {
    const li = document.createElement("li");
    li.textContent = "No changes in this session";
    list.append(li);
  }
  for (const item of history) {
    const li = document.createElement("li");
    li.textContent = `v${item.version} · ${item.undo ? "undo" : item.redo ? "redo" : JSON.stringify(item.patch)}`;
    list.append(li);
  }
  const parent = $("move-parent"),
    old = parent.value;
  parent.replaceChildren();
  for (const n of graph.nodes.filter(
    (n) => ["app", "section"].includes(n.type) && n.id !== selected,
  )) {
    const option = document.createElement("option");
    option.value = n.id;
    option.textContent = n.id;
    parent.append(option);
  }
  if ([...parent.options].some((o) => o.value === old)) parent.value = old;
}
function dataset(graph, node) {
  const key =
    node.type === "table"
      ? "rows"
      : node.type === "chart"
        ? "series"
        : node.type === "activity"
          ? "entries"
          : node.type === "state"
            ? "value"
            : null;
  if (!key) return null;
  const source = node.bindings?.[key];
  const owner = source ? graph.nodes.find((n) => n.id === source.node) : node;
  const ownerKey = source?.key || key;
  const value = owner.props[ownerKey];
  return Array.isArray(value)
    ? { owner, key: ownerKey, value, kind: node.type }
    : null;
}
function renderData(graph, node) {
  const data = dataset(graph, node),
    grid = $("data-grid");
  $("state-type-controls").hidden = node.type !== "state";
  if (node.type === "state")
    $("data-type").value =
      node.props.value === null
        ? "null"
        : Array.isArray(node.props.value)
          ? "array"
          : typeof node.props.value;
  grid.replaceChildren();
  $("add-data-row").disabled = !data;
  $("data-source").textContent = data
    ? `${data.owner.id}.${data.key} · ${data.value.length} items · native array`
    : "Select a table, chart, activity or list state to edit its dataset.";
  if (!data) return;
  const save = (value) => {
    try {
      commit([{ op: "set", id: data.owner.id, key: data.key, value }]);
    } catch (error) {
      notify(error.message, true);
      render();
    }
  };
  for (const [i, row] of data.value.entries()) {
    const line = document.createElement("div");
    line.className = "data-editor-row";
    const cells = Array.isArray(row) ? row : [row];
    if (cells.some((value) => value !== null && typeof value === "object")) {
      line.textContent = `Item ${i + 1}: edit nested records in the property inspector`;
      grid.append(line);
      continue;
    }
    for (const [j, value] of cells.entries()) {
      const input = document.createElement("input");
      input.value = value === null ? "null" : String(value);
      input.setAttribute("aria-label", `Data row ${i + 1} column ${j + 1}`);
      input.onchange = () => {
        try {
          const next = structuredClone(data.value);
          const parsed =
            typeof value === "string" ? input.value : JSON.parse(input.value);
          if (value === null ? parsed !== null : typeof parsed !== typeof value)
            throw Error("Keep the cell type unchanged");
          if (Array.isArray(row)) next[i][j] = parsed;
          else next[i] = parsed;
          save(next);
        } catch (error) {
          notify(error.message, true);
          render();
        }
      };
      line.append(input);
    }
    const remove = button("×", () =>
      save(data.value.filter((_, index) => index !== i)),
    );
    remove.setAttribute("aria-label", `Delete data row ${i + 1}`);
    remove.disabled = data.kind === "table" && i === 0;
    line.append(remove);
    grid.append(line);
  }
  $("add-data-row").onclick = () => {
    const first = data.value[0];
    const value =
      data.kind === "chart"
        ? 0
        : Array.isArray(first)
          ? first.map(() => "")
          : data.kind === "activity"
            ? ["", "", "", "", ""]
            : data.kind === "table"
              ? ["Column"]
              : "";
    save([...data.value, value]);
  };
}
function parseBoolean(text) {
  if (text === "true") return true;
  if (text === "false") return false;
  throw Error("Use true or false for a boolean");
}
function execute(text) {
  try {
    const result = routeIntent(text, selected, kernel.get());
    if (result.kind === "patch") commit(result.ops);
    else if (result.kind === "undo") {
      if (!kernel.undo()) notify("Nothing to undo");
    } else if (result.kind === "redo") {
      if (!kernel.redo()) notify("Nothing to redo");
    } else if (result.kind === "inspect") {
      $("context-panel").open = true;
      $("context-panel").scrollIntoView?.({ block: "nearest" });
      notify("Minimal context opened");
    } else notify(result.message, true);
  } catch (error) {
    notify(error.message, true);
  }
}
function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("apply-data-type").onclick = () => {
  try {
    const value = {
      string: "",
      number: 0,
      boolean: false,
      null: null,
      array: [],
      object: {},
    }[$("data-type").value];
    commit([{ op: "set", id: selected, key: "value", value }]);
  } catch (error) {
    notify(error.message, true);
  }
};
const chooseExample = async (event) => {
  const name = event.target.value;
  if (!["northstar", "counter", "contacts"].includes(name)) return;
  try {
    const response = await fetch(`examples/${name}.json`);
    if (!response.ok) throw Error("Example could not be loaded");
    load(deserialize(await response.text()));
    persist();
    notify("Example loaded");
  } catch (error) {
    notify(error.message, true);
  }
};
$("example-select").onchange = chooseExample;
$("example-picker").onchange = chooseExample;
$("send").onclick = () => {
  execute($("command").value);
  $("command").value = "";
};
$("command").onkeydown = (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    $("send").click();
  }
};
document
  .querySelectorAll("[data-example]")
  .forEach((b) => (b.onclick = () => execute(b.dataset.example)));
$("undo").onclick = () => kernel.undo();
$("redo").onclick = () => kernel.redo();
$("reset").onclick = () => {
  selected = "mrr";
  load(seed);
  persist();
  notify("Example restored");
};
$("export").onclick = () =>
  download(
    kernel.serialize(),
    "application/json",
    "aiws-application-graph.json",
  );
$("export-app").onclick = async () => {
  try {
    const html = await exportApplication(kernel.get());
    download(html, "text/html", "northstar-app.html");
    notify("Standalone application exported");
  } catch (error) {
    notify(error.message, true);
  }
};
$("import-file").onchange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000)
      throw Error("Graph files must be smaller than 2 MB");
    const graph = deserialize(await file.text());
    load(graph);
    persist();
    notify("Graph imported");
  } catch (error) {
    notify(`Import rejected: ${error.message}`, true);
  } finally {
    event.target.value = "";
  }
};
$("select-first").onclick = () => {
  choose("revenue");
  $("selection-panel").scrollIntoView?.({
    block: "nearest",
    behavior: "smooth",
  });
};
$("add-node").onclick = () => {
  try {
    const graph = kernel.get(),
      node = graph.nodes.find((n) => n.id === selected);
    const parent = ["app", "section"].includes(node.type)
      ? node.id
      : graph.nodes.find((n) => n.children.includes(selected))?.id ||
        graph.root;
    let number = 1;
    while (graph.nodes.some((n) => n.id === `component-${number}`)) number++;
    const id = `component-${number}`,
      type = $("new-type").value;
    const defaults = {
      metric: { label: "New metric", value: "0", delta: "+0%", tone: "violet" },
      heading: { text: "New heading" },
      paragraph: { text: "Describe your idea" },
      chart: {
        title: "New chart",
        period: "6 months",
        accent: "#7568f8",
        series: [20, 35, 30, 55, 60, 78],
      },
      table: {
        title: "New table",
        rows: [
          ["Name", "Status"],
          ["New workspace", "Active"],
        ],
      },
      activity: { title: "Recent activity", entries: [] },
      action: { text: "New action" },
      section: { title: "New section", layout: "stack" },
      state: { value: "" },
      input: { label: "New input", value: "" },
      badge: { label: "New workspace", progress: 0 },
    };
    commit([
      {
        op: "add",
        parent,
        node: { id, type, props: defaults[type] || {}, children: [] },
      },
    ]);
    choose(id);
  } catch (error) {
    notify(error.message, true);
  }
};
$("delete-node").onclick = () => {
  try {
    const id = selected,
      parent = kernel.get().nodes.find((n) => n.children.includes(id))?.id;
    selected = parent || kernel.get().root;
    commit([{ op: "remove", id }]);
  } catch (error) {
    notify(error.message, true);
  }
};
$("move-node").onclick = () => {
  try {
    commit([
      { op: "move", id: selected, parent: $("move-parent").value, index: 0 },
    ]);
  } catch (error) {
    notify(error.message, true);
  }
};
$("apply-binding").onclick = () => {
  try {
    const source = $("bind-source").value;
    commit([
      {
        op: "bind",
        id: selected,
        key: $("bind-property").value,
        source: source ? { node: source, key: "value" } : null,
      },
    ]);
  } catch (error) {
    notify(error.message, true);
  }
};
$("apply-event").onclick = () => {
  try {
    const node = kernel.get().nodes.find((n) => n.id === selected);
    commit([
      {
        op: "event",
        id: selected,
        event:
          node.type === "input"
            ? "change"
            : node.type === "table"
              ? "remove"
              : "click",
        actions: JSON.parse($("event-input").value),
      },
    ]);
  } catch (error) {
    notify(error.message, true);
  }
};
$("apply-patch").onclick = () => {
  try {
    commit(JSON.parse($("patch-input").value));
  } catch (error) {
    notify(`Patch rejected: ${error.message}`, true);
  }
};
document.querySelectorAll(".nav-item").forEach(
  (b) =>
    (b.onclick = () => {
      document.querySelectorAll(".nav-item").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-current", x === b ? "page" : "false");
      });
      const target = document.getElementById(b.dataset.panel);
      if (target) {
        const detail = target.closest("details");
        if (detail) detail.open = true;
        target.scrollIntoView?.({ block: "center", behavior: "smooth" });
        target.focus?.();
      }
    }),
);
document.addEventListener("keydown", (event) => {
  if (!event.metaKey && !event.ctrlKey) return;
  const tag = event.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag)) return;
  if (event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? kernel.redo() : kernel.undo();
  }
});
let initial = seed,
  loadError;
try {
  const saved = localStorage.getItem("aiws.graph");
  if (saved) initial = deserialize(saved);
} catch (error) {
  loadError = error;
}
load(initial);
if (loadError)
  notify(
    "Saved graph could not be loaded. The example is available; your stored file was not overwritten.",
    true,
  );
