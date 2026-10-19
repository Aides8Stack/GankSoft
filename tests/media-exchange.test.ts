import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Transformer } from "@napi-rs/image";
import { openDatabase, transaction } from "./fixture.ts";
import { Application } from "../electron/application.ts";
import { stageImage, draftImage, saveQuestionImages } from "../electron/modules/media/drafts.ts";
import { saveMemoryImages } from "../electron/modules/media/memory.ts";
import { recoverMediaWrites, createMediaAsset, collectOrphanMedia } from "../electron/modules/media/service.ts";
import { imageLayout, defaultImageEdit } from "../shared/image-node.ts";
import { exportDeck } from "../electron/modules/export.ts";
import { readContentPackage, writeContentPackage } from "../electron/modules/imports/container.ts";
import { createBackup, stageBackup } from "../electron/infrastructure/backup.ts";
import { readContainer, writeContainer, sha256 } from "../electron/infrastructure/containers.ts";
import { validatePackage } from "../electron/modules/imports/protocol.ts";
import { validateMediaIntegrity } from "../electron/modules/media/integrity.ts";
function fixture() {
 const dir=mkdtempSync(join(tmpdir(),"gank-exchange-image-")), db=openDatabase(join(dir,"ganksoft.sqlite"));
 const ctx={db,dataDir:dir,now:()=>new Date()},app=new Application(ctx);
 return {dir,db,ctx,app,close(){db.close();rmSync(dir,{recursive:true,force:true});}};
}
const bytes=()=>Transformer.fromRgbaPixels(Buffer.from([12,44,88,255]),1,1).pngSync();
const layout=imageLayout({widthPx:530,alignment:"right",edit:{...defaultImageEdit(),rotation:270,crop:{x:0,y:0,width:.5,height:1},annotations:[{text:"note",x:.2,y:.3,color:"#1565c0"}]}});
function commit(app:Application,pkg:any,options:any={}) {const expected=app.handle("import.preview",{package:pkg,options});assert.deepEqual(expected.errors,[]);return app.handle("import.commit",{package:pkg,options,expected});}

test("exchange: question/options and memory preserve bytes, layout/edit and isolated instances through JSON, ZIP, targeted import and layout-only update", async()=>{
 const f=fixture();try {
  for(const memory of [false,true]) {
   const deck=memory?"memory-default":"question-default", q=f.app.handle(memory?"memory.save":"question.save",memory?{module:deck,title:"memory",cue:"cue",content:"content"}:{module:deck,stem:"question",answer:"A"});
   const roles=memory?["question","analysis"]:["question","analysis","option-A","option-D"];
   const refs=roles.map((role,i)=>({id:stageImage(f.ctx,deck,role,bytes(),"image/png").id,role,layout:imageLayout({...layout,widthPx:530+i*50})}));
   if(memory)saveMemoryImages(f.ctx,q,deck,refs);else saveQuestionImages(f.ctx,q,deck,refs);
   const pkg=exportDeck(f.ctx,deck), file=join(f.dir,deck+".zip"),json=join(f.dir,deck+".json");
   writeFileSync(json,JSON.stringify(pkg));assert.deepEqual(await readContentPackage(json),pkg);
   await writeContentPackage(file,pkg);assert.deepEqual(await readContentPackage(file),pkg);
   const target=f.app.handle("deck.save",{name:"target-"+deck,kind:memory?"memory":"question"});
   commit(f.app,await readContentPackage(file),{targetDeckId:target});
   const imported=(memory?f.app.snapshot().memories:f.app.snapshot().questions).find((c:any)=>c.module===target)! as any;
   assert.deepEqual(imported.assets.map((a:any)=>a.layout),refs.map(r=>r.layout));
   assert.deepEqual(imported.assets.map((a:any)=>a.role),roles);
   assert.equal(new Set(imported.assets.map((a:any)=>a.id)).size,roles.length);
   for(const a of imported.assets)assert.deepEqual(readFileSync(join(f.dir,"attachments",a.file_name)),bytes());
   const source=(memory?f.app.snapshot().memories:f.app.snapshot().questions).find(c=>c.id===q)! as any;
   assert.notEqual(imported.assets[0].id,source.assets[0].id);
   const next=structuredClone(pkg);next.packageId+="-layout";next.items[0].images![0].layout!.widthPx=720;
   commit(f.app,next,{targetDeckId:target,allowItemUpdates:true});
   const updated=(memory?f.app.snapshot().memories:f.app.snapshot().questions).find(c=>c.id===imported.id)! as any;
   assert.equal(updated.assets[0].id,imported.assets[0].id);assert.equal(updated.assets[0].layout.widthPx,720);
   assert.equal(updated.learning_version??updated.content_version,imported.learning_version??imported.content_version);
   assert.equal((memory?f.app.snapshot().memories:f.app.snapshot().questions).find(c=>c.id===q)!.assets![0].layout!.widthPx,530);
   const bad=structuredClone(pkg);bad.items[0].images![0].sha256="0".repeat(64);assert.throws(()=>validatePackage(bad),/哈希/);
   const badLayout=structuredClone(pkg);badLayout.items[0].images![0].layout!.edit!.crop.width=2;assert.throws(()=>validatePackage(badLayout));
   const badRef=structuredClone(pkg);(badRef.items[0].images![0] as any).path="../outside";assert.throws(()=>validatePackage(badRef),/字段/);
  }
 }finally{f.close();}
});

