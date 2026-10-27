import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {serializeMarkedMarkdown,parseMarkedMarkdown} from '../shared/knowledge/markdown.ts';
import {knowledgePlacements,markdownImages} from '../shared/knowledge/media.ts';
import {placementUrl} from '../shared/editor/document.ts';
import {createBackup,stageBackup} from '../electron/infrastructure/backup.ts';
import {validateUnifiedData} from '../electron/infrastructure/migrations/unified-integrity.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {stageImage} from '../electron/modules/media/drafts.ts';
const simple=(body:string)=>serializeMarkedMarkdown([{key:'r',parentKey:null,name:'图片根',position:0,markdown:body,line:1}]);
const title=(width:number)=>`ganksoft-image:v1:${width}:${Buffer.from(JSON.stringify('图片说明')).toString('base64url')}`;
type F=Awaited<ReturnType<typeof unifiedWorkspaceFixture>>;
async function preview(f:F,body:string,deckId=f.source.ids.qDeck,policies={}){
 const s=await f.client.call('knowledge.md.source.text',{deckId,markdown:simple(body)});
 return f.client.call('knowledge.md.import.preview',{deckId,sourceToken:s.sourceToken,parentId:null,policies});
}
const bytes=(f:F)=>readFileSync(join(f.ctx.dataDir,'attachments',f.source.ids.currentImage+'.png'));
const uri=(f:F)=>'data:image/png;base64,'+bytes(f).toString('base64');
test('T32 real SQLite/image round-trip preserves 30/80 placements, math/color/title, deck-local hash dedup and restart',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const body=`![甲](${uri(f)} "${title(30)}")\n\n![乙](${uri(f)} "${title(80)}")\n\n$x^2$\n\n<span style="color:#112233">颜色</span>`;
  const p=await preview(f,body),before=readdirSync(join(f.ctx.dataDir,'attachments'));
  assert.equal(p.imageCount,2);assert.deepEqual(readdirSync(join(f.ctx.dataDir,'attachments')),before);
  await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  let node=await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:p.rows[0].nodeId});
  assert.deepEqual(knowledgePlacements(node.markdown).map(p=>p.width),[30,80]);assert.equal(node.assets.length,1);assert.equal(new Set(knowledgePlacements(node.markdown).map(p=>p.placementId)).size,2);
  assert.equal(readdirSync(join(f.ctx.dataDir,'attachments')).length,before.length+1);
  const exp=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[node.nodeId]});assert.equal(exp.imageCount,2);await assert.rejects(()=>preview(f,'![invalid](data:image/png;base64,YQ==)'));assert.match(exp.markdown,/data:image\/png;base64,/);assert.doesNotMatch(exp.markdown,/gank-asset:/);
  const s=await f.client.call('knowledge.md.source.text',{deckId:f.source.ids.mDeck,markdown:exp.markdown}),other=await f.client.call('knowledge.md.import.preview',{deckId:f.source.ids.mDeck,sourceToken:s.sourceToken,parentId:null});
  await f.client.call('knowledge.md.import.confirm',{deckId:other.deckId,previewToken:other.previewToken});
  const copied=await f.client.call('knowledge.node.read',{deckId:other.deckId,nodeId:other.rows[0].nodeId});
  assert.deepEqual(knowledgePlacements(copied.markdown).map(p=>p.width),[30,80]);assert.notEqual(copied.assets[0].id,node.assets[0].id);assert.match(copied.markdown,/\$x\^2\$/);assert.match(copied.markdown,/#112233/);assert.deepEqual(markdownImages(copied.markdown).map(i=>i.title),['图片说明','图片说明']);
  const replace=await preview(f,body,p.deckId,{'md:0':'replace'});await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:replace.previewToken});assert.equal(readdirSync(join(f.ctx.dataDir,'attachments')).length,before.length+2);
  f.reopen();node=await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:node.nodeId});assert.deepEqual(knowledgePlacements(node.markdown).map(p=>p.width),[30,80]);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T32 rejects invalid MIME/Base64/decoding, remote/local images, unsafe HTML and invalid widths before writes; code examples stay literal',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const before=readdirSync(join(f.ctx.dataDir,'attachments'));
  for(const body of ['![x](data:image/svg+xml;base64,PHN2Zz4=)','![x](data:image/png;base64,YQ==)','![x](data:image/jpeg;base64,'+bytes(f).toString('base64')+')','![x](https://example.invalid/image.png)','![x](file:///secret.png)','<img src="x" onerror="alert(1)">',`![x](${uri(f)} "ganksoft-image:v1:101:bnVsbA")`])await assert.rejects(()=>preview(f,body));
  assert.deepEqual(readdirSync(join(f.ctx.dataDir,'attachments')),before);
  const p=await preview(f,'```md\n![literal](data:image/png;base64,YQ==)\n```');assert.equal(p.imageCount,0);await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
 }finally{f.close();}
});
test('T32 receipt fault rolls back all knowledge images/files; original request retries once and replay creates nothing',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f,`![x](${uri(f)})`),directory=join(f.ctx.dataDir,'attachments'),before=readdirSync(directory),req=f.client.prepare('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  f.ctx.db.exec("CREATE TEMP TRIGGER reject_md_media BEFORE INSERT ON protocol_receipts WHEN NEW.method='knowledge.md.import.confirm' BEGIN SELECT RAISE(ABORT,'synthetic media receipt fault'); END");
  await assert.rejects(()=>f.client.send(req));assert.deepEqual(readdirSync(directory),before);f.ctx.db.exec('DROP TRIGGER reject_md_media');await f.client.send(req);await f.client.send(req);assert.equal(readdirSync(directory).length,before.length+1);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
test('T32 backup/reopen includes knowledge media and recycle references; missing/tampered bytes block export and backup',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f,`![x](${uri(f)})`);await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});
  const n=await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:p.rows[0].nodeId}),stored=JSON.parse(String(f.ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('unified-knowledge-body:'+n.nodeId)!.value));
  const backup=join(f.source.root,'knowledge.zip'),restored=join(f.source.root,'restored');await createBackup(f.ctx.db,f.ctx.dataDir,backup);await stageBackup(backup,restored);const db=new DatabaseSync(join(restored,'ganksoft.sqlite'));try{validateUnifiedData(db);}finally{db.close();}
  assert.ok(inspectDatabaseBaseline(join(restored,'ganksoft.sqlite'),restored,606).references.some(r=>r.owner==='unified-knowledge-body:'+n.nodeId));
  const path=join(f.ctx.dataDir,'attachments',stored.assets[0].fileName);writeFileSync(path,Buffer.from('corrupted'));await assert.rejects(()=>f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[n.nodeId]}));await assert.rejects(()=>createBackup(f.ctx.db,f.ctx.dataDir,join(f.source.root,'broken.zip')));
  writeFileSync(path,bytes(f));const tree=await f.client.call('knowledge.tree.read',{deckId:p.deckId});await f.client.call('knowledge.subtree.delete',{deckId:p.deckId,nodeId:n.nodeId,expectedTreeHash:tree.treeHash});rmSync(path);await assert.rejects(()=>createBackup(f.ctx.db,f.ctx.dataDir,join(f.source.root,'missing.zip')));
 }finally{f.close();}
});
test('T32 knowledge saves accept only staged same-deck knowledge assets, preserve independent widths and reject untracked/card-owned references',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const scope={deckId:f.source.ids.qDeck,nodeId:f.source.ids.root1},n=await f.client.call('knowledge.node.read',scope),a=stageImage(f.ctx,scope.deckId,'knowledge',bytes(f),'image/png');
  const ref=(id:string,w:number)=>`![x](${placementUrl({assetId:id,placementId:randomUUID(),width:w})})`;
  let saved=await f.client.call('knowledge.node.save',{...scope,expectedRevision:n.revision,markdown:ref(a.id,30)+'\n\n'+ref(a.id,80)});assert.equal(saved.assets.length,1);validateUnifiedData(f.ctx.db);
  for(const id of [f.source.ids.currentImage,stageImage(f.ctx,f.source.ids.mDeck,'knowledge',bytes(f),'image/png').id])await assert.rejects(()=>f.client.call('knowledge.node.save',{...scope,expectedRevision:saved.revision,markdown:ref(id,50)}));
  saved=await f.client.call('knowledge.node.save',{...scope,expectedRevision:saved.revision,markdown:'删除当前图片'});assert.deepEqual(saved.assets,[]);assert.ok(f.ctx.db.prepare('SELECT value FROM settings WHERE key=?').get('media-draft:'+a.id));
 }finally{f.close();}
});
test('T32 CommonMark reference images are resolved without retaining hidden Base64 definitions; inline code and title round-trip remain literal',async()=>{
 const f=await unifiedWorkspaceFixture();try{
  const p=await preview(f,`![参考图][pixel]\n\n[pixel]: ${uri(f)} "图片标题"\n\n\`![代码](data:image/png;base64,YQ==)\``);
  await f.client.call('knowledge.md.import.confirm',{deckId:p.deckId,previewToken:p.previewToken});const n=await f.client.call('knowledge.node.read',{deckId:p.deckId,nodeId:p.rows[0].nodeId});
  assert.equal(n.assets.length,1);assert.equal(markdownImages(n.markdown).length,1);assert.doesNotMatch(n.markdown,/\[pixel\]:/);assert.match(n.markdown,/`!\[代码\]\(data:image\/png;base64,YQ==\)`/);assert.equal(markdownImages(n.markdown)[0].title,'图片标题');
  const exp=await f.client.call('knowledge.md.export.preview',{deckId:p.deckId,nodeIds:[n.nodeId]});assert.equal(parseMarkedMarkdown(exp.markdown).length,1);validateUnifiedData(f.ctx.db);
 }finally{f.close();}
});
