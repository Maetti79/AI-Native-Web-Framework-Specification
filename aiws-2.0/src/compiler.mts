import { canonicalValue } from "./data.mjs";
import { resolveNode, type Graph, type GraphNode } from "./kernel.mjs";
import { link } from "./linker.mjs";
export interface Artifact {
  address: string;
  type: GraphNode["type"];
  props: GraphNode["props"];
}
export function createCompiler() {
  const cache = new Map<string, Artifact>();
  let previous = new Map<string, string>();
  return {
    compile(graph: Graph) {
      const parents = link(graph),
        artifacts = new Map<string, Artifact>(),
        resolved = new Map<string, GraphNode>();
      let compiled = 0,
        reused = 0,
        cacheHits = 0;
      for (const source of graph.nodes) {
        const node = resolveNode(graph, source);
        resolved.set(node.id, node);
        const address = canonicalValue([
          node.type,
          Object.entries(node.props).sort(([a], [b]) => a.localeCompare(b)),
          Object.entries(node.events || {}).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ]);
        let artifact = cache.get(address);
        if (!artifact) {
          artifact = {
            address,
            type: node.type,
            props: structuredClone(node.props),
          };
          cache.set(address, artifact);
          if (cache.size > 512) cache.delete(cache.keys().next().value!);
        } else cacheHits++;
        if (previous.get(node.id) === address) reused++;
        else compiled++;
        artifacts.set(node.id, artifact);
      }
      previous = new Map([...artifacts].map(([id, a]) => [id, a.address]));
      return { artifacts, parents, resolved, compiled, reused, cacheHits };
    },
  };
}
