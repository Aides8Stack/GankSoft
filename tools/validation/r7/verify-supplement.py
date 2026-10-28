"""Check summaries by default; --verify-raw checks already restored evidence.
No Electron launch, capture, image copying, compression or fixture generation.
"""
import argparse, ast, collections, gzip, hashlib, json, struct, subprocess
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--verify-raw',action='store_true')
args=parser.parse_args()
root=Path('docs/v076/rebuild-v37-source-first')
out=root/'stages/R7/evidence/r73/supplemental-20261028'
sha=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((out/'manifest.json').read_text())
audit=json.loads((out/'export-audit.json').read_text())
old=json.loads((root/'stages/R7/evidence/r73/current-matched/manifest.json').read_text())
old_hashes={i['sha256'] for i in old['images']}
seen=set();archives={}
for im in m['images']:
    key=(im['kind'],im['state'],im['width'])
    assert key not in seen
    seen.add(key)
    assert im['repositoryUpload'] is False
    assert len(im['sha256'])==len(im['snapshotSha256'])==64
    assert im['file'].startswith('images/') and im['snapshot'].startswith('snapshots/')
    if args.verify_raw:
        data=(out/im['file']).read_bytes()
        assert sha(data)==im['sha256']
        assert struct.unpack('>II',data[16:24])==(im['width'],900)
        if im['snapshot'] not in archives:
            archives[im['snapshot']]=json.loads(gzip.decompress((out/im['snapshot']).read_bytes()))
        raw=archives[im['snapshot']][im['snapshotEntry']]
        assert sha(raw.encode())==im['snapshotSha256']
        d=json.loads(raw)
        assert d['viewport']['width']==im['width'] and d['viewport']['height']==900 and d['viewport']['dpr']==1
        assert any(f['familyName']=='Noto Sans CJK SC' for f in d['fonts'])
assert len(seen)==m['imageCount']==111
assert len({im['sha256'] for im in m['images']})==111
assert sum(im['sha256'] in old_hashes for im in m['images'])==10
assert dict(collections.Counter(im['captureClass'] for im in m['images']))==audit['imageClassification']==m['imageClassification']
assert audit['imageClassification']=={'REVALIDATED_AFFECTED_STATE':28,'DUPLICATE_INHERITED_HASH_REFERENCE_ONLY':10,'NEW_MISSING_STATE':73}
assert m['storage']['rawEvidenceInGitHub'] is False
assert audit['backup']['independentPersistentReadback']=='PASS' and audit['backup']['readbackFilesVerified']==159
comparison=json.loads((out/'comparison.json').read_text())
assert len(comparison['pairs'])==m['pairedCaptures']==49
for row in comparison['pairs']:
    if row['state']=='graph-real-root':assert abs(row['graphScale']['production']-row['graphScale']['reference'])<0.000002
assert sha(Path('docs/v075/reference/OPEN-ME-v3.7.html').read_bytes())==m['prototypeSha256']
files=subprocess.check_output(['git','ls-files','src','electron','shared'],text=True).strip().splitlines()
assert sha(b''.join(p.encode()+Path(p).read_bytes() for p in files))==m['implementationFingerprint']
for name in ['manifest.json','comparison.json']:
    p=root/'stages/R7/evidence/r73/current-matched'/name
    assert p.read_bytes()==subprocess.check_output(['git','show','HEAD:'+str(p)])
tracker=json.loads((root/'R0-R8-STAGE-TRACKER.json').read_text());st={s['id']:s for s in tracker['stages']}
assert st['R1']['status']==st['R7']['status']=='IN_PROGRESS' and st['R8']['status']=='NOT_STARTED'
expected={'R7.1':'DONE','R7.2':'DONE','R7.3':'IN_PROGRESS','R7.4':'NOT_STARTED','R7.5':'NOT_STARTED'}
assert st['R7']['substages']==expected
assert json.loads(Path('docs/development/TASK.json').read_text())['r7Substages']==expected
for name,value in m['currentSavedToolSha256'].items():assert sha(Path('tools/validation/r7',name).read_bytes())==value
ast.parse(Path(__file__).read_text())
result={'status':'PASS','sourceParentSha':m['sourceParentSha'],'summaryIndexChecks':111,'pairedComparisons':49,
        'rawHashChecks':'PASS_111' if args.verify_raw else 'NOT_RUN_SUMMARY_MODE',
        'persistentBackupIndependentReadback':'PASS_159_FILES','inheritedHashDuplicateImages':10,
        'prototypeUnchanged':True,'productionFingerprintUnchanged':True,'inheritedEvidenceUnchanged':True,
        'stageTruth':'PASS','visualAcceptance':'BLOCKED','ownerMinorApproval':'NOT_RUN','windowsReal':'NOT_RUN',
        'note':'Evidence integrity/index and stage consistency only; no new capture, regression or visual signoff.'}
if not args.verify_raw:(out/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result))
