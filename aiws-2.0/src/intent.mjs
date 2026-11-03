/** Model-independent deterministic adapter. Unknown requests never invoke a paid service. */
const colors={blue:'#4785ed','dark blue':'#142e58',purple:'#7568f8',green:'#1abca3',red:'#ed5969',blau:'#4785ed',dunkelblau:'#142e58'};
export function routeIntent(input,selected,snapshot){
 const text=input.trim(),s=text.toLowerCase(),node=snapshot.nodes.find(n=>n.id===selected);
 if(/^(undo|rückgängig)$/.test(s))return {kind:'undo'};
 if(/^(redo|wiederholen)$/.test(s))return {kind:'redo'};
 if(!node)return {kind:'error',message:'Select a component first.'};
 if(/^(inspect|context|kontext)$/.test(s))return {kind:'inspect'};
 const ops=[];const color=Object.keys(colors).sort((a,b)=>b.length-a.length).find(c=>s.includes(c));
 if(color&&/(make|change|color|mach|farbe)/.test(s)&&['metric','chart'].includes(node.type))ops.push({op:'set',id:selected,key:node.type==='chart'?'accent':'background',value:colors[color]});
 const rename=text.match(/(?:rename\s+to|(?:change\s+(?:its|the)\s+)?title\s+to|titel\s+(?:zu|in))\s*["']?(.+?)["'.]?$/i);
 if(rename)ops.push({op:'set',id:selected,key:['metric','badge'].includes(node.type)?'label':'title',value:rename[1]});
 return ops.length?{kind:'patch',ops}:{kind:'unsupported',message:'Try “make dark blue and change its title to Revenue”, “rename to Growth”, inspect, undo or redo.'};
}
