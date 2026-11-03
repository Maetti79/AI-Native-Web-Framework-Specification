import type {Graph,GraphNode} from './kernel.mjs';
import {link} from './linker.mjs';
export interface Artifact {address:string;node:GraphNode}
export function createCompiler(){const cache=new Map<string,Artifact>();let previous=new Map<string,string>();
 return {compile(graph:Graph){const parents=link(graph),artifacts=new Map<string,Artifact>();let compiled=0,reused=0;
 for(const node of graph.nodes){const address=JSON.stringify([node.type,Object.entries(node.props).sort(([a],[b])=>a.localeCompare(b))]);let artifact=cache.get(address);if(!artifact){artifact={address,node:structuredClone(node)};cache.set(address,artifact);if(cache.size>512)cache.delete(cache.keys().next().value!)}if(previous.get(node.id)===address)reused++;else compiled++;artifacts.set(node.id,artifact)}
 previous=new Map([...artifacts].map(([id,a])=>[id,a.address]));return {artifacts,parents,compiled,reused}}
 }}