test("backup: memory/current/draft/history media and layout restore; missing resources or internally rehashed corrupt metadata reject before installation",async()=>{
 const f=fixture();try {
  const id=f.app.handle("memory.save",{module:"memory-default",title:"m",cue:"cue",content:"content"});
  const a=stageImage(f.ctx,"memory-default","question",bytes(),"image/png");saveMemoryImages(f.ctx,id,"memory-default",[{id:a.id,role:"question",layout}]);
  const card=f.app.snapshot().memories.find(c=>c.id===id)!;
  f.app.handle("memory.review",{request_id:randomUUID(),id,content_version:card.learning_version,score:3,note:""});
  const replacementBytes=Transformer.fromRgbaPixels(Buffer.from([120,40,8,255]),1,1).pngSync();
  const replacement=stageImage(f.ctx,"memory-default","question",replacementBytes,"image/png");
  saveMemoryImages(f.ctx,id,"memory-default",[{id:a.id,role:"question",layout,replacementId:replacement.id}]);
  const draftBytes=Transformer.fromRgbaPixels(Buffer.from([80,44,8,255]),1,1).pngSync();
  const draft=stageImage(f.ctx,"question-default","response",draftBytes,"image/png"), draftMeta=draftImage(f.ctx,draft.id);
  const file=join(f.dir,"backup.zip"),restored=join(f.dir,"restored");await createBackup(f.db,f.dir,file);await stageBackup(file,restored);
  const db=openDatabase(join(restored,"ganksoft.sqlite"));try{const ctx={...f.ctx,db,dataDir:restored};assert.equal(validateMediaIntegrity(ctx).files,3);assert.equal(draftImage(ctx,draft.id).file_name,draftMeta.file_name);assert.deepEqual(new Application(ctx).snapshot().memories.find(c=>c.id===id)!.assets![0].layout,layout);}finally{db.close();}
  const entries=await readContainer(file),manifest=JSON.parse(entries.get("manifest.json")!.toString());const name="attachments/"+card.assets![0].file_name;
  entries.delete(name);manifest.entries=manifest.entries.filter((e:any)=>e.name!==name);entries.set("manifest.json",Buffer.from(JSON.stringify(manifest)));await writeContainer(join(f.dir,"missing.zip"),entries);
  await assert.rejects(()=>stageBackup(join(f.dir,"missing.zip"),join(f.dir,"rejected")),/缺少图片/);assert(!existsSync(join(f.dir,"rejected")));
  const corrupt=await readContainer(file);corrupt.set(name,Buffer.from("corrupt"));const m=JSON.parse(corrupt.get("manifest.json")!.toString());const e=m.entries.find((e:any)=>e.name===name);e.size=7;e.checksum=sha256(Buffer.from("corrupt"));corrupt.set("manifest.json",Buffer.from(JSON.stringify(m)));await writeContainer(join(f.dir,"corrupt.zip"),corrupt);
  await assert.rejects(()=>stageBackup(join(f.dir,"corrupt.zip"),join(f.dir,"rejected-hash")),/哈希/);
  assert.deepEqual(readFileSync(join(f.dir,"attachments",card.assets![0].file_name)),bytes());
  const missingDraft=await readContainer(file), md=JSON.parse(missingDraft.get("manifest.json")!.toString());
  const draftName="attachments/"+draftMeta.file_name;missingDraft.delete(draftName);md.entries=md.entries.filter((e:any)=>e.name!==draftName);missingDraft.set("manifest.json",Buffer.from(JSON.stringify(md)));await writeContainer(join(f.dir,"missing-draft.zip"),missingDraft);
  await assert.rejects(()=>stageBackup(join(f.dir,"missing-draft.zip"),join(f.dir,"rejected-draft")),/缺少图片/);
  f.db.prepare("UPDATE settings SET value=? WHERE key=?").run(JSON.stringify({...layout,widthPx:9000}),"image-layout:"+a.id);
  await createBackup(f.db,f.dir,join(f.dir,"bad-layout.zip"));
  await assert.rejects(()=>stageBackup(join(f.dir,"bad-layout.zip"),join(f.dir,"rejected-layout")));
 }finally{f.close();}
});

