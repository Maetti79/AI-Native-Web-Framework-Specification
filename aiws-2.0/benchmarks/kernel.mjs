import {performance} from 'node:perf_hooks';
import {createKernel,contextSlice} from '../src/kernel.mjs';
import {createCompiler} from '../dist/compiler.mjs';
import {seed} from '../src/graph.mjs';
const k=createKernel(seed),compiler=createCompiler();compiler.compile(k.get());const samples=[];let modified=0;
for(let i=0;i<1000;i++){const start=performance.now();k.apply([{op:'set',id:'mrr',key:'value',value:String(i)}]);modified+=compiler.compile(k.get()).compiled;samples.push(performance.now()-start)}
samples.sort((a,b)=>a-b);console.log(JSON.stringify({node:process.version,iterations:1000,nodes:seed.nodes.length,modifiedArtifacts:modified,medianMs:samples[500],p95Ms:samples[950],contextBytes:Buffer.byteLength(JSON.stringify(contextSlice(k.get(),'mrr'))),graphBytes:Buffer.byteLength(k.serialize()),heapUsedBytes:process.memoryUsage().heapUsed,modelCalls:0,tokenCounts:null,reactBaseline:null},null,2));
