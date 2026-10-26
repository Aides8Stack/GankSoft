import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {mkdirSync,readFileSync,symlinkSync,writeFileSync} from 'node:fs';
import {unifiedWorkspaceFixture} from './fixtures/unified-workspace.ts';
import {openUnifiedOwner} from '../electron/infrastructure/migrations/coordinator.ts';
import {inspectDatabaseBaseline} from '../electron/infrastructure/migrations/baseline.ts';
import {previewRelocation} from '../electron/modules/storage-unified/relocation-preview.ts';

test('T40 readonly Chinese and alternate-parent relocation preview binds the owned606 epoch, revision and full source digest without writing target',async()=>{
 const f=await unifiedWorkspaceFixture();await f.card('qa');f.release();const owner=openUnifiedOwner(f.control);try{
  const parent=join(f.source.root,'新的数据目录');mkdirSync(parent);const before=inspectDatabaseBaseline(join(owner.dataDir,'ganksoft.sqlite'),owner.dataDir,606),pointer=readFileSync(join(f.control,'active.json'),'utf8');
  const p=previewRelocation(owner,f.control,parent);assert.equal(p.source,owner.dataDir);assert.equal(p.destination,join(parent,'GankSoftData'));assert.equal(p.sourceDigest,before.digest);assert.equal(p.expectedEpoch,owner.epoch);assert.equal(p.mediaFiles,before.media.length);assert.equal(p.estimatedBytes.match(/^\d+$/)?.length,1);assert.equal(readFileSync(join(f.control,'active.json'),'utf8'),pointer);assert.deepEqual(inspectDatabaseBaseline(join(owner.dataDir,'ganksoft.sqlite'),owner.dataDir,606),before);
 }finally{owner.close();f.close();}
});
test('T40 target conflict, nested/alias source and control paths are rejected before any write',async()=>{
 const f=await unifiedWorkspaceFixture();f.release();const owner=openUnifiedOwner(f.control);try{
  const parent=join(f.source.root,'destination');mkdirSync(parent);mkdirSync(join(parent,'GankSoftData'));
  assert.throws(()=>previewRelocation(owner,f.control,parent),/已存在/);
  assert.throws(()=>previewRelocation(owner,f.control,owner.dataDir),/不能与当前数据/);
  assert.throws(()=>previewRelocation(owner,f.control,f.control),/不能与当前数据/);
  const link=join(f.source.root,'alias');symlinkSync(parent,link,'dir');assert.throws(()=>previewRelocation(owner,f.control,link),/非符号链接/);
  writeFileSync(join(f.source.root,'not-a-folder'),'x');assert.throws(()=>previewRelocation(owner,f.control,join(f.source.root,'not-a-folder')),/现有目录/);
 }finally{owner.close();f.close();}
});
