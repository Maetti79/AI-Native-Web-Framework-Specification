export type Scalar = string | number | boolean;
export type NodeType =
  | "app"
  | "section"
  | "metric"
  | "chart"
  | "activity"
  | "action"
  | "heading"
  | "paragraph"
  | "badge"
  | "table"
  | "state"
  | "input";
export interface Binding {
  node: string;
  key: string;
}
export type Action =
  | { kind: "set"; target: string; key: string; value: Scalar }
  | { kind: "increment"; target: string; key: string; amount: number }
  | { kind: "toggle"; target: string; key: string }
  | { kind: "cycle"; target: string; key: string; values: Scalar[] }
  | { kind: "input"; target: string; key: string };
export interface GraphNode {
  bindings?: Record<string, Binding>;
  events?: Partial<Record<"click" | "change", Action[]>>;
  id: string;
  type: NodeType;
  props: Record<string, Scalar>;
  children: string[];
  revision?: number;
}
export interface Graph {
  schemaVersion?: 1;
  version?: number;
  root: string;
  nodes: GraphNode[];
}
export type Operation =
  | { op: "set"; id: string; key: string; value: Scalar }
  | { op: "add"; parent: string; node: GraphNode }
  | { op: "remove"; id: string }
  | { op: "bind"; id: string; key: string; source: Binding | null }
  | { op: "event"; id: string; event: "click" | "change"; actions: Action[] }
  | { op: "move"; id: string; parent: string; index: number };
export interface Change {
  version: number;
  touched: string[];
  patch?: Operation[];
  undo?: boolean;
  redo?: boolean;
}
export const TYPES: NodeType[] = [
  "app",
  "section",
  "metric",
  "chart",
  "activity",
  "action",
  "heading",
  "paragraph",
  "badge",
  "table",
  "state",
  "input",
];
export const OPS = ["set", "add", "remove", "bind", "event", "move"];
export class AIWSError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AIWSError";
  }
}
const clone = <T,>(x: T): T => structuredClone(x);
const safeId = (x: unknown): x is string =>
  typeof x === "string" && /^[a-z][a-z0-9._-]{0,63}$/i.test(x);
const fields: Record<NodeType, string[]> = {
  app: ["title", "subtitle"],
  section: ["title", "subtitle", "layout"],
  metric: ["label", "value", "delta", "tone", "symbol", "background"],
  chart: ["title", "subtitle", "period", "accent", "series"],
  activity: ["title", "subtitle", "entries"],
  action: ["text", "title", "tone"],
  heading: ["text", "title"],
  paragraph: ["text", "title"],
  state: ["value"],
  input: ["label", "value", "placeholder"],
  table: ["title", "rows", "filter"],
  badge: ["label", "detail", "progress", "tone"],
};
for (const type of TYPES) if (type !== "state") fields[type].push("visible");
const isScalar = (value: unknown): value is Scalar =>
  !(typeof value === "string" && value.length > 12000) &&
  ["string", "number", "boolean"].includes(typeof value) &&
  !(typeof value === "number" && !Number.isFinite(value));
