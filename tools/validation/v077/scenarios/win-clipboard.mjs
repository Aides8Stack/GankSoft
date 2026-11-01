// Real Windows source -> OS clipboard -> real Ctrl+V -> Electron editor. NO clipboard.write/dispatchEvent.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {actualOs,preflight,blocked,openExisting,operatorStep,
  requireTrusted,nativeClipboard,durable,restartDraft,assertUnchangedPublished,shellProcessNames} from './win-native-support.mjs';

const id=process.argv[2],out=process.argv[3];
if(!['CLIP-03','CLIP-09','WIN-05','WIN-06'].includes(id)||!out)
  throw Error('UNKNOWN_WIN_CLIPBOARD_CASE');
const textIds=new Set(['CLIP-03','WIN-05']);
const checks={
  'CLIP-03':[{name:'Word/WPS',kind:'office',marker:'GANK_WIN_CLIP_03_OFFICE_RICH',rich:true}],
  'WIN-05':[
    {name:'Edge/Chrome browser',kind:'browser',marker:'GANK_WIN_05_BROWSER',rich:true},
    {name:'Word/WPS',kind:'office',marker:'GANK_WIN_05_OFFICE',rich:true},
    {name:'Windows Notepad',kind:'notepad',marker:'GANK_WIN_05_NOTEPAD',rich:false}
  ]
};
function rtf(s){return '{\\rtf1\\ansi\\deff0\\uc1\\f0\\fs28\\b '+s+'\\b0\\par '+s+' \\par Real Office rich copy, no fabricated clipboard data.}';}
function samples(ctx,list){
  const dir=join(ctx.fixture.root,'windows-original-clipboard');
  mkdirSync(dir,{recursive:true});
  return list.map(item=>{
    const ext=item.kind==='office'?'rtf':item.kind==='browser'?'html':'txt';
    const path=join(dir,item.marker+'.'+ext);
    const content=item.kind==='office'?rtf(item.marker):
      item.kind==='browser'?'<!doctype html><meta charset="utf-8"><p><strong>'+item.marker+'</strong></p><p>'+item.marker+' browser selection</p>':
        item.marker+' Windows Notepad genuine clipboard text\r\n';
    writeFileSync(path,content,'utf8');
    return {...item,path};
  });
}
function runningSource(kind,names){
  const patterns={office:/^(winword|wps|wpsoffice)\.exe$/i,
    browser:/^(chrome|msedge|firefox)\.exe$/i,notepad:/^notepad\.exe$/i};
  return names.filter(x=>patterns[kind]?.test(x));
}
async function nativeScreenshot(ctx){
  const page=ctx.session.page;
  const baseline=await ctx.session.api.call('draft.get',ctx.fixture.card);
  const expectedRefs=baseline?.mediaRefs?.length??0;
  const instruction='打开 Windows 截图工具（Win+Shift+S），对当前显示的合成 GankSoft 界面取一块非空截图；确认真实图片已进入系统剪贴板。返回此编辑器正文，物理按 Ctrl+V 粘贴。图片显示后物理按 F8。禁止调用 clipboard.write、Set-Clipboard、CDP dispatchEvent 或粘贴预制 PNG。';
  const events=await operatorStep(ctx,'Windows Snipping Tool original screenshot',instruction,{timeout:55000});
  requireTrusted(events,'paste');
  requireTrusted(events,'ctrlPaste');
  const clipboard=await nativeClipboard(ctx,null,{image:true});
  const img=editor(ctx,'body').locator('img[data-gank-placement]');
  await img.first().waitFor();
  const info=await img.last().evaluate(el=>({complete:el.complete,width:el.naturalWidth,height:el.naturalHeight}));
  assert.ok(info.complete&&info.width>0&&info.height>0,'Windows original screenshot failed to render');
  await page.getByTestId('save-draft').click();
  const saved=await durable(ctx,'Windows original screenshot');
  assert.ok(saved.mediaRefs.length>expectedRefs,'GUI pasted screenshot must create durable media placement');
  assert.equal(new Set(saved.mediaRefs.map(x=>x.placementId)).size,saved.mediaRefs.length);
  const refs=saved.mediaRefs.map(x=>({assetId:x.assetId,placementId:x.placementId,mime:x.mime,role:x.role}));
  const reboot=await restartDraft(ctx,'Windows original screenshot');
  const restored=await durable(ctx,'Windows original screenshot');
  assert.deepEqual(restored.mediaRefs.map(x=>({assetId:x.assetId,placementId:x.placementId,mime:x.mime,role:x.role})),refs);
  const restoredImg=editor(ctx,'body').locator('img[data-gank-placement]').last();
  await restoredImg.waitFor();
  assert.ok(await restoredImg.evaluate(el=>el.complete&&el.naturalWidth>0&&el.naturalHeight>0));
  ctx.observations.checks.snipping={os:actualOs(),nativeFormats:clipboard.formats,imageSize:clipboard.imageSize,
    visible:info,mediaRefs:refs,reboot,source:'Attended Win+Shift+S original screenshot; no generated PNG'};
  step(ctx,'Actual native Snipping Tool image persisted to correct draft and rendered after new Electron process');
}
if(preflight(id,out)){
  await executeCase(id,out,async ctx=>{
    await observe(ctx);
    const page=await openExisting(ctx);
    const published=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    await editor(ctx,'body').fill(textIds.has(id)?'Windows original office/browser/notepad text:\n':
      'Windows original screenshot');
    if(textIds.has(id)){
      const stages=samples(ctx,checks[id]),completed=[];
      for(const stage of stages){
        // Launching Word/WPS/Edge/Notepad remains an attended physical step, not a fake clipboard fixture.
        const instructions='合成源文件：'+stage.path+'\n请切换到真实 '+stage.name+'，鼠标选中包含“'+stage.marker+'”的文字并按物理 Ctrl+C。返回 GankSoft 正文末尾，物理 Ctrl+V 粘贴，再在应用中按 F8。禁止由测试脚本写入系统剪贴板；源软件保持开启。';
        const events=await operatorStep(ctx,id+' — '+stage.name,instructions,{timeout:45000});
        const names=shellProcessNames();
        if(!runningSource(stage.kind,names).length)
          throw blocked(stage.name+' source process not observable after the attended copy; keep original app open');
        requireTrusted(events,'paste');requireTrusted(events,'ctrlPaste');
        const clip=await nativeClipboard(ctx,stage.marker,{rich:stage.rich});
        const displayed=await editor(ctx,'body').innerText();
        assert.ok(displayed.includes(stage.marker),'Real source paste rejected/lost by editor: '+stage.kind);
        const stored=await durable(ctx,stage.marker);
        assert.ok(stored.payload.fields.body.includes(stage.marker));
        completed.push({source:stage.kind,application:stage.name,marker:stage.marker,
          formats:clip.formats,pasteEvents:events.filter(x=>x.kind==='paste').length,
          sourceProcess:runningSource(stage.kind,names)});
      }
      const reboot=await restartDraft(ctx,stages.at(-1).marker);
      const durableText=(await durable(ctx,stages.at(-1).marker)).payload.fields.body;
      for(const stage of stages)
        assert.ok(durableText.includes(stage.marker),'Restart lost genuine source '+stage.kind);
      ctx.observations.checks.originalSources={os:actualOs(),completed,reboot,
        proof:'Real source app process + unmodified OS clipboard rich formats + trusted GUI Ctrl+V'};
      step(ctx,'Actual Word/WPS/Browser/Notepad source text survived persisted draft/new PID');
    }else await nativeScreenshot(ctx);
    await assertUnchangedPublished(ctx,published);
    integrity(ctx);
    return evidence(ctx);
  });
}
