import { validateGraph, type Graph } from "./kernel.mjs";
export function link(graph: Graph) {
  validateGraph(graph);
  const parents = new Map<string, string>();
  for (const node of graph.nodes)
    for (const child of node.children) parents.set(child, node.id);
  return parents;
}
export function dependencies(graph: Graph) {
  link(graph);
  const consumers = new Map<string, Set<string>>();
  const add = (source: string, target: string) => {
    if (!consumers.has(source)) consumers.set(source, new Set());
    consumers.get(source)!.add(target);
  };
  for (const node of graph.nodes) {
    for (const child of node.children) add(child, node.id);
    for (const b of Object.values(node.bindings || {})) add(b.node, node.id);
  }
  return consumers;
}
export function invalidated(graph: Graph, touched: string[]) {
  const consumers = dependencies(graph),
    result = new Set(touched),
    pending = [...touched];
  while (pending.length)
    for (const id of consumers.get(pending.pop()!) || [])
      if (!result.has(id)) {
        result.add(id);
        pending.push(id);
      }
  return [...result];
}
