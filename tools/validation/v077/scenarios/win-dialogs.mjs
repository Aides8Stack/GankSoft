// WIN-07: actual Windows Common Item dialogs (no Electron dialog mocks), attended mouse Save/Cancel/Open.
import assert from 'node:assert/strict';
import {existsSync,statSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {executeCase,restart} from '../helpers.mjs';
import {observe,evidence,step} from './core-support.mjs';
import {protectedFacts,integrity,readContainer} from './system-support.mjs';
import {preflight,operatorStep,installPassiveProbe,actualOs,recordLocalProof,sha256,blocked} from './win-native-support.mjs';

const id=process.argv[2],out=process.argv[3];
if(!['WIN-07','BACK-14'].includes(id)||!out)throw Error('UNKNOWN_WIN_NATIVE_DIALOG_CASE');
if(preflight(id,out)){
  await executeCase(id,out,async ctx=>{
    await observe(ctx);
    let p=ctx.session.page;
    await p.getByRole('complementary',{name:'学习导航'}).getByRole('button',{name:'系统设置',exact:true}).click();
    await p.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'备份与恢复',exact:true}).click();
    const region=p.getByRole('region',{name:'备份与恢复',exact:true});
    await region.waitFor();
    const backup=region.getByRole('button',{name:'导出完整备份',exact:true});
    const restore=region.getByRole('region',{name:'恢复完整备份',exact:true});
    const target=join(ctx.fixture.root,id+'-native-backup.zip');
    const before=protectedFacts(ctx);
    const observations=[];
    await installPassiveProbe(ctx);

    // Native Save dialog, canceled with the actual Windows Cancel button.
    const cancelSave=operatorStep(ctx,'WIN-07 native Save dialog CANCEL',
      '点击真实 Windows「另存为」对话框的“取消”按钮，回到应用后物理按 F8。不要从 Playwright/主进程修改 dialog.showSaveDialog，也不要在应用内模拟 cancel。',{timeout:40000});
    await backup.click();
    await cancelSave;
    assert.ok(!existsSync(target),'Canceled native Save dialog unexpectedly created target');
    assert.deepEqual(protectedFacts(ctx),before,'Cancel Save must not alter card/database/media state');
    await region.getByRole('status').filter({hasText:'已取消备份'}).waitFor();
    observations.push({action:'save_cancel',zeroWrite:true});

    // Native Save dialog committed to an isolated synthetic target path.
    const chooseSave=operatorStep(ctx,'WIN-07 native Save dialog CONFIRM',
      '操作真实 Windows 文件保存窗口，文件名请指定为：'+target+'\n通过真实鼠标/键盘确认“保存”，返回 GankSoft 后物理按 F8。只保存隔离测试库，不选择用户私人目录。',{timeout:45000});
    await backup.click();
    await chooseSave;
    await region.getByRole('status').filter({hasText:'完整备份已导出'}).waitFor();
    assert.ok(existsSync(target),'Physical Windows Save dialog did not create backup');
    const bytes=statSync(target).size;assert.ok(bytes>400,'Native backup file empty');
    const entries=await readContainer(target);
    assert.ok([...entries.keys()].some(name=>name.endsWith('.sqlite')),'Native exported backup lacks SQLite payload');
    observations.push({action:'save_confirm',file:target,size:bytes,sha256:sha256(target),
      contents:[...entries.keys()].filter(x=>x.endsWith('.sqlite')).length});

    // Native Open dialog, canceled; no restore preview or business writes allowed.
    const stable=protectedFacts(ctx);
    const chooseOpen=operatorStep(ctx,'WIN-07 native Open dialog CANCEL',
      '点击“选择完整备份”后，在真正的 Windows 文件打开对话框中按“取消”；请勿选择任何私人备份。回到应用后按 F8。',{timeout:40000});
    await restore.getByRole('button',{name:'选择完整备份',exact:true}).click();
    await chooseOpen;
    assert.equal(await restore.getByRole('article',{name:'完整备份恢复预览'}).count(),0,
      'Canceled native file selection created a restore preview');
    assert.deepEqual(protectedFacts(ctx),stable,'Canceled Open dialog altered study DB/media');
    observations.push({action:'open_cancel',zeroWrite:true});

    const reboot=await restart(ctx);p=ctx.session.page;await observe(ctx);
    assert.deepEqual(protectedFacts(ctx),stable,'Native dialog operations mutated study data after restart');
    integrity(ctx);
    ctx.observations.checks.windowsDialogs={os:actualOs(),steps:observations,reboot,
      proof:'Actual Windows system Save/Open dialog; attended clicks/confirmation; no mocked Electron dialog'};
    recordLocalProof(out,id+'-'+actualOs().family+'-native-dialog-evidence.json',ctx.observations.checks.windowsDialogs);
    step(ctx,'Native cancel/save/open UI, true ZIP bytes, zero-write on cancel and fresh PID checked');
    const result=await evidence(ctx);
    if(id==='BACK-14')throw blocked('BACK-14 one-host Windows native dialog evidence saved; a matching Windows10 AND Windows11 pair must be independently reviewed before signing off this cross-platform CASE.');
    return result;
  });
}
