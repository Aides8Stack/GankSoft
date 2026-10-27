// Source reachability and emitted-package audit; no runtime activation switches.
import ts from 'typescript';
import {readFileSync,existsSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),seen=new Set();
const forbidden=p=>/(?:^|\/)(?:append-[^/]+|external-scan|external-append|UnifiedExternalAppend)\.(?:[cm]?[jt]s|vue)$/.test(p.replaceAll('\\','/'));
function localPath(from,spec){
 if(!spec.startsWith('.'))return null;
 const p=resolve(dirname(from),spec);
 for(const name of [p,...['.ts','.cts','.js','.vue','/index.ts'].map(e=>p+e)])if(existsSync(name)&&!['.css','.png','.svg','.ico'].includes(extname(name)))return name;
 return null;
}
function visit(file){
 if(seen.has(file))return;seen.add(file);assert.ok(!forbidden(file),'Retained S8.b reachable from production: '+relative(root,file));
 let source=readFileSync(file,'utf8');if(file.endsWith('.vue'))source=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const follow=spec=>{const p=localPath(file,spec);if(p)visit(p);};
 function walk(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
   if(!node.isTypeOnly&&!node.importClause?.isTypeOnly)follow(node.moduleSpecifier.text);
  }else if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require')){
   const arg=node.arguments[0];if(arg&&ts.isStringLiteral(arg))follow(arg.text);
  }
  ts.forEachChild(node,walk);
 }walk(ast);
}
for(const entry of ['electron/main.ts','electron/preload.cts','electron/modules/storage-unified/restore-session.ts','src/main.ts','src/unified/spike-main.ts'])visit(resolve(entry));
const artifacts=[];
function inspect(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())inspect(p);else{
 assert.ok(!forbidden(p),'S8.b emitted in production output: '+relative(root,p));
 if(/\.(?:[cm]?js|html|json)$/.test(e.name)){const text=readFileSync(p,'utf8');assert.doesNotMatch(text,/storage\.append\.|ganksoft\.independent-append|gank-append-pending|追加外部数据库/,'S8.b contract/entry in '+relative(root,p));}
 artifacts.push(relative(root,p));
}}}
for(const dir of ['dist','dist-electron']){assert.ok(existsSync(dir),'Run npm run build first');inspect(dir);}
const service=readFileSync('src/services.ts','utf8');assert.doesNotMatch(service,/unifiedAppend|storage\.append\./);
const registry=readFileSync('shared/protocol/registry.ts','utf8');assert.doesNotMatch(registry,/storage\.append\.|external-append|external-scan/);
mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/s8b-production-isolation.json',JSON.stringify({status:'PASS',sourceEntries:5,reachableModules:[...seen].map(p=>relative(root,p)).sort(),artifactFiles:artifacts.length,retainedSource:'tests/fixtures and excluded original storage modules; no production imports/exports/registrations',productionSideEffects:'none; no special compatibility handler'},null,2));
console.log(`S8.b production isolation PASS: ${seen.size} reachable modules, ${artifacts.length} emitted files; zero append contracts/entries`);
