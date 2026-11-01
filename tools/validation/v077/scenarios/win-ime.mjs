// Windows-only attended native IME tests. Real candidate composition, Ctrl+S and Ctrl+V; no synthetic composition events.
import assert from 'node:assert/strict';
import {executeCase} from '../helpers.mjs';
import {observe,evidence,step,editor} from './core-support.mjs';
import {integrity} from './system-support.mjs';
import {
  actualOs,preflight,blocked,openExisting,operatorStep,requireTrusted,requireComposition,
  nativeClipboard,durable,restartDraft,assertUnchangedPublished
} from './win-native-support.mjs';

const id=process.argv[2],out=process.argv[3];
if(!['NEW-13','WIN-04'].includes(id)||!out)throw Error('UNKNOWN_WINDOWS_IME_CASE');
if(preflight(id,out)){
  await executeCase(id,out,async ctx=>{
    await observe(ctx);
    await openExisting(ctx);
    const published=await ctx.session.api.call('card.getPublishedContent',ctx.fixture.card);
    const body=editor(ctx,'body');
    await body.fill('Windows 真实中文输入测试：'+id+' 初始文本。');
    await body.click();await body.press('Control+End');
    const stages=id==='NEW-13'
      ?[{name:'Microsoft Pinyin / unfinished composition',text:'中文组词期间保存仍完整',saveDuringComposition:true}]
      :[{name:'Microsoft Pinyin',text:'拼音组合输入完整甲',paste:true},
        {name:process.env.GANKSOFT_WIN_SECOND_IME_LABEL??'',text:'拼音组合输入完整乙',paste:true}];
    const proof=[];
    for(const stage of stages){
      if(!stage.name)throw blocked('WIN-04 requires a second distinct installed Chinese IME; set GANKSOFT_WIN_SECOND_IME_LABEL');
      if(id==='WIN-04'&&proof.length===1&&stage.name.toLowerCase().includes('microsoft pinyin'))
        throw blocked('Second input method cannot be the same Microsoft Pinyin engine');
      const instructions=stage.saveDuringComposition
        ?'选择真实 Microsoft 拼音输入法；在正文末尾实际键入“'+stage.text+'”。必须在拼音候选尚未确认时按物理 Ctrl+S 一次，再完成选字；确认最终字句完整。禁止粘贴或模拟 composition 事件。'
        :'切换至“'+stage.name+'”，用真实拼音候选键入“'+stage.text+'”。随后用鼠标选中该句、物理 Ctrl+C 复制，移动光标到正文末尾，物理 Ctrl+V 粘贴一次，确认两份文字均完整；不得使用测试代码写入剪贴板。';
      const events=await operatorStep(ctx,id+' — '+stage.name,instructions,{timeout:40000});
      requireComposition(events);
      requireTrusted(events,'input');
      if(stage.saveDuringComposition){
        requireTrusted(events,'ctrlSave');
        const began=events.find(x=>x.kind==='compositionstart')?.t??0;
        const ended=events.find(x=>x.kind==='compositionend')?.t??0;
        const save=events.find(x=>x.kind==='ctrlSave')?.t??0;
        if(!(began>0&&save>=began&&save<=ended+350))
          throw blocked('Physical Ctrl+S was not observed during/adjacent to unfinished IME composition');
      }
      if(stage.paste){
        requireTrusted(events,'paste');
        requireTrusted(events,'ctrlPaste');
        const clipboard=await nativeClipboard(ctx,stage.text);
        assert.ok(clipboard.matchingText,'Actual OS clipboard no longer carries IME-selected text');
      }
      const displayed=await editor(ctx,'body').innerText();
      const occurrences=displayed.split(stage.text).length-1;
      assert.equal(occurrences,stage.paste?2:1,
        'Real IME character loss, duplicate insertion or clipboard paste mismatch: '+stage.name);
      const stored=await durable(ctx,stage.text);
      assert.ok(stored.payload.fields.body.includes(stage.text));
      if(stage.paste)assert.equal(stored.payload.fields.body.split(stage.text).length-1,2);
      proof.push({ime:stage.name,compositionEvents:events.filter(x=>x.kind.startsWith('composition')).length,
        saveDuringComposition:!!stage.saveDuringComposition,physicalPastes:events.filter(x=>x.kind==='paste').length,
        savedRevision:stored.revision,exactOccurrences:occurrences});
      step(ctx,'Native '+stage.name+' composition and real keyboard input persisted without duplication');
    }
    const last=stages.at(-1).text;
    const reboot=await restartDraft(ctx,last);
    const finalDraft=await durable(ctx,last);
    for(const stage of stages)assert.equal(finalDraft.payload.fields.body.split(stage.text).length-1,
      stage.paste?2:1,'Reboot lost/multiplied the native IME input');
    await assertUnchangedPublished(ctx,published);
    integrity(ctx);
    ctx.observations.checks.windowsIme={os:actualOs(),stages:proof,reboot,attended:true,
      source:'Real Windows IME + human physical input; no synthetic composition events'};
    return evidence(ctx);
  });
}
