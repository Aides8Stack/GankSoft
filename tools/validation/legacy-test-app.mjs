// Retained604 UI host exists only inside explicitly isolated test artifacts.
// It is never emitted by the production compiler or copied into the deliverable.
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdtempSync,cpSync,symlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
export function installLegacyTestMain(stage){
 const source=readFileSync('tests/fixtures/legacy-main-v074.ts.txt','utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,rewriteRelativeImportExtensions:true},fileName:'main.mts'}).outputText;
 writeFileSync(join(stage,'dist-electron/electron/legacy-main.js'),output);
 const pkg=JSON.parse(readFileSync(join(stage,'package.json'),'utf8'));pkg.main='dist-electron/electron/legacy-main.js';
 writeFileSync(join(stage,'package.json'),JSON.stringify(pkg));
}
export function createLegacyTestApp(){
 const stage=mkdtempSync(join(tmpdir(),'gank-retained604-ui-'));
 for(const name of ['dist','dist-electron','package.json'])cpSync(resolve(name),join(stage,name),{recursive:true});
 symlinkSync(resolve('node_modules'),join(stage,'node_modules'),process.platform==='win32'?'junction':'dir');
 installLegacyTestMain(stage);return stage;
}
