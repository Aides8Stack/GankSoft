"""Prove the ownership regression fails when its production guard is removed, in a disposable copy."""
from pathlib import Path
import tempfile, shutil, subprocess, re, json
root=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix='gank-v050-mutation-') as temp:
    target=Path(temp)
    for name in ['electron','shared','tests']:
        shutil.copytree(root/name,target/name)
    shutil.copyfile(root/'package.json',target/'package.json')
    (target/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
    path=target/'electron/modules/questions/service.ts'
    text=path.read_text()
    mutated,count=re.subn(r"if \(live\(ctx, 'knowledge', k\).module !== module\)\s*throw new Error\('知识点不属于当前卡片集'\);","live(ctx, 'knowledge', k);",text)
    assert count==1
    path.write_text(mutated)
    run=subprocess.run(['node','--experimental-strip-types','--test','--test-name-pattern=A03/A04','tests/audit-v050.test.ts'],cwd=target,text=True,capture_output=True)
    caught=run.returncode!=0 and 'Missing expected exception' in run.stdout+run.stderr
    result={'mutation':'remove saveQuestion knowledge deck guard','isolatedCopy':True,'expectedFailureObserved':caught,'exitCode':run.returncode}
    (root/'validation-results/mutation.json').write_text(json.dumps(result,indent=2))
    print(run.stdout,run.stderr,json.dumps(result))
    assert caught
