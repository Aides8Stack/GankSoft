// Rebuild only synthetic data with the existing typed-API generator; never open a user database.
import {existsSync,readFileSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createR0Fixture} from '../r0/fixture.ts';
const seed='validation-results/r2-seed-v2',at='2026-10-28T04:00:00.000Z';
let f:any;
if(existsSync(seed+'/fixture.json')){
 f=JSON.parse(readFileSync(seed+'/fixture.json','utf8'));
 assert.ok(resolve(f.root).startsWith(join(tmpdir(),'gank-r0-matched-')));
 assert.equal(f.data,join(f.root,'synthetic606'));
 assert.ok(existsSync(seed+'/root/synthetic606-control606/target/ganksoft.sqlite'));
 rmSync(f.root,{recursive:true,force:true});cpSync(seed+'/root',f.root,{recursive:true});
}else{
 f=await createR0Fixture(new Date(at));mkdirSync(seed,{recursive:true});
 cpSync(f.root,seed+'/root',{recursive:true});
 writeFileSync(seed+'/fixture.json',JSON.stringify({...f,close:undefined},null,2)+'\n');
}
assert.equal(f.data,join(f.root,'synthetic606'));
const db=new DatabaseSync(join(f.data+'-control606','target','ganksoft.sqlite'),{readOnly:true});
try{
 assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,606);
 assert.equal(db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
 for(const c of Object.values(f.cards) as any[]){const row=db.prepare('SELECT deck_id,published_type FROM learning_cards WHERE id=?').get(c.cardId)!;assert.equal(row.deck_id,c.deckId);assert.equal(row.published_type,c.mode);}
 console.log(JSON.stringify({status:'PASS',seed:f.seed,at:f.at,cards:f.dashboard.cardCount,cache:seed}));
}finally{db.close();}
