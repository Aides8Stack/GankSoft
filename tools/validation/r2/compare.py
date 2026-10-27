"""Compare captured geometry/styles; differences are evidence, never an automatic visual PASS."""
import json
import sys
from pathlib import Path
root=Path(sys.argv[1])
rows=[]
for page in ['overview','deck']:
 for width in [1500,1366,900]:
  pair={kind:json.loads((root/f'{kind}-{page}-{width}.json').read_text()) for kind in ['prototype','production']}
  elements={kind:{e['selector']:e for e in d['elements']} for kind,d in pair.items()}
  differences=[]
  for selector,ref in elements['prototype'].items():
   prod=elements['production'][selector]
   if ref.get('missing') or prod.get('missing'):continue
   geometry={k:round(prod['box'][k]-ref['box'][k],3) for k in ref['box'] if abs(prod['box'][k]-ref['box'][k])>.1}
   styles={k:{'prototype':v,'production':prod['css'].get(k)} for k,v in ref['css'].items() if v!=prod['css'].get(k)}
   if geometry or styles:differences.append({'selector':selector,'geometryDelta':geometry,'styles':styles})
  rows.append({'page':page,'width':width,'differences':differences,'scroll':{k:v.get('scroll') for k,v in pair.items()}})
(root/'diff.json').write_text(json.dumps({'status':'DIFFERENCES_RECORDED','visualAcceptance':'NOT_RUN','comparisons':rows},ensure_ascii=False,indent=2)+'\n')
for row in rows:
 print(row['page'],row['width'],[(d['selector'],d['geometryDelta']) for d in row['differences'] if d['selector'] in ['.content-container','.summary-strip','.split-layout','.hero-panel','.quick-row','.subsection-grid']])
