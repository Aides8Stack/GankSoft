import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,readdirSync,readFileSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
import{sha256,plan}from'./queue.mjs';import{verifyDirectory}from'./artifacts.mjs';import{publishRC,published}from'./release.mjs';import{git}from'./version.mjs';
const item={sha:'a'.repeat(40),version:'0.7.4-rc.1',lockSha256:'b'.repeat(64),pr:4};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'gank-release-'));const source={sha:item.sha,version:item.version,lockSha256:item.lockSha256,runUrl:'https://github.com/example/run/1',runAttempt:'1'};for(const name of ['source.json','build-metadata.json'])writeFileSync(join(dir,name),JSON.stringify(source));writeFileSync(join(dir,'TEST_REPORT.json'),JSON.stringify({sourceSha:item.sha,version:item.version,...Object.fromEntries(['install','launch','uninstall','portable','installed','internalVersion','zipIntegrity'].map(k=>[k,'PASS']))}));writeFileSync(join(dir,'GankSoft-'+item.version+'-setup.exe'),'installer-fixture');writeFileSync(join(dir,'GankSoft-'+item.version+'-portable.zip'),'portable-fixture');writeFileSync(join(dir,'SHA256SUMS.txt'),readdirSync(dir).sort().map(n=>sha256(readFileSync(join(dir,n)))+'  '+n).join('\n')+'\n');return dir;}
function fake({failUpload=false,tagConflict=false,hideDraft=false}={}){const state={release:null,tag:tagConflict?'c'.repeat(40):null,assets:[],calls:[],bytes:new Map()};const api=async(path,opts={})=>{
 state.calls.push([opts.method??'GET',path]);const method=opts.method??'GET';const u=new URL(path.startsWith('https:')?path:'https://api.github.com'+path),p=u.pathname;
 if(p.includes('/git/ref/tags/'))return state.tag?{object:{sha:state.tag,type:'commit'}}:null;
 if(p.includes('/releases/tags/'))return hideDraft&&state.release?.draft?null:state.release;
 if(p==='/repos/owner/repo/releases'&&method==='GET')return state.release?[state.release]:[];
 if(p==='/repos/owner/repo/releases'&&method==='POST'){state.release={id:1,html_url:'https://github.com/owner/repo/releases/tag/v'+item.version,...opts.body};return state.release;}
 if(p==='/repos/owner/repo/releases/1/assets'&&method==='GET')return state.assets;
 if(p==='/repos/owner/repo/releases/1/assets'&&method==='POST'){if(failUpload)throw Error('injected upload failure');const b=opts.body,id=state.assets.length+1;const a={id,name:u.searchParams.get('name'),state:'uploaded',digest:'sha256:'+sha256(b)};state.bytes.set(id,b);state.assets.push(a);return a;}
 if(p.includes('/releases/assets/'))return state.bytes.get(Number(p.split('/').at(-1)));
 if(p==='/repos/owner/repo/releases/1'&&method==='PATCH'){Object.assign(state.release,opts.body);state.tag=item.sha;return state.release;}
 throw Error('Unexpected mock request '+method+' '+path);
 };return{api,state};}
test('local bytes tamper, extra files or wrong source prevents publishing',async()=>{const dir=fixture();verifyDirectory(dir,item);writeFileSync(join(dir,'GankSoft-'+item.version+'-setup.exe'),'tampered');const {api,state}=fake();await assert.rejects(publishRC(api,'owner/repo',item,dir),/hash mismatch/);assert.equal(state.calls.length,0);assert.throws(()=>verifyDirectory(fixture(),{...item,sha:'c'.repeat(40)}),/mismatch/);});
test('transaction uploads and verifies complete draft before public prerelease; rerun is idempotent',async()=>{const {api,state}=fake();const dir=fixture();const first=await publishRC(api,'owner/repo',item,dir);assert.equal(first.status,'RC_RELEASED');assert.equal(state.release.draft,false);assert.equal(state.release.prerelease,true);assert.equal(state.release.make_latest,'false');const writes=state.calls.filter(c=>c[0]!=='GET').length;assert.ok(await published(api,'owner/repo',item));const again=await publishRC(api,'owner/repo',item,dir);assert.equal(again.status,'ALREADY_PUBLISHED_VERIFIED');assert.equal(state.calls.filter(c=>c[0]!=='GET').length,writes);});
test('upload failure keeps private draft and never publishes',async()=>{const {api,state}=fake({failUpload:true});await assert.rejects(publishRC(api,'owner/repo',item,fixture()),/upload failure/);assert.equal(state.release.draft,true);assert.equal(state.calls.some(c=>c[0]==='PATCH'),false);});
test('tag conflict cannot be overwritten; matching private draft safely resumes',async()=>{const conflict=fake({tagConflict:true});await assert.rejects(publishRC(conflict.api,'owner/repo',item,fixture()),/another SHA/);assert.equal(conflict.state.calls.some(c=>c[0]!=='GET'),false);
 const f=fake({failUpload:true}),dir=fixture();await assert.rejects(publishRC(f.api,'owner/repo',item,dir));const resumed=fake();resumed.state.release=f.state.release;assert.equal((await publishRC(resumed.api,'owner/repo',item,dir)).status,'RC_RELEASED');});
test('unprotected develop blocks before constructing release intents',async()=>{await assert.rejects(plan(async()=>({protected:false}),git('rev-parse','HEAD'),{repository:'owner/repo'}),/must be protected/);});
test('withdrawn tag tombstone cannot republish same version, and draft-only never publishes',async()=>{
 const f=fake();f.state.tag=item.sha;await assert.rejects(publishRC(f.api,'owner/repo',item,fixture()),/cannot be reused/);assert.equal(f.state.calls.some(c=>c[0]!=='GET'),false);
 const s=fake();const prepared=await publishRC(s.api,'owner/repo',item,fixture(),{stable:true,draftOnly:true});assert.equal(prepared.status,'DRAFT_PREPARED');assert.equal(s.state.release.draft,true);assert.equal(s.state.release.prerelease,false);assert.equal(s.state.calls.some(c=>c[0]==='PATCH'),false);
});

test('draft recovery also discovers drafts through paginated release listing',async()=>{
 const {api,state}=fake({hideDraft:true}),dir=fixture();await publishRC(api,'owner/repo',item,dir,{draftOnly:true});
 assert.equal(state.release.draft,true);assert.equal((await publishRC(api,'owner/repo',item,dir)).status,'RC_RELEASED');
 assert.equal(state.calls.filter(c=>c[0]==='POST'&&c[1]==='/repos/owner/repo/releases').length,1);
});