function validatePropertyNode(node: GraphNode) {
  const root: GraphNode = {
    id: "validation-root",
    type: "app",
    props: {},
    children: [node.id],
  };
  if (node.type === "app") {
    validateGraph({ ...{ root: node.id, nodes: [{ ...node, children: [] }] } });
    return;
  }
  if (node.id === root.id) root.id = "validation-other";
  validateGraph({ root: root.id, nodes: [root, { ...node, children: [] }] });
}
export function validateGraph(graph: Graph): true {
  if (
    graph?.version !== undefined &&
    (!Number.isSafeInteger(graph.version) || graph.version < 0)
  )
    throw new AIWSError("VERSION", "Invalid graph version");
  if (
    !graph ||
    !safeId(graph.root) ||
    !Array.isArray(graph.nodes) ||
    graph.nodes.length > 5000 ||
    (graph.schemaVersion !== undefined && graph.schemaVersion !== 1)
  )
    throw new AIWSError("GRAPH", "Invalid graph schema");
  const map = new Map<string, GraphNode>();
  const parents = new Map<string, number>();
  for (const n of graph.nodes) {
    if (!n || !safeId(n.id) || !TYPES.includes(n.type) || map.has(n.id))
      throw new AIWSError("NODE", "Invalid or duplicate node");
    if (!n.props || typeof n.props !== "object" || Array.isArray(n.props))
      throw new AIWSError("PROPS", "Invalid properties");
    for (const [key, v] of Object.entries(n.props)) {
      if (
        !fields[n.type].includes(key) ||
        !["string", "number", "boolean"].includes(typeof v) ||
        (typeof v === "number" && !Number.isFinite(v)) ||
        String(v).length >
          (n.type === "state" || ["series", "entries", "rows"].includes(key)
            ? 12000
            : 300)
      )
        throw new AIWSError("PROPS", `Invalid ${n.type}.${key}`);
      if (key === "progress" && (typeof v !== "number" || v < 0 || v > 100))
        throw new AIWSError("PROPS", "Progress must be 0–100");
      if (
        ["accent", "background"].includes(key) &&
        !(typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v))
      )
        throw new AIWSError("PROPS", "Expected hex color");
      if (["series", "entries", "rows"].includes(key)) {
        let data;
        try {
          data = JSON.parse(String(v));
        } catch {
          throw new AIWSError("DATA", "Invalid JSON data");
        }
        if (!Array.isArray(data) || data.length > 50)
          throw new AIWSError("DATA", "Expected bounded array");
        if (
          key === "series" &&
          (data.length < 2 ||
            !data.every(
              (x: unknown) =>
                typeof x === "number" &&
                Number.isFinite(x) &&
                x >= 0 &&
                x <= 100,
            ))
        )
          throw new AIWSError("DATA", "Invalid chart series");
        if (
          key !== "series" &&
          !data.every(
            (row: unknown) =>
              Array.isArray(row) &&
              row.length <= 5 &&
              row.every((x) => typeof x === "string"),
          )
        )
          throw new AIWSError("DATA", "Expected text rows");
      }
      if (key === "visible" && typeof v !== "boolean")
        throw new AIWSError("PROPS", "Visibility must be boolean");
      if (
        n.type !== "state" &&
        key !== "progress" &&
        key !== "visible" &&
        !(n.type === "metric" && key === "value" && typeof v === "number") &&
        typeof v !== "string"
      )
        throw new AIWSError("PROPS", "Expected text");
    }
    if (n.type === "state" && !Object.hasOwn(n.props, "value"))
      throw new AIWSError("STATE", "State requires a value");
    if (
      n.props.layout !== undefined &&
      !["metrics", "projects", "stack", "dashboard"].includes(
        String(n.props.layout),
      )
    )
      throw new AIWSError("LAYOUT", "Invalid layout");
    if (
      !Array.isArray(n.children) ||
      !n.children.every(safeId) ||
      new Set(n.children).size !== n.children.length
    )
      throw new AIWSError("CHILDREN", "Invalid children");
    if (n.children.length && !["app", "section"].includes(n.type))
      throw new AIWSError("CHILDREN", "Only containers accept children");
    if (
      n.revision !== undefined &&
      (!Number.isSafeInteger(n.revision) || n.revision < 0)
    )
      throw new AIWSError("VERSION", "Invalid node revision");
    map.set(n.id, n);
    for (const id of n.children) parents.set(id, (parents.get(id) || 0) + 1);
  }
  for (const n of graph.nodes) {
    if (
      n.bindings !== undefined &&
      (!n.bindings ||
        typeof n.bindings !== "object" ||
        Array.isArray(n.bindings))
    )
      throw new AIWSError("BINDING", "Invalid bindings");
    for (const [key, b] of Object.entries(n.bindings || {})) {
      const source = b && map.get(b.node);
      if (
        n.type === "state" ||
        !fields[n.type].includes(key) ||
        !source ||
        source.type !== "state" ||
        b.key !== "value"
      )
        throw new AIWSError("BINDING", "Binding requires a state value");
      const resolved = {
        ...n,
        bindings: undefined,
        events: undefined,
        props: { ...n.props, [key]: source.props[b.key] },
        children: [],
      };
      // Validate the property through the same schema on an isolated single-child graph.
      validatePropertyNode(resolved);
    }
    if (
      n.events !== undefined &&
      (!n.events || typeof n.events !== "object" || Array.isArray(n.events))
    )
      throw new AIWSError("EVENT", "Invalid event map");
    for (const [event, actions] of Object.entries(n.events || {})) {
      if (
        !["click", "change"].includes(event) ||
        !Array.isArray(actions) ||
        !actions.length ||
        actions.length > 40
      )
        throw new AIWSError("EVENT", "Invalid event");
      if (
        (event === "click" && n.type !== "action") ||
        (event === "change" && n.type !== "input")
      )
        throw new AIWSError("EVENT", "Unsupported event on component");
      for (const a of actions) {
        const target = a && map.get(a.target);
        if (!target || target.type !== "state" || a.key !== "value")
          throw new AIWSError("EVENT", "Actions target state values");
        const value = target.props.value;
        if (a.kind === "increment") {
          if (
            typeof value !== "number" ||
            typeof a.amount !== "number" ||
            !Number.isFinite(a.amount)
          )
            throw new AIWSError("EVENT", "Increment requires numbers");
        } else if (a.kind === "toggle") {
          if (typeof value !== "boolean")
            throw new AIWSError("EVENT", "Toggle requires a boolean");
        } else if (a.kind === "set") {
          if (typeof a.value !== typeof value || !isScalar(a.value))
            throw new AIWSError("EVENT", "Set requires a compatible scalar");
        } else if (a.kind === "cycle") {
          if (
            !Array.isArray(a.values) ||
            a.values.length < 2 ||
            a.values.length > 20 ||
            !a.values.every(
              (v: unknown) => isScalar(v) && typeof v === typeof value,
            )
          )
            throw new AIWSError("EVENT", "Cycle values must match state");
        } else if (a.kind === "input") {
          if (event !== "change" || typeof value !== "string")
            throw new AIWSError("EVENT", "Input requires text state");
        } else throw new AIWSError("EVENT", "Unknown action");
      }
    }
  }
  if (
    !map.has(graph.root) ||
    map.get(graph.root)!.type !== "app" ||
    parents.has(graph.root)
  )
    throw new AIWSError("ROOT", "Invalid root");
  for (const n of graph.nodes)
    if (n.id !== graph.root && parents.get(n.id) !== 1)
      throw new AIWSError("PARENT", "Exactly one parent required");
  const seen = new Set<string>(),
    pending = [graph.root];
  while (pending.length) {
    const id = pending.pop()!;
    if (seen.has(id)) throw new AIWSError("CYCLE", "Cycle");
    const n = map.get(id);
    if (!n) throw new AIWSError("REF", "Missing reference");
    seen.add(id);
    pending.push(...n.children);
  }
  if (seen.size !== map.size)
    throw new AIWSError("ORPHAN", "Unreachable nodes");
  return true;
}
export function createKernel(initial: Graph) {
  validateGraph(initial);
  let state = clone(initial),
    version = initial.version ?? 0;
  const history: Graph[] = [],
    future: Graph[] = [],
    listeners = new Set<(g: Graph, c: Change) => void>();
  const get = (): Graph => clone({ ...state, schemaVersion: 1, version });
  const notify = (c: Change) => {
    for (const fn of listeners) {
      try {
        fn(get(), clone(c));
      } catch (e) {
        console.error("Graph subscriber failed", e);
      }
    }
  };
  function apply(patch: Operation[], expectedVersion = version): Change {
    if (expectedVersion !== version)
      throw new AIWSError("CONFLICT", "Stale graph version");
    if (!Array.isArray(patch) || !patch.length || patch.length > 40)
      throw new AIWSError("PATCH", "1–40 operations required");
    const next = clone(state),
      map = new Map(next.nodes.map((n) => [n.id, n])),
      touched = new Set<string>();
    for (const op of patch) {
      if (!op || !OPS.includes(op.op))
        throw new AIWSError("OP", "Unknown operation");
      if (op.op === "set") {
        const n = map.get(op.id);
        if (!n) throw new AIWSError("REF", "Unknown node");
        if (!fields[n.type].includes(op.key))
          throw new AIWSError("KEY", "Unknown property");
        n.props[op.key] = op.value;
        touched.add(n.id);
      } else if (op.op === "add") {
        const parent = map.get(op.parent);
        if (
          !parent ||
          !op.node ||
          map.has(op.node.id) ||
          op.node.children?.length
        )
          throw new AIWSError("ADD", "Invalid leaf insertion");
        const n = clone(op.node);
        map.set(n.id, n);
        parent.children.push(n.id);
        touched.add(parent.id);
        touched.add(n.id);
      } else if (op.op === "bind") {
        const n = map.get(op.id);
        if (!n || !fields[n.type].includes(op.key))
          throw new AIWSError("BINDING", "Unknown target property");
        n.bindings = { ...n.bindings };
        if (op.source === null) delete n.bindings[op.key];
        else n.bindings[op.key] = clone(op.source);
        touched.add(n.id);
      } else if (op.op === "event") {
        const n = map.get(op.id);
        if (!n) throw new AIWSError("REF", "Unknown node");
        n.events = { ...n.events };
        if (Array.isArray(op.actions) && op.actions.length === 0)
          delete n.events[op.event];
        else n.events[op.event] = clone(op.actions);
        touched.add(n.id);
      } else if (op.op === "move") {
        const n = map.get(op.id),
          parent = map.get(op.parent);
        if (
          !n ||
          op.id === next.root ||
          !parent ||
          !["app", "section"].includes(parent.type) ||
          !Number.isInteger(op.index) ||
          op.index < 0
        )
          throw new AIWSError("MOVE", "Invalid move");
        for (const p of map.values())
          if (p.children.includes(op.id)) {
            p.children = p.children.filter((id) => id !== op.id);
            touched.add(p.id);
          }
        if (op.index > parent.children.length)
          throw new AIWSError("MOVE", "Index out of range");
        parent.children.splice(op.index, 0, op.id);
        touched.add(parent.id);
        touched.add(n.id);
      } else {
        const n = map.get(op.id);
        if (!n || n.children.length || op.id === next.root)
          throw new AIWSError("REMOVE", "Only leaves can be removed");
        for (const parent of map.values())
          if (parent.children.includes(op.id)) {
            parent.children = parent.children.filter((id) => id !== op.id);
            touched.add(parent.id);
          }
        map.delete(op.id);
        touched.add(op.id);
      }
    }
    next.nodes = [...map.values()];
    for (const id of touched) {
      const n = map.get(id);
      if (n) n.revision = (n.revision || 0) + 1;
    }
    validateGraph(next);
    history.push(state);
    if (history.length > 40) history.shift();
    future.length = 0;
    state = next;
    version++;
    const result = { version, touched: [...touched], patch: clone(patch) };
    notify(result);
    return result;
  }
  function restore(from: Graph[], to: Graph[], kind: "undo" | "redo") {
    const next = from.pop();
    if (!next) return false;
    to.push(state);
    const touched = [
      ...new Set([...state.nodes, ...next.nodes].map((n) => n.id)),
    ];
    state = next;
    version++;
    notify({ version, touched, [kind]: true });
    return true;
  }
  function dispatch(id: string, event: "click" | "change", payload?: Scalar) {
    const actions = state.nodes.find((n) => n.id === id)?.events?.[event];
    if (!actions) throw new AIWSError("EVENT", "No event handler");
    const values = new Map(state.nodes.map((n) => [n.id, clone(n.props)]));
    const patch: Operation[] = [];
    for (const a of actions) {
      const props = values.get(a.target)!;
      const old = props[a.key];
      let value: Scalar;
      switch (a.kind) {
        case "set":
          value = a.value;
          break;
        case "increment":
          value = Number(old) + a.amount;
          break;
        case "toggle":
          value = !old;
          break;
        case "cycle":
          value = a.values[(a.values.indexOf(old) + 1) % a.values.length];
          break;
        case "input":
          if (typeof payload !== "string")
            throw new AIWSError("EVENT", "Expected text input");
          value = payload;
          break;
      }
      props[a.key] = value;
      patch.push({ op: "set", id: a.target, key: a.key, value });
    }
    return apply(patch);
  }
  return {
    get,
    apply,
    dispatch,
    canUndo: () => history.length > 0,
    canRedo: () => future.length > 0,
    undo: () => restore(history, future, "undo"),
    redo: () => restore(future, history, "redo"),
    subscribe(fn: (g: Graph, c: Change) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    serialize: () => JSON.stringify(get()),
  };
}
export function deserialize(text: string): Graph {
  if (text.length > 2_000_000)
    throw new AIWSError("SIZE", "Graph exceeds 2 MB");
  const graph: Graph = JSON.parse(text);
  validateGraph(graph);
  return graph;
}
export function contextSlice(graph: Graph, id: string) {
  const target = graph.nodes.find((n) => n.id === id);
  if (!target) throw new AIWSError("REF", "Unknown node");
  const parent = graph.nodes.find((n) => n.children.includes(id));
  return clone({
    version: graph.version,
    target: resolveNode(graph, target),
    dependencies: [
      ...new Set(Object.values(target.bindings || {}).map((b) => b.node)),
    ].map((id) => graph.nodes.find((n) => n.id === id)),
    parent: parent ? { id: parent.id, type: parent.type } : null,
    allowed: ["set"],
    schema: fields[target.type],
  });
}
export function resolveNode(graph: Graph, node: GraphNode): GraphNode {
  const result = clone(node);
  for (const [key, b] of Object.entries(node.bindings || {})) {
    const source = graph.nodes.find((n) => n.id === b.node);
    if (!source) throw new AIWSError("BINDING", "Missing state");
    result.props[key] = source.props[b.key];
  }
  return result;
}
export const patchBytes = (ops: Operation[]) =>
  new TextEncoder().encode(JSON.stringify(ops)).byteLength;

/** @deprecated Use patchBytes; this API has always counted UTF-8 bytes. */
export const patchTokens = patchBytes;
