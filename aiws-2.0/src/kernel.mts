export type Scalar = string | number | boolean;
export type NodeType = 'app'|'section'|'metric'|'chart'|'activity'|'action'|'heading'|'paragraph'|'badge'|'table';
export interface GraphNode { id:string; type:NodeType; props:Record<string,Scalar>; children:string[]; revision?:number }
export interface Graph { schemaVersion?:1; version?:number; root:string; nodes:GraphNode[] }
export type Operation = {op:'set';id:string;key:string;value:Scalar}|{op:'add';parent:string;node:GraphNode}|{op:'remove';id:string};
export interface Change {version:number;touched:string[];patch?:Operation[];undo?:boolean;redo?:boolean}
export const TYPES:NodeType[]=['app','section','metric','chart','activity','action','heading','paragraph','badge','table'];
export const OPS=['set','add','remove'];
export class AIWSError extends Error {constructor(public code:string,message:string){super(message);this.name='AIWSError'}}
const clone = <T,>(x:T):T=>structuredClone(x);
const safeId=(x:unknown):x is string=>typeof x==='string'&&/^[a-z][a-z0-9._-]{0,63}$/i.test(x);
const fields:Record<NodeType,string[]>={app:['title','subtitle'],section:['title','subtitle'],metric:['label','value','delta','tone','symbol','background'],chart:['title','subtitle','period','accent','series'],activity:['title','subtitle','entries'],action:['text','title'],heading:['text','title'],paragraph:['text','title'],table:['title','rows'],badge:['label','detail','progress','tone']};
export function validateGraph(graph:Graph):true {
 if(!graph||!safeId(graph.root)||!Array.isArray(graph.nodes)||graph.nodes.length>5000||(graph.schemaVersion!==undefined&&graph.schemaVersion!==1))throw new AIWSError('GRAPH','Invalid graph schema');
 const map=new Map<string,GraphNode>(); const parents=new Map<string,number>();
 for(const n of graph.nodes){
  if(!n||!safeId(n.id)||!TYPES.includes(n.type)||map.has(n.id))throw new AIWSError('NODE','Invalid or duplicate node');
  if(!n.props||typeof n.props!=='object'||Array.isArray(n.props))throw new AIWSError('PROPS','Invalid properties');
  for(const [key,v] of Object.entries(n.props)){
   if(!fields[n.type].includes(key)||!['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v)||String(v).length>300)throw new AIWSError('PROPS',`Invalid ${n.type}.${key}`);
   if(key==='progress'&&(typeof v!=='number'||v<0||v>100))throw new AIWSError('PROPS','Progress must be 0–100');
   if(['accent','background'].includes(key)&&!(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)))throw new AIWSError('PROPS','Expected hex color');
   if(['series','entries','rows'].includes(key)){let data;try{data=JSON.parse(String(v))}catch{throw new AIWSError('DATA','Invalid JSON data')}if(!Array.isArray(data)||data.length>50)throw new AIWSError('DATA','Expected bounded array');if(key==='series'&&(data.length<2||!data.every((x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100)))throw new AIWSError('DATA','Invalid chart series');if(key!=='series'&&!data.every((row:unknown)=>Array.isArray(row)&&row.length<=5&&row.every(x=>typeof x==='string')))throw new AIWSError('DATA','Expected text rows')}
   if(key!=='progress'&&typeof v!=='string')throw new AIWSError('PROPS','Expected text');
  }
  if(!Array.isArray(n.children)||!n.children.every(safeId)||new Set(n.children).size!==n.children.length)throw new AIWSError('CHILDREN','Invalid children');
  if(n.children.length&&!['app','section'].includes(n.type))throw new AIWSError('CHILDREN','Only containers accept children');
  if(n.revision!==undefined&&(!Number.isSafeInteger(n.revision)||n.revision<0))throw new AIWSError('VERSION','Invalid node revision');
  map.set(n.id,n);for(const id of n.children)parents.set(id,(parents.get(id)||0)+1);
 }
 if(!map.has(graph.root)||map.get(graph.root)!.type!=='app'||parents.has(graph.root))throw new AIWSError('ROOT','Invalid root');
 for(const n of graph.nodes)if(n.id!==graph.root&&parents.get(n.id)!==1)throw new AIWSError('PARENT','Exactly one parent required');
 const seen=new Set<string>(),pending=[graph.root];
 while(pending.length){const id=pending.pop()!;if(seen.has(id))throw new AIWSError('CYCLE','Cycle');const n=map.get(id);if(!n)throw new AIWSError('REF','Missing reference');seen.add(id);pending.push(...n.children)}
 if(seen.size!==map.size)throw new AIWSError('ORPHAN','Unreachable nodes');return true;
}
export function createKernel(initial:Graph){
 validateGraph(initial);let state=clone(initial),version=0;const history:Graph[]=[],future:Graph[]=[],listeners=new Set<(g:Graph,c:Change)=>void>();
 const get=():Graph=>clone({...state,schemaVersion:1,version});
 const notify=(c:Change)=>{for(const fn of listeners){try{fn(get(),c)}catch(e){console.error('Graph subscriber failed',e)}}};
 function apply(patch:Operation[],expectedVersion=version):Change{
  if(expectedVersion!==version)throw new AIWSError('CONFLICT','Stale graph version');
  if(!Array.isArray(patch)||!patch.length||patch.length>40)throw new AIWSError('PATCH','1–40 operations required');
  const next=clone(state),map=new Map(next.nodes.map(n=>[n.id,n])),touched=new Set<string>();
  for(const op of patch){
   if(!op||!OPS.includes(op.op))throw new AIWSError('OP','Unknown operation');
   if(op.op==='set'){const n=map.get(op.id);if(!n)throw new AIWSError('REF','Unknown node');if(!fields[n.type].includes(op.key))throw new AIWSError('KEY','Unknown property');n.props[op.key]=op.value;touched.add(n.id)}
   else if(op.op==='add'){const parent=map.get(op.parent);if(!parent||!op.node||map.has(op.node.id)||op.node.children?.length)throw new AIWSError('ADD','Invalid leaf insertion');const n=clone(op.node);map.set(n.id,n);parent.children.push(n.id);touched.add(parent.id);touched.add(n.id)}
   else {const n=map.get(op.id);if(!n||n.children.length||op.id===next.root)throw new AIWSError('REMOVE','Only leaves can be removed');for(const parent of map.values())if(parent.children.includes(op.id)){parent.children=parent.children.filter(id=>id!==op.id);touched.add(parent.id)}map.delete(op.id);touched.add(op.id)}
  }
  next.nodes=[...map.values()];for(const id of touched){const n=map.get(id);if(n)n.revision=(n.revision||0)+1}validateGraph(next);
  history.push(state);if(history.length>40)history.shift();future.length=0;state=next;version++;const result={version,touched:[...touched],patch:clone(patch)};notify(result);return result;
 }
 function restore(from:Graph[],to:Graph[],kind:'undo'|'redo'){const next=from.pop();if(!next)return false;to.push(state);const touched=[...new Set([...state.nodes,...next.nodes].map(n=>n.id))];state=next;version++;notify({version,touched,[kind]:true});return true}
 return {get,apply,undo:()=>restore(history,future,'undo'),redo:()=>restore(future,history,'redo'),subscribe(fn:(g:Graph,c:Change)=>void){listeners.add(fn);return()=>listeners.delete(fn)},serialize:()=>JSON.stringify(get())};
}
export function deserialize(text:string):Graph{const graph:Graph=JSON.parse(text);validateGraph(graph);return graph}
export function contextSlice(graph:Graph,id:string){const target=graph.nodes.find(n=>n.id===id);if(!target)throw new AIWSError('REF','Unknown node');const parent=graph.nodes.find(n=>n.children.includes(id));return clone({version:graph.version,target,parent:parent?{id:parent.id,type:parent.type}:null,allowed:['set'],schema:fields[target.type]})}
export const patchTokens=(ops:Operation[])=>new TextEncoder().encode(JSON.stringify(ops)).byteLength;
