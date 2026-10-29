// Extend (do not replace) the first R0 regex inventory with parser-backed evidence.
import ts from 'typescript';
import postcss from 'postcss';
import {parse as parseSFC} from '@vue/compiler-sfc';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='docs/v076/rebuild-v37-source-first/stages/R0';
const reference='docs/v075/reference/OPEN-ME-v3.7.html', html=readFileSync(reference,'utf8');
const hash=createHash('sha256').update(html).digest('hex');
assert.equal(hash,'8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015');
const lineAt=p=>html.slice(0,p).split('\n').length;
const scripts=[],functions=[],branches=[],events=[],stateRefs=[],templates=[],switchCases=[],selectors=[],stateDefinitions=[];
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
 const offset=match.index+match[0].indexOf('>')+1, source=ts.createSourceFile(reference,match[1],ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const loc=n=>({line:lineAt(offset+n.getStart(source)),endLine:lineAt(offset+n.end)});
 assert.equal(source.parseDiagnostics.length,0,JSON.stringify(source.parseDiagnostics.map(d=>d.messageText)));
 scripts.push({line:lineAt(offset),endLine:lineAt(offset+match[1].length),parseErrors:0});
 function walk(n,parentFunction='top-level'){
  let owner=parentFunction;
  if(ts.isFunctionLike(n)&&n.body){
   owner=n.name?.getText(source)??(ts.isVariableDeclaration(n.parent)?n.parent.name.getText(source):`anonymous@${loc(n).line}`);
   functions.push({name:owner,kind:ts.SyntaxKind[n.kind],...loc(n),parentFunction});
  }
  if(ts.isIfStatement(n)||ts.isConditionalExpression(n))branches.push({function:owner,kind:ts.SyntaxKind[n.kind],condition:(n.expression??n.condition).getText(source),...loc(n)});
  if(ts.isCaseClause(n))switchCases.push({function:owner,value:n.expression.getText(source),...loc(n)});
  if(ts.isPropertyAccessExpression(n)&&/^(state|knowledgeState|transfer)\./.test(n.getText(source))){
   const p=n.parent;stateRefs.push({function:owner,path:n.getText(source),access:ts.isBinaryExpression(p)&&p.left===n?'assignment':ts.isPostfixUnaryExpression(p)||ts.isPrefixUnaryExpression(p)?'update':'read-or-method',...loc(n)});
  }
  if(ts.isVariableDeclaration(n)&&['state','knowledgeState','transfer','decks','cards'].includes(n.name.getText(source)))stateDefinitions.push({name:n.name.getText(source),initializer:n.initializer?.getText(source),...loc(n)});
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)){
   const method=n.expression.name.text;
   if(method==='addEventListener')events.push({function:owner,target:n.expression.expression.getText(source),event:n.arguments[0]?.getText(source),...loc(n)});
   if(['querySelector','querySelectorAll','closest','matches'].includes(method))selectors.push({function:owner,method,argument:n.arguments[0]?.getText(source),...loc(n)});
  }
  if(ts.isTemplateExpression(n)||ts.isNoSubstitutionTemplateLiteral(n)){
   const text=n.getText(source);
   if(/<\/?[a-z]/i.test(text))templates.push({function:owner,...loc(n),tags:[...new Set([...text.matchAll(/<([a-z][\w-]*)\b/gi)].map(m=>m[1]))],classes:[...new Set([...text.matchAll(/class=["']([^"']*)["']/g)].map(m=>m[1]))],dataAttributes:[...text.matchAll(/\b(data-[\w-]+)=["']([^"']*)["']/g)].map(m=>({attribute:m[1],value:m[2],dynamic:m[2].includes('${')})),dynamic:ts.isTemplateExpression(n),coverage:'static template tokens; runtime DOM snapshots required'});
  }
  ts.forEachChild(n,c=>walk(c,owner));
 }
 walk(source);
}
const css=[];
for(const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))css.push({file:reference,text:m[1],lineOffset:lineAt(m.index+m[0].indexOf('>')+1)-1});
css.push({file:'src/unified/ui-v076.css',text:readFileSync('src/unified/ui-v076.css','utf8'),lineOffset:0});
const cssRules=[];
for(const item of css){
 let order=0;const ast=postcss.parse(item.text,{from:item.file});
 ast.walkRules(rule=>{
  const at=[];for(let p=rule.parent;p&&p.type!=='root';p=p.parent)if(p.type==='atrule')at.unshift(`@${p.name} ${p.params}`);
  cssRules.push({file:item.file,order:++order,line:rule.source.start.line+item.lineOffset,selector:rule.selector,conditions:at,declarations:rule.nodes.filter(n=>n.type==='decl').map(n=>({property:n.prop,value:n.value,important:!!n.important,line:n.source.start.line+item.lineOffset}))});
 });
}
const groups=new Map();for(const r of cssRules)for(const s of postcss.list.comma(r.selector)){const key=r.file+'::'+s;const list=groups.get(key)||[];list.push(r);groups.set(key,list);}
const duplicates=[...groups.entries()].filter(([,r])=>r.length>1).map(([key,rules])=>({key,rules:rules.map(r=>({order:r.order,line:r.line,conditions:r.conditions,declarations:r.declarations}))}));
const files=[];function scan(dir){for(const d of readdirSync(dir,{withFileTypes:true})){let p=join(dir,d.name);if(d.isDirectory())scan(p);else if(/\.(ts|vue)$/.test(p))files.push(p);}}for(const d of ['src','shared','electron','tests'])scan(d);
const services=readFileSync('src/services.ts','utf8'),serviceAST=ts.createSourceFile('services.ts',services,ts.ScriptTarget.Latest,true);
const adapters={};function collectServices(n){if(ts.isVariableDeclaration(n)&&n.initializer&&ts.isObjectLiteralExpression(n.initializer))for(const p of n.initializer.properties){if(!p.name)continue;const text=p.getText(serviceAST),m=/invoke\(['"]([^'"]+)/.exec(text);if(m)adapters[`${n.name.getText(serviceAST)}.${p.name.getText(serviceAST)}`]=m[1];}ts.forEachChild(n,collectServices);}collectServices(serviceAST);
const registryPath='shared/protocol/registry.ts',registryText=readFileSync(registryPath,'utf8'),registryAST=ts.createSourceFile(registryPath,registryText,ts.ScriptTarget.Latest,true);
const methods=[];function collectRegistry(n){if(ts.isPropertyAssignment(n)&&ts.isStringLiteral(n.name)&&ts.isCallExpression(n.initializer)&&n.initializer.expression.getText(registryAST)==='define')methods.push({method:n.name.text,line:registryAST.getLineAndCharacterOfPosition(n.getStart(registryAST)).line+1,definition:n.initializer.getText(registryAST),references:[]});ts.forEachChild(n,collectRegistry);}collectRegistry(registryAST);
const vue=[];
for(const file of files){
 const text=readFileSync(file,'utf8');
 if(file.endsWith('.vue')){
  const {descriptor,errors}=parseSFC(text,{filename:file});assert.equal(errors.length,0,file);
  const calls=[...text.matchAll(/\b([A-Za-z]\w*\.\w+)\s*\(/g)].filter(m=>adapters[m[1]]).map(m=>({adapter:m[1],method:adapters[m[1]],line:text.slice(0,m.index).split('\n').length}));
  vue.push({file,calls,imports:[...text.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+\.vue)['"]/g)].map(m=>m[1]),directives:[...(descriptor.template?.content??'').matchAll(/(?:v-(?:if|else-if|for|model|show)|@[\w:.-]+)\s*=\s*"([^"]*)"/g)].map(m=>({directive:m[0].slice(0,m[0].indexOf('=')),expression:m[1]}))});
 }
 for(const method of methods){if(file===registryPath)continue;const lines=text.split('\n');for(let i=0;i<lines.length;i++)if(lines[i].includes(`'${method.method}'`)||lines[i].includes(`"${method.method}"`))method.references.push({file,line:i+1,kind:file.startsWith('tests/')?'test':file.startsWith('electron/')?'backend':'contract-or-adapter'});}
}
const inventory={reference,referenceSha256:hash,previousInventory:'prototype-dom-css-inventory.json',method:'TypeScript parser + PostCSS + Vue SFC parser; source indices are not behavioral coverage',scripts,functions,branches,switchCases,events,stateDefinitions,stateRefs,selectors,templates,limitations:['Template tags/classes are token indices, not a rendered DOM tree.','Callbacks and runtime-generated attribute values retain source locations; scenarios do not prove every branch executed.','API references and Vue calls establish static existence only, not semantic equivalence.']};
for(const key of ['functions','branches','switchCases','events','stateRefs','selectors','templates'])for(const item of inventory[key]){item.reviewOwner=item.line<1295?'R5':'R0';item.verification='NOT_VERIFIED';}
writeFileSync(`${root}/source-audit.json`,JSON.stringify(inventory,null,2)+'\n');
writeFileSync(`${root}/css-rules.json`,JSON.stringify({rules:cssRules,duplicateSelectors:duplicates,method:'PostCSS ordered declarations; specificity, matching and winning values require browser CSSOM/CDP evidence'},null,2)+'\n');
writeFileSync(`${root}/api-component-index.json`,JSON.stringify({registryPath,methods,adapters,vue},null,2)+'\n');
console.log(JSON.stringify({scripts:scripts.length,functions:functions.length,branches:branches.length,switchCases:switchCases.length,eventListeners:events.length,templates:templates.length,cssRules:cssRules.length,duplicateSelectors:duplicates.length,methods:methods.length,vueComponents:vue.length}));
