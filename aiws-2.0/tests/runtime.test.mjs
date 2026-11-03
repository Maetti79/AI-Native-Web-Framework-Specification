import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createKernel,deserialize,validateGraph} from '../src/kernel.mjs';
import {createRuntime} from '../src/runtime.mjs';
import {invalidated} from '../dist/linker.mjs';
import {seed} from '../src/graph.mjs';
import {routeIntent} from '../src/intent.mjs';
const setup=()=>{const dom=new JSDOM('<main></main>');globalThis.document=dom.window.document;return document.querySelector('main')};
test('incremental rendering retains unaffected DOM and selection compiles nothing',()=>{
 const mount=setup(),k=createKernel(seed),r=createRuntime(mount);assert.equal(r.render(k.get(),'mrr',()=>{}).compiled,13);
 const unchanged=r.element('users');k.apply([{op:'set',id:'mrr',key:'label',value:'Revenue'}]);assert.equal(r.render(k.get(),'mrr',()=>{}).compiled,1);assert.equal(r.element('users'),unchanged);assert.match(r.element('mrr').textContent,/Revenue/);assert.equal(r.render(k.get(),'users',()=>{}).compiled,0);
});
test('container changes retain descendants; add/remove synchronizes runtime',()=>{const mount=setup(),k=createKernel(seed),r=createRuntime(mount);r.render(k.get(),'mrr',()=>{});const child=r.element('mrr');k.apply([{op:'set',id:'metrics',key:'title',value:'Updated'},{op:'add',parent:'metrics',node:{id:'new',type:'metric',props:{label:'New'},children:[]}}]);r.render(k.get(),'mrr',()=>{});assert.equal(r.element('mrr'),child);assert.ok(mount.querySelector('[data-aiws-id="new"]'));k.undo();r.render(k.get(),'mrr',()=>{});assert.equal(mount.querySelector('[data-aiws-id="new"]'),null)});
test('dependency invalidation includes ancestors and excludes siblings',()=>{assert.deepEqual(invalidated(seed,['mrr']),['mrr','metrics','app'])});
test('serialization roundtrip, redo, conflict after undo',()=>{const k=createKernel(seed);k.apply([{op:'set',id:'mrr',key:'value',value:'42'}]);const changed=k.get();k.undo();k.redo();assert.deepEqual(k.get().nodes,changed.nodes);assert.deepEqual(deserialize(k.serialize()),k.get());assert.throws(()=>k.apply([{op:'remove',id:'mrr'}],1));k.undo();k.apply([{op:'set',id:'users',key:'value',value:'3'}]);assert.equal(k.redo(),false)});
test('invalid initial properties, multiple parents, and late invalid op are rejected',()=>{const bad=structuredClone(seed);bad.nodes[1].children.push('revenue');assert.throws(()=>validateGraph(bad));const k=createKernel(seed),before=k.serialize();assert.throws(()=>k.apply([{op:'set',id:'mrr',key:'label',value:'Changed'},{op:'set',id:'project1',key:'progress',value:101}]));assert.equal(k.serialize(),before)});
test('compound intent preserves case and commits both changes atomically',()=>{const k=createKernel(seed);const result=routeIntent('Make this card dark blue and change its title to Revenue.','mrr',k.get());assert.equal(result.ops.length,2);k.apply(result.ops);const n=k.get().nodes.find(n=>n.id==='mrr');assert.equal(n.props.label,'Revenue');assert.equal(n.props.background,'#142e58')});
test('rendered values remain text, not injected HTML',()=>{const mount=setup(),k=createKernel(seed);k.apply([{op:'set',id:'mrr',key:'label',value:'<img src=x onerror=alert(1)>'}]);createRuntime(mount).render(k.get(),'mrr',()=>{});assert.equal(mount.querySelector('img'),null);assert.match(mount.textContent,/<img/) });
