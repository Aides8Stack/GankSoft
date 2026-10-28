// Targeted R7.3 capture only. No visual PASS is inferred from successful capture.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const digest=(x:any)=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
export async function capture(host:any,page:any,out:string,kind:string,state:string,images:any[],widths=[1500,1366,900]){
 mkdirSync(out,{recursive:true});const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 try{for(const width of widths){
  await host.evaluate(({BrowserWindow}:any,w:number)=>{const win=BrowserWindow.getAllWindows()[0];win.setContentSize(w,900);win.webContents.setZoomFactor(1);},width);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  if(/^(review-validation|exchange-error)$/.test(state))await page.getByRole('alert').first().scrollIntoViewIfNeeded();
  const snapshot=await page.evaluate(()=>{
   const all=[...document.querySelectorAll('body *')].filter(el=>!['SCRIPT','STYLE','PATH','SVG'].includes(el.tagName));const ids=new Map(all.map((el,i)=>[el,i]));
   const elements=all.map((el,id)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {id,parent:ids.get(el.parentElement!),tag:el.tagName,class:el.getAttribute('class'),role:el.getAttribute('role'),label:el.getAttribute('aria-label'),text:el.children.length?undefined:(el.textContent??'').slice(0,240),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},scroll:{width:el.scrollWidth,clientWidth:el.clientWidth,height:el.scrollHeight,clientHeight:el.clientHeight,left:el.scrollLeft,top:el.scrollTop},css:{display:s.display,position:s.position,transform:s.transform,overflowX:s.overflowX,overflowY:s.overflowY,font:s.font,fontFamily:s.fontFamily,color:s.color,background:s.backgroundColor,padding:s.padding,gap:s.gap,gridTemplateColumns:s.gridTemplateColumns}};}).filter(x=>x.rect.width&&x.rect.height);
   const graph=document.querySelector('.mind-canvas .map-canvas')??document.querySelector('.knowledge-map-transform');const graphScale=graph?new DOMMatrix(getComputedStyle(graph).transform).a:null;return {graphScale,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth},text:document.body.innerText,elements};
  });
  if(snapshot.viewport.width!==width||snapshot.viewport.height!==900||snapshot.viewport.dpr!==1)throw Error('invalid capture metrics');
  const {root}=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'h1,h2'});const fonts=node.nodeId?(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts:[];
  if(!fonts.some((f:any)=>/Noto Sans CJK SC/.test(f.familyName)))throw Error('Noto CJK platform font preflight failed');
  const file=`${kind}-${state}-${width}.png`,json=file.replace('.png','.json');const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});const png=Buffer.from(shot.data,'base64');
  if(png.readUInt32BE(16)!==width||png.readUInt32BE(20)!==900)throw Error('invalid PNG dimensions');
  writeFileSync(join(out,file),png);writeFileSync(join(out,json),JSON.stringify({...snapshot,fonts},null,2)+'\n');images.push({kind,state,width,file,sha256:digest(png),snapshot:json,snapshotSha256:digest(readFileSync(join(out,json))),fonts,visualReview:'NOT_RUN'});
 }}finally{await cdp.detach();}
}
