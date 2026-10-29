import json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
root=Path('docs/v076/rebuild-v37-source-first/stages/R7/evidence/r73/current-matched')
manifest=json.loads((root/'manifest.json').read_text())
index={(x['kind'],x['state'],x['width']):x for x in manifest['images']}
states=sorted({x['state'] for x in manifest['images']})
rows=[]
for state in states:
  for width in [1500,1366,900]:
    a=index['production',state,width]; b=index['reference',state,width]
    ai=np.asarray(Image.open(root/a['file']).convert('RGB'),dtype=np.int16)
    bi=np.asarray(Image.open(root/b['file']).convert('RGB'),dtype=np.int16)
    delta=np.abs(ai-bi)
    pa=json.loads((root/a['snapshot']).read_text()); pb=json.loads((root/b['snapshot']).read_text())
    am={x['selector']:x for x in pa['styles']}; bm={x['selector']:x for x in pb['styles']}
    common=sorted(am.keys()&bm.keys()); boxes=[]; css=[]
    for selector in common:
      x,y=am[selector],bm[selector]
      if x.get('box') and y.get('box'):
        boxes.append({'selector':selector,'dx':round(x['box']['x']-y['box']['x'],1),'dy':round(x['box']['y']-y['box']['y'],1),'dw':round(x['box']['width']-y['box']['width'],1),'dh':round(x['box']['height']-y['box']['height'],1)})
      changed={k:{'production':x['computed'].get(k),'prototype':y['computed'].get(k)} for k in set(x['computed'])|set(y['computed']) if x['computed'].get(k)!=y['computed'].get(k)}
      if changed: css.append({'selector':selector,'properties':changed})
    rows.append({'state':state,'width':width,'sha256':{'production':a['sha256'],'prototype':b['sha256']},'pixel':{'mae':round(float(delta.mean()),3),'fractionPixelsRGBChanged':round(float(np.any(delta>8,axis=2).mean()),5),'fractionChannelDiffOver32':round(float((delta>32).mean()),5)},'commonSelectors':common,'boxDeltas':boxes,'cssDeltas':css,'layoutFindings':{'production':[{k:v for k,v in item.items() if k!='text'} for item in pa.get('layoutFindings',[])],'prototype':[{k:v for k,v in item.items() if k!='text'} for item in pb.get('layoutFindings',[])]},'fonts':{'production':a['resolvedFonts'],'prototype':b['resolvedFonts']}})
(root/'comparison.json').write_text(json.dumps({'checkpoint':manifest['sourceParentSha'],'prototypeSha256':manifest['prototypeSha256'],'capture':manifest['capture'],'pairs':rows},ensure_ascii=False,indent=2)+'\n')
# Compact contact sheet: 1366px high priority, reference above production for each state.
selected=['overview','deck','review','knowledge','knowledge-outline','trash']
thumbs=[]
for state in selected:
  for kind in ['reference','production']:
    im=Image.open(root/index[kind,state,1366]['file']).convert('RGB')
    im.thumbnail((683,450),Image.Resampling.LANCZOS)
    panel=Image.new('RGB',(683,476),'white'); panel.paste(im,((683-im.width)//2,22))
    ImageDraw.Draw(panel).text((10,5),f'{state} · {kind}',fill='#111')
    thumbs.append(panel)
sheet=Image.new('RGB',(683*2,476*len(selected)),'#ddd')
for i,panel in enumerate(thumbs):sheet.paste(panel,((i%2)*683,(i//2)*476))
sheet.save(root/'review-1366-contact.png')
print(json.dumps({'pairs':len(rows),'fontPairsAllNoto':all(all(f['family']=='Noto Sans CJK SC' for f in x['fonts'][k]) for x in rows for k in ['production','prototype']),'artifacts':['comparison.json','review-1366-contact.png'],'states':states},ensure_ascii=False))
