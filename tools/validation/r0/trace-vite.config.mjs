// Diagnostic build only: observe own code without replacing results/conditions.
import {defineConfig} from 'vite';import vue from '@vitejs/plugin-vue';
const observer=`const __r0observe=(event:any)=>{(globalThis as any).__r0Observe?.({...event,stack:new Error().stack});};\n`;
function replaceOnce(s,a,b,id){if(s.split(a).length!==2)throw Error('Trace anchor mismatch '+id+' '+a);return s.replace(a,b);}
export default defineConfig({base:'./',plugins:[{name:'r0-readonly-observer',enforce:'pre',transform(source,id){
 if(id.includes('?'))return null;
 const file=id.split('?')[0].replaceAll('\\','/');let s=source,hit=true;
 const put=(a,b)=>{s=replaceOnce(s,a,b,file);};
 if(file.endsWith('/src/components/KnowledgeMarkdownExchange.vue'))put("async function open(next:'import'|'export'){","async function open(next:'import'|'export'){__r0observe({source:'KnowledgeMarkdownExchange.open',next});");
 else if(file.endsWith('/src/components/MindMapWorkspace.vue')){put('async function save(): Promise<boolean> {',"async function save(): Promise<boolean> {__r0observe({source:'MindMapWorkspace.save'});");put('async function persist(): Promise<boolean> {',"async function persist(): Promise<boolean> {__r0observe({source:'MindMapWorkspace.persist',dirty:dirty.value});");}
 else if(file.endsWith('/src/components/KnowledgeMarkdownPanel.vue')){put('async save(document:EditorDocument,expectedRevision:number){',"async save(document:EditorDocument,expectedRevision:number){__r0observe({source:'KnowledgeMarkdownPanel.adapter.save',scope,document,expectedRevision});");put('async function flush(){',"async function flush(){__r0observe({source:'KnowledgeMarkdownPanel.flush',scope,clean:clean(),state:saveState.value});");put('onMounted(async()=>{',"onMounted(async()=>{(globalThis as any).__r0PanelFlush=flush;");}
 else if(file.endsWith('/src/editor/MarkdownEditor.vue')){put('async function save() {',"async function save() {__r0observe({source:'MarkdownEditor.save',state:saves.state,initial:props.initial,snapshot:handle.value?.snapshot()});");put('      (doc) => {',"      (doc) => {__r0observe({source:'MarkdownEditor.changed',state:saves.state,doc});");}
 else if(file.endsWith('/src/editor/save-controller.ts')){put('  change(document: EditorDocument) {',"  change(document: EditorDocument) {__r0observe({source:'SaveController.change',before:this.current,next:document,state:this.state});");put('  async flush(): Promise<void> {',"  async flush(): Promise<void> {__r0observe({source:'SaveController.flush',state:this.state,revision:this.revision});");}
 else if(file.endsWith('/src/editor/milkdown-adapter.ts')){put('    api.markdownUpdated((_ctx, markdown, previousMarkdown) => {',"    api.markdownUpdated((_ctx, markdown, previousMarkdown) => {__r0observe({source:'milkdown.markdownUpdated',ready,alive,markdown,previousMarkdown});");put('    ready = true;\n    snapshot();',"    ready = true;\n    const __r0initial=snapshot();__r0observe({source:'milkdown.ready',initial:document,serialized:__r0initial});");}
 else if(file.endsWith('/src/services.ts'))put('): Promise<Output<M>> {',"): Promise<Output<M>> {if(method.startsWith('knowledge.'))__r0observe({source:'services.invoke',method,payload});");
 else hit=false;
 if(!hit)return null;
 if(file.endsWith('.vue'))s=s.replace('<script setup lang="ts">','<script setup lang="ts">\n'+observer);else s=observer+s;
 return {code:s,map:null};
}},vue()],build:{outDir:'dist',assetsInlineLimit:0,minify:false}});
