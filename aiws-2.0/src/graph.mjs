export const seed={root:'app',nodes:[
{id:'app',type:'app',props:{title:'NORTHSTAR',subtitle:'Operations overview'},children:['metrics','revenue','activity','projects','subscriptions']},
{id:'metrics',type:'section',props:{title:'Performance at a glance',subtitle:'Your workspace in real time'},children:['mrr','users','conversion','uptime']},
{id:'mrr',type:'metric',props:{label:'Monthly revenue',value:'€84,290',delta:'+12.8%',tone:'blue',symbol:'€'},children:[]},
{id:'users',type:'metric',props:{label:'Active customers',value:'12,842',delta:'+8.2%',tone:'violet',symbol:'◉'},children:[]},
{id:'conversion',type:'metric',props:{label:'Conversion rate',value:'4.86%',delta:'+2.4%',tone:'teal',symbol:'↗'},children:[]},
{id:'uptime',type:'metric',props:{label:'Platform uptime',value:'99.98%',delta:'+0.01%',tone:'amber',symbol:'⬡'},children:[]},
{id:'revenue',type:'chart',props:{title:'Revenue analytics',subtitle:'Growth across the last 12 months',period:'12 months',accent:'#7568f8',series:'[23,30,26,38,35,44,40,52,59,55,69,78]'},children:[]},
{id:'activity',type:'activity',props:{title:'Recent activity',subtitle:'Latest events across your workspace',entries:JSON.stringify([['✓','New subscription','Pro plan activated','2 min ago','mint'],['↗','Revenue milestone','Reached €80k MRR','1 hour ago','purple']])},children:[]},
{id:'projects',type:'section',props:{title:'Active workspaces',subtitle:'Everything moving forward'},children:['project1','project2','project3']},
{id:'subscriptions',type:'table',props:{title:'Subscriptions',rows:JSON.stringify([['Workspace','Plan','Status'],['Acme Studio','Pro','Active'],['Orbit Labs','Team','Active'],['Nova Design','Starter','Trial']])},children:[]},
{id:'project1',type:'badge',props:{label:'Website redesign',detail:'Design · In progress',progress:74,tone:'violet'},children:[]},
{id:'project2',type:'badge',props:{label:'API infrastructure',detail:'Engineering · In review',progress:91,tone:'teal'},children:[]},
{id:'project3',type:'badge',props:{label:'Mobile experience',detail:'Product · Planning',progress:38,tone:'amber'},children:[]}
]};
