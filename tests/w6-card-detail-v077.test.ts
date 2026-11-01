// Execute the real compiled Vue component, including mounted async reads.
// These defensive states cannot pass the strict published-content wire codec.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {parse,compileScript} from '@vue/compiler-sfc';
import ts from 'typescript';
import * as Vue from 'vue';
import {historyEvidence} from '../shared/cards/history-evidence.ts';
const require=createRequire(import.meta.url);
type El={type:string;text:string;children:El[];parent:El|null;props:Record<string,unknown>};
const el=(type:string,text=''):El=>({type,text,children:[],parent:null,props:{}});
const renderer=Vue.createRenderer<El,El>({
 createElement:tag=>el(tag),createText:text=>el('#text',text),createComment:text=>el('#comment',text),
 setText:(node,text)=>{node.text=text;},setElementText:(node,text)=>{node.text=text;node.children=[];},
 patchProp:(node,key,_old,value)=>{node.props[key]=value;},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]??null,
 insert:(node,parent,anchor)=>{if(node.parent){const i=node.parent.children.indexOf(node);if(i>=0)node.parent.children.splice(i,1);}node.parent=parent;const i=anchor?parent.children.indexOf(anchor):-1;if(i<0)parent.children.push(node);else parent.children.splice(i,0,node);},
 remove:node=>{const i=node.parent?.children.indexOf(node)??-1;if(i>=0)node.parent!.children.splice(i,1);node.parent=null;},
});
const descriptor=parse(readFileSync(new URL('../src/unified/UnifiedCardDetail.vue',import.meta.url),'utf8')).descriptor;
const js=ts.transpileModule(compileScript(descriptor,{id:'w6-actual-component',inlineTemplate:true}).content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const text=(n:El):string=>n.text+n.children.map(text).join(' ');
async function mount(card:any,mastery:any,history:any[]=[]){
 const services={client:{},dataSync:{batch:async(fn:any)=>fn(),metadata:()=>({dataEpoch:'synthetic',dataRevision:1}),snapshot:()=>({dataEpoch:'synthetic',dataRevision:1}),assertCurrent:()=>{}},
 unifiedCards:{getPublishedContent:async()=>card},unifiedLearning:{history:async()=>({items:history,nextCursor:null}),mastery:async()=>mastery},unifiedKnowledge:{links:async()=>({revision:0,nodeIds:[]}),tree:async()=>({nodes:[]})}};
 const Markdown=Vue.defineComponent({props:['markdown'],setup:props=>()=>Vue.h('div',String(props.markdown??''))});
 const modules:Record<string,unknown>={'vue':Vue,'../../shared/cards/history-evidence':{historyEvidence},'../services':services,'../composables/dataRefresh':{useDataRefresh:()=>{}},'../composables/knowledgePicker':{useKnowledgePicker:()=>({cancel:()=>{},open:async()=>({status:'cancelled'})})},'../editor/MarkdownContent.vue':{default:Markdown,__esModule:true},'./v37/PrototypeIcon.vue':{default:Vue.defineComponent(()=>()=>Vue.h('i')),__esModule:true},'../components/ReviewLineChart.vue':{default:Vue.defineComponent(()=>()=>Vue.h('div')),__esModule:true}};
 const module={exports:{} as any};new Function('require','module','exports',js)((id:string)=>modules[id]??require(id),module,module.exports);
 const root=el('root'),app=renderer.createApp(module.exports.default,{deckId:'deck',cardId:'card'});app.mount(root);
 for(let i=0;i<5;i++){await new Promise(r=>setImmediate(r));await Vue.nextTick();}
 return {root,close:()=>app.unmount()};
}
test('W6-02 actual Vue defensive missing-answer branch never guesses an option',async()=>{
 const c=await mount({mode:'question',title:'合成兜底',mediaRefs:[],payload:{encoding:'question-v1',fields:{source:'',material:'',stem:'问题',options:[{optionId:'a',markdown:'不可猜测选项'}],correctOptionId:null,analysis:'解析',initialThought:''}}},{historyCount:0,status:'unseen',observations:0});
 try{const rendered=text(c.root);assert.match(rendered,/尚未设置正确答案/);const answer=(n:El):El|undefined=>n.props.class==='w6-correct-answer'?n:n.children.map(answer).find(Boolean);assert.doesNotMatch(text(answer(c.root)!),/不可猜测选项/);}finally{c.close();}
});
test('W6-04 actual Vue missing statistics render unrecorded values, never zero observations',async()=>{
 const c=await mount({mode:'direct',title:'缺失统计',mediaRefs:[],payload:{encoding:'direct-v1',fields:{source:'',body:'正文'}}},undefined,[{eventId:'e',createdAt:'2026-11-01T00:00:00Z',scoreTenths:null,elapsedSeconds:null,objectiveCorrect:null}]);
 try{const rendered=text(c.root);assert.match(rendered,/未记录/);assert.doesNotMatch(rendered,/0 次|0 秒|0\.0 \/ 10/);}finally{c.close();}
});
