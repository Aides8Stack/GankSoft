import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,rmSync,mkdirSync,statSync} from 'node:fs';
import {dirname} from 'node:path';
import {z} from 'zod';
const Rect=z.strictObject({x:z.number().finite().int(),y:z.number().finite().int(),width:z.number().finite().int().positive(),height:z.number().finite().int().positive()});
const Saved=z.strictObject({version:z.literal(1),bounds:Rect,maximized:z.boolean()});
export type WindowState=z.infer<typeof Saved>;
export type WorkArea=z.infer<typeof Rect>;
const overlap=(a:WorkArea,b:WorkArea)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
/** Removed monitors and smaller desktops cannot strand the title bar offscreen.
 * This is view-only state, never a database location or a migration decision. */
export function normalizeWindowState(raw:unknown,areas:WorkArea[]):WindowState {
 const usable=areas.map(a=>Rect.parse(a));if(!usable.length)throw Error('DISPLAY_WORKAREA_REQUIRED');
 const result=Saved.safeParse(raw),saved=result.success?result.data:null;
 const screen=saved?[...usable].sort((a,b)=>overlap(b,saved.bounds)-overlap(a,saved.bounds))[0]:usable[0];
 const width=Math.min(screen.width,Math.max(720,saved?.bounds.width??1460)),height=Math.min(screen.height,Math.max(720,saved?.bounds.height??960));
 const x=Math.max(screen.x,Math.min(saved?.bounds.x??Math.round(screen.x+(screen.width-width)/2),screen.x+screen.width-width));
 const y=Math.max(screen.y,Math.min(saved?.bounds.y??Math.round(screen.y+(screen.height-height)/2),screen.y+screen.height-height));
 return {version:1,bounds:{x,y,width,height},maximized:saved?.maximized??false};
}
export function readWindowState(file:string,areas:WorkArea[]):WindowState {
 let raw:unknown=null;
 try{if(statSync(file).size<=4096)raw=JSON.parse(readFileSync(file,'utf8'));}catch{}
 return normalizeWindowState(raw,areas);
}
export function writeWindowState(file:string,state:WindowState){
 const value=Saved.parse(state),temp=file+'.writing-'+randomUUID();mkdirSync(dirname(file),{recursive:true});
 try{writeFileSync(temp,JSON.stringify(value),{flag:'wx',mode:0o600});renameSync(temp,file);}finally{rmSync(temp,{force:true});}
}
interface WindowPort {getNormalBounds():WorkArea;isMaximized():boolean;isDestroyed():boolean;on(name:string,listener:()=>void):unknown;removeListener(name:string,listener:()=>void):unknown}
export function bindWindowState(win:WindowPort,file:string,onFailure:()=>void){
 let timer:ReturnType<typeof setTimeout>|undefined;
 const flush=()=>{clearTimeout(timer);if(win.isDestroyed())return;try{writeWindowState(file,{version:1,bounds:win.getNormalBounds(),maximized:win.isMaximized()});}catch{onFailure();}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(flush,300);timer.unref();};
 for(const event of ['move','resize','maximize','unmaximize'])win.on(event,schedule);win.on('close',flush);
 return ()=>{clearTimeout(timer);for(const event of ['move','resize','maximize','unmaximize'])win.removeListener(event,schedule);win.removeListener('close',flush);};
}
