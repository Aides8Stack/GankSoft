"""Preserve capture pixels; gzip JSON snapshots and create explicitly labelled comparisons."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, gzip, shutil
src=Path('validation-results/v076/R0-matched')
dest=Path('docs/v076/rebuild-v37-source-first/stages/R0/evidence/matched-v1')
dest.mkdir(parents=True,exist_ok=True)
m=json.loads((src/'manifest.json').read_text())
assert m['capture']=='PASS' and len(m['images'])==36
for entry in m['images']:
    p=src/entry['file']; assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256']
    assert Image.open(p).size==(entry['width'],900)
    shutil.copyfile(p,dest/p.name)
    p=src/entry['snapshot']; assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['snapshotSha256']
    compressed=gzip.compress(p.read_bytes(),mtime=0)
    (dest/(p.name+'.gz')).write_bytes(compressed)
    entry['snapshot']=p.name+'.gz'; entry['snapshotCompressedSha256']=hashlib.sha256(compressed).hexdigest()
diffs=[]; summary=[]
for state in ['overview','deck','editor','review','knowledge','settings']:
    for width in [1500,1366,900]:
        rn=f'reference-{state}-{width}.png'; pn=f'production-{state}-{width}.png'
        ref=Image.open(dest/rn).convert('RGB'); prod=Image.open(dest/pn).convert('RGB')
        sheet=Image.new('RGB',(width*2,928),'white'); d=ImageDraw.Draw(sheet)
        d.text((10,6),'FROZEN v3.7 / original demo',fill='black')
        d.text((width+10,6),'PRODUCTION606 / real synthetic fixture / Linux',fill='black')
        sheet.paste(ref,(0,28)); sheet.paste(prod,(width,28))
        name=f'compare-{state}-{width}.webp'; sheet.save(dest/name,'WEBP',lossless=True)
        diffs.append(dict(state=state,width=width,reference=rn,production=pn,comparison=name,pixelEquality=ref.tobytes()==prod.tobytes(),acceptance='NOT_VERIFIED',reason='Data/content/DOM/business and layout differences require region review; no pixel threshold gives visual PASS.'))
        pair={}
        for kind in ['reference','production']:
            s=json.loads((src/f'{kind}-{state}-{width}.json').read_text())
            pair[kind]={'meta':s['meta'],'styles':{e['selector']:e['computed'] for e in s['styles']},'domNodes':len(s['dom'])}
        summary.append(dict(state=state,width=width,**pair))
for name,value in [('manifest',m),('diff',diffs),('region-summary',summary)]:
    (dest/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print('Verified and collected 36 PNGs, 36 compressed DOM/CSS snapshots, 18 comparison sheets')