test("trash: outer rollback cannot unlink restored image refs; shared draft protects bytes; orphan cleanup metadata can be repaired without masking live missing resources",()=>{
 const f=fixture();try{
  const q=f.app.handle("question.save",{module:"question-default",stem:"q",answer:"A"}), a=stageImage(f.ctx,"question-default","question",bytes(),"image/png");saveQuestionImages(f.ctx,q,"question-default",[{id:a.id,role:"question",layout}]);
  const asset=f.app.snapshot().questions.find(c=>c.id===q)!.assets[0],path=join(f.dir,"attachments",asset.file_name);
  recoverMediaWrites(f.ctx);f.app.handle("question.delete",{id:q});const items=[{kind:"question",id:q}];const expected=f.app.handle("trash.preview",{items}).revision;
  assert.throws(()=>transaction(f.db,()=>{const result=f.app.handle("trash.manage",{action:"purge",items,expected});assert.equal(result.attachmentCleanupPending,1);throw Error("rollback");}),/rollback/);
  assert(existsSync(path));assert(f.db.prepare("SELECT id FROM assets WHERE id=?").get(a.id));
  f.app.handle("trash.manage",{action:"restore",items});assert.deepEqual(f.app.snapshot().questions.find(c=>c.id===q)!.assets[0].layout,layout);
  const shared=stageImage(f.ctx,"memory-default","question",bytes(),"image/png");f.app.handle("question.delete",{id:q});const exp=f.app.handle("trash.preview",{items}).revision;f.app.handle("trash.manage",{action:"purge",items,expected:exp});assert(existsSync(path));
  recoverMediaWrites(f.ctx);f.db.prepare("DELETE FROM settings WHERE key=?").run("media-draft:"+shared.id);assert.deepEqual(collectOrphanMedia(f.ctx,true),[asset.file_name]);assert(!existsSync(path));
  const resource=createMediaAsset(f.ctx,bytes(),"image/png");assert(existsSync(path));
  // Simulate file-unlink-before-metadata-commit crash, with no business refs.
  rmSync(path);assert.equal(createMediaAsset(f.ctx,bytes(),"image/png").assetId,resource.assetId);assert(existsSync(path));
  const live=stageImage(f.ctx,"question-default","response",bytes(),"image/png");rmSync(path);assert.throws(()=>createMediaAsset(f.ctx,bytes(),"image/png"));assert(f.db.prepare("SELECT key FROM settings WHERE key=?").get("media-draft:"+live.id));
 }finally{f.close();}
});

test("deck purge removes scoped draft references and layout while another deck's shared source survives and backup remains restorable",async()=>{
 const f=fixture();try{
  const deck=f.app.handle("deck.save",{name:"purge images",kind:"memory"});
  const a=stageImage(f.ctx,deck,"question",bytes(),"image/png"),other=stageImage(f.ctx,"question-default","response",bytes(),"image/png");
  recoverMediaWrites(f.ctx);f.app.handle("deck.action",{id:deck,action:"delete"});
  const items=[{kind:"deck",id:deck}],expected=f.app.handle("trash.preview",{items}).revision;
  f.app.handle("trash.manage",{action:"purge",items,expected});
  assert.throws(()=>draftImage(f.ctx,a.id));assert(existsSync(join(f.dir,"attachments",draftImage(f.ctx,other.id).file_name)));
  await createBackup(f.db,f.dir,join(f.dir,"purged.zip"));await stageBackup(join(f.dir,"purged.zip"),join(f.dir,"restored"));
 }finally{f.close();}
});
