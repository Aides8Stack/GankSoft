import {IMPLEMENTED, loadCases} from './registry.mjs';
import {MODULES,MODULE_BY_ID,moduleCases,validateModules} from './modules.mjs';

const [command='list',moduleId]=process.argv.slice(2);
const cases=loadCases();
const structure=validateModules(cases);
const layers=['unitApi','electronUi','windowsCi','win10Real','win11Real'];
const summarize=(rows)=>({
  total:rows.length,
  priority:Object.fromEntries(['P0','P1','P2'].map(k=>[k,rows.filter(r=>r.priority===k).length])),
  implemented:rows.filter(r=>Object.hasOwn(IMPLEMENTED,r.id)).length,
  results:Object.fromEntries(layers.map(layer=>[layer,Object.fromEntries(
    ['PASS','FAIL','BLOCKED','NOT_RUN'].map(s=>[s,rows.filter(r=>r[layer]===s).length]))]))
});
if(command==='audit'){
  console.log(JSON.stringify({schema:'ganksoft.v077/module-audit-1',...structure,summary:summarize(cases)},null,2));
}else if(command==='list'){
  console.log(JSON.stringify({schema:'ganksoft.v077/module-plan-1',...structure,
    modules:MODULES.map(m=>({id:m.id,label:m.name,groups:m.groups,
      ...summarize(moduleCases(cases,m.id)),baseline:m.baseline.length,negative:m.negative.length}))},null,2));
}else if(command==='show'){
  if(!MODULE_BY_ID[moduleId])throw Error('V077_UNKNOWN_MODULE: '+String(moduleId));
  const m=MODULE_BY_ID[moduleId];
  const rows=moduleCases(cases,moduleId);
  console.log(JSON.stringify({module:m,coverage:summarize(rows),
    baseline:m.baseline.map(id=>({id,priority:cases.find(x=>x.id===id).priority,
      mapped:!!IMPLEMENTED[id],status:cases.find(x=>x.id===id).electronUi})),
    negative:m.negative.map(id=>({id,priority:cases.find(x=>x.id===id).priority,
      mapped:!!IMPLEMENTED[id],status:cases.find(x=>x.id===id).electronUi}))},null,2));
}else throw Error('USAGE: node module-plan.mjs list | audit | show <module-id>');
