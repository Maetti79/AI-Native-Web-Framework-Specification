import {validateGraph,type Graph} from './kernel.mjs';
export function link(graph:Graph){validateGraph(graph);const parents=new Map<string,string>();for(const n of graph.nodes)for(const c of n.children)parents.set(c,n.id);return parents}
export function invalidated(graph:Graph,touched:string[]){const parents=link(graph),result=new Set(touched);for(const id of touched){let p=parents.get(id);while(p){result.add(p);p=parents.get(p)}}return [...result]}
