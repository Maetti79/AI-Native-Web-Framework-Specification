import {createCompiler} from '../dist/compiler.mjs';
/** DOM backend for AIWS: graph -> safe UI elements. Incremental renderer updates changed nodes. */
const el=(tag,cls='',text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const color=t=>({blue:'#5188ee',violet:'#8270f9',teal:'#20c1a8',amber:'#f0a64c',red:'#ef6876',pink:'#ee75ba'})[t]||'#8270f9';

function drawChart(accent,chartData,id){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 650 240');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('revenue-svg');
 const make=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e};
 for(let y=30;y<=210;y+=45)make('line',{x1:12,y1:y,x2:638,y2:y,stroke:'#e6e8f0','stroke-dasharray':'4 6'});
 const coords=chartData.map((d,i)=>[20+i*(610/(chartData.length-1)),209-d*2.2]);const pts=coords.map(p=>p.join(',')).join(' ');
 const defs=make('defs',{}),grad=document.createElementNS(svg.namespaceURI,'linearGradient');grad.id=`area-${id}`;grad.setAttribute('x1','0');grad.setAttribute('y1','0');grad.setAttribute('x2','0');grad.setAttribute('y2','1');const s1=document.createElementNS(svg.namespaceURI,'stop');s1.setAttribute('offset','0%');s1.setAttribute('stop-color',accent);s1.setAttribute('stop-opacity','.24');const s2=document.createElementNS(svg.namespaceURI,'stop');s2.setAttribute('offset','100%');s2.setAttribute('stop-color',accent);s2.setAttribute('stop-opacity','0');grad.append(s1,s2);defs.append(grad);
 make('polygon',{points:`20,214 ${pts} 630,214`,fill:`url(#area-${id})`});make('polyline',{points:pts,fill:'none',stroke:accent,'stroke-width':3.5,'stroke-linecap':'round','stroke-linejoin':'round'});
 const [x,y]=coords.at(-1);make('circle',{cx:x,cy:y,r:7,fill:accent,stroke:'white','stroke-width':4});return svg;
}
export function compileNode(n){
 const p=n.props;let root;
 switch(n.type){
 case 'app':root=el('div','compiled-app');break;
 case 'section':root=el('section','app-section');{const top=el('div','section-header'),left=el('div');left.append(el('h2','section-title',p.title||''),el('p','section-subtitle',p.subtitle||''));top.append(left);root.append(top);}break;
 case 'metric':root=el('article','metric-card');{const top=el('div','metric-top');top.append(el('span','metric-label',p.label||''),el('span','metric-icon',p.symbol||'◈'));root.append(top,el('strong','metric-value',p.value||'—'));const bottom=el('div','metric-bottom');bottom.append(el('span','metric-delta',p.delta||''),el('span','metric-since','vs. last month'));root.append(bottom);root.style.setProperty('--node-accent',color(p.tone));}break;
 case 'chart':root=el('section','surface-card chart-card');{const top=el('div','chart-header'),left=el('div');left.append(el('h3','card-title',p.title||'Analytics'),el('p','card-subtitle',p.subtitle||''));top.append(left,el('span','period-chip',p.period||'12 months'));root.append(top,drawChart(/^#[0-9a-f]{6}$/i.test(p.accent)?p.accent:'#8270f9',JSON.parse(p.series||'[0,0]'),n.id));const months=el('div','month-labels');'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ').forEach(m=>months.append(el('span','',m)));root.append(months);}break;
 case 'activity':root=el('section','surface-card activity-card');{root.append(el('h3','card-title',p.title||'Recent activity'),el('p','card-subtitle',p.subtitle||''));const entries=JSON.parse(p.entries||'[]');for(const [ico,title,desc,time,tone] of entries){const line=el('div','activity-line'),bubble=el('span',`activity-bubble ${tone}`,ico),info=el('div','activity-info');info.append(el('strong','',title),el('span','',desc));line.append(bubble,info,el('time','',time));root.append(line);}}break;
 case 'table':root=el('section','surface-card');root.append(el('h3','card-title',p.title));{const table=el('table','data-table');for(const [i,row] of JSON.parse(p.rows||'[]').entries()){const tr=el('tr');for(const value of row)tr.append(el(i===0?'th':'td','',value));table.append(tr)}root.append(table)}break;
 case 'badge':root=el('article','project-item');{const header=el('div','project-header');header.append(el('strong','',p.label||'Project'),el('span','project-progress',`${Number(p.progress)||0}%`));root.append(header,el('p','project-detail',p.detail||''));const track=el('div','progress-track'),bar=el('div','progress-bar');bar.style.width=`${Math.min(100,Math.max(0,Number(p.progress)||0))}%`;bar.style.background=color(p.tone);track.append(bar);root.append(track);}break;
 default:root=el('div');root.textContent=p.text||p.title||'';
 }
 if(p.background){root.style.background=p.background;root.style.color='#ffffff';}root.dataset.aiwsId=n.id;root.dataset.aiwsType=n.type;return root;
}
// Content-addressed templates are compared by canonical node bytes, without hash collisions.
const runtimes=new WeakMap();
export function createRuntime(mount){
 const compiler=createCompiler();let previous=new Map(),elements=new Map(),templates=new Map();
 let stats={compiled:0,reused:0,removed:0,bytes:0,durationMs:0};
 function render(graph,selected,onSelect){
  const linked=compiler.compile(graph);const start=performance.now(),map=new Map(graph.nodes.map(n=>[n.id,n]));
  stats={compiled:0,reused:0,removed:0,bytes:0,durationMs:0};
  for(const [id,dom] of elements)if(!map.has(id)){dom.remove();elements.delete(id);stats.removed++}
  for(const n of graph.nodes){
   const key=linked.artifacts.get(n.id).address;
   if(previous.get(n.id)!==key){
    const templateKey=n.type==='chart'?key+n.id:key;let template=templates.get(templateKey);if(!template){template=compileNode(n);templates.set(templateKey,template);if(templates.size>512)templates.delete(templates.keys().next().value)}
    const dom=template.cloneNode(true);dom.dataset.aiwsId=n.id;dom.dataset.aiwsType=n.type;
    const old=elements.get(n.id);if(old)old.replaceWith(dom);elements.set(n.id,dom);stats.compiled++;stats.bytes+=new TextEncoder().encode(key).length;
   }else stats.reused++;
   previous.set(n.id,key);
  }
  for(const n of graph.nodes){const dom=elements.get(n.id);let host=dom;
   if(n.type==='app'||n.type==='section'){
    host=dom.querySelector(':scope > [data-children]');if(!host){host=document.createElement('div');host.dataset.children='true';host.className=n.type==='app'?'dashboard-main':n.id==='metrics'?'metric-grid':'project-grid';dom.append(host)}
    if(n.type==='app')host.style.display='contents';
   }
   n.children.forEach((id,index)=>{const child=elements.get(id);if(host.children[index]!==child)host.insertBefore(child,host.children[index]||null)});
   dom.classList.toggle('selected-node',n.id===selected);
  }
  const root=elements.get(graph.root);if(mount.firstChild!==root)mount.replaceChildren(root);
  mount.onclick=event=>{const node=event.target.closest('[data-aiws-id]');if(node&&mount.contains(node)){event.stopPropagation();onSelect(node.dataset.aiwsId)}};
  for(const id of previous.keys())if(!map.has(id))previous.delete(id);
  stats.durationMs=performance.now()-start;return {...stats};
 }
 return {render,getStats:()=>({...stats}),element:id=>elements.get(id)};
}
export function renderGraph(graph,mount,selected,onSelect){let runtime=runtimes.get(mount);if(!runtime){runtime=createRuntime(mount);runtimes.set(mount,runtime)}return runtime.render(graph,selected,onSelect)}
