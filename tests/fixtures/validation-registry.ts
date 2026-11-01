import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';

/** Exercise the unchanged CLI against a test-only registry with an unmapped
 * canonical CASE. The live registry now maps all 250 cases; never remove one
 * from production or let a negative promotion test write the real ledger. */
export function validationRegistryFixture(unmappedIds=['AN-08']) {
 const parent=resolve('validation-results/v077');mkdirSync(parent,{recursive:true});
 const root=mkdtempSync(join(parent,'registry-test-')),tools=join(root,'tools/validation/v077'),docs=join(root,'docs/v077');
 mkdirSync(tools,{recursive:true});mkdirSync(docs,{recursive:true});
 const ledgerPath=join(docs,'E2E-RESULTS.json'),ledger=readFileSync('docs/v077/E2E-RESULTS.json','utf8');writeFileSync(ledgerPath,ledger);
 for(const name of ['run.mjs','promote.mjs','modules.mjs'])copyFileSync('tools/validation/v077/'+name,join(tools,name));
 let registry=readFileSync('tools/validation/v077/registry.mjs','utf8');
 for(const id of unmappedIds){assert.match(id,/^[A-Z]+-\d{2}$/);const line=new RegExp("^  '"+id+"':[^\\n]*\\n",'m');assert.match(registry,line);registry=registry.replace(line,'');}
 writeFileSync(join(tools,'registry.mjs'),registry);
 return {root,tools,ledgerPath,ledger,close(){rmSync(root,{recursive:true,force:true});}};
}
