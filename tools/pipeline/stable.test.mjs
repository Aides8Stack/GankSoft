import test from'node:test';import assert from'node:assert/strict';import{validateSignoffs}from'./stable.mjs';
test('stable signoffs bind both real systems, exact source, version, ZIP and embedded EXE',()=>{
 const item={sha:'a'.repeat(40),version:'1.0.0'},base={version:item.version,sourceSha:item.sha,zipSha256:'z',exeSha256:'e',automated:'passed',msvcSignature:'passed',manualSignoff:'passed',manualCases:Object.fromEntries(Array.from({length:40},(_,i)=>['W'+String(i+1).padStart(2,'0'),'passed']))};
 const reports=['win10','win11'].map(target=>({...base,target}));validateSignoffs(reports,item,'z','e');for(const edit of [{manualSignoff:'pending'},{sourceSha:'wrong'},{version:'1.0.0-rc.1'},{exeSha256:'wrong'},{manualCases:{}}])assert.throws(()=>validateSignoffs([reports[0],{...reports[1],...edit}],item,'z','e'));
});
