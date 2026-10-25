import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalizeWindowState,readWindowState,writeWindowState,bindWindowState} from '../electron/infrastructure/window-state.ts';
const area={x:0,y:0,width:1366,height:900};
test('T33 native view state fits the retained/removed monitor and small displays without restoring a minimized window',()=>{
 const left={x:-1920,y:0,width:1920,height:1080};
 const raw={version:1 as const,bounds:{x:-1800,y:40,width:1000,height:800},maximized:true};assert.deepEqual(normalizeWindowState(raw,[area,left]),raw);
 const moved=normalizeWindowState(raw,[area]);assert.deepEqual(moved,{...raw,bounds:{x:0,y:40,width:1000,height:800}});
 assert.deepEqual(normalizeWindowState({...raw,bounds:{x:20,y:20,width:900,height:680}},[{x:0,y:0,width:1280,height:720}]).bounds,{x:20,y:0,width:900,height:720});
 const tiny=normalizeWindowState(raw,[{x:0,y:0,width:640,height:480}]);assert.deepEqual(tiny.bounds,{x:0,y:0,width:640,height:480});
 assert.equal('minimized'in tiny,false);assert.equal(normalizeWindowState({version:2},[area]).maximized,false);assert.throws(()=>normalizeWindowState(raw,[]));
});
test('T33 persisted window JSON is atomic and corrupted/oversized data uses safe bounds without touching learning data',()=>{
 const dir=mkdtempSync(join(tmpdir(),'gank-view-state-'));try{
  const file=join(dir,'window.json'),data={version:1 as const,bounds:{x:12,y:20,width:1100,height:760},maximized:false};writeWindowState(file,data);assert.deepEqual(readWindowState(file,[area]),data);
  assert.throws(()=>writeWindowState(file,{...data,bounds:{...data.bounds,width:NaN}}));assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),data);assert.equal(readdirSync(dir).length,1);
  writeFileSync(file,'invalid');assert.equal(readWindowState(file,[area]).bounds.width,1366);writeFileSync(file,'x'.repeat(5000));assert.equal(readWindowState(file,[area]).maximized,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('T33 normal close flushes original bounds and maximize state; save failure reports without deleting the prior file',()=>{
 const dir=mkdtempSync(join(tmpdir(),'gank-view-events-'));try{
  const win=Object.assign(new EventEmitter(),{getNormalBounds:()=>({x:50,y:30,width:900,height:760}),isMaximized:()=>true,isDestroyed:()=>false}),file=join(dir,'window.json');let failures=0;
  const dispose=bindWindowState(win,file,()=>failures++);win.emit('resize');win.emit('close');assert.equal(readWindowState(file,[area]).maximized,true);assert.equal(readWindowState(file,[area]).bounds.x,50);dispose();assert.equal(win.listenerCount('resize'),0);
  const blocked=join(dir,'blocked');mkdirSync(blocked);const stop=bindWindowState(win,blocked,()=>failures++);win.emit('close');assert.equal(failures,1);assert.equal(JSON.parse(readFileSync(file,'utf8')).bounds.x,50);assert.equal(readdirSync(dir).some(n=>n.includes('.writing-')),false);stop();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
