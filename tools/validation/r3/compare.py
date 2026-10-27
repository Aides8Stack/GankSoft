"""R3 source-derived geometry gates; differences remain explicit."""
import json
from pathlib import Path
root=Path('docs/v076/rebuild-v37-source-first/stages/R3/evidence-delivery');checks=[];rows=[]
for page in ['cards','detail','filter']:
 for width in [1500,1366,900]:
  pair={k:json.loads((root/f'{k}-{page}-{width}.json').read_text()) for k in ['prototype','production']}
  a,b=[{e['selector']:e for e in pair[k]['elements'] if 'box'in e} for k in ['prototype','production']]
  assert pair['production']['scrollWidth']==width
  assert b['.left-rail']['box']['width']==213
  assert abs(b['.page-heading']['box']['height']-a['.page-heading']['box']['height'])<.1
  assert abs(b['.page-heading']['box']['y']-a['.page-heading']['box']['y'])<.1
  target={'cards':['.list-tools'],'detail':['.detail-metrics'],'filter':['.filter-panel','.filter-grid']}[page]
  for selector in target:
   assert abs(b[selector]['box']['height']-a[selector]['box']['height'])<.1,(page,width,selector)
   assert abs(b[selector]['box']['y']-a[selector]['box']['y'])<.1,(page,width,selector,'y')
  if page=='cards':assert b['.data-table th']['css']['fontSize']==a['.data-table th']['css']['fontSize']=='10.5px'
  checks.append({'page':page,'width':width,'status':'PASS','checked':['no viewport horizontal overflow','213px rail','heading y/height',*target]})
  diffs=[]
  for selector,e in a.items():
   if selector not in b:continue
   delta={k:round(b[selector]['box'][k]-v,3) for k,v in e['box'].items() if abs(b[selector]['box'][k]-v)>.1}
   css={k:[v,b[selector]['css'][k]] for k,v in e['css'].items() if v!=b[selector]['css'][k]}
   if delta or css:diffs.append({'selector':selector,'geometryDelta':delta,'css':css})
  rows.append({'page':page,'width':width,'differences':diffs})
result={'status':'PASS','scope':'R3 structure, typography and responsive frame; not pixel equality of different data','checks':checks,'comparisons':rows,'adaptations':['Real paged 30/60 rows vs four prototype cards changes vertical scroll and 15px scrollbar space','Detail uses actual mode content/history/knowledge; no demonstration scores/charts','List sort explicitly covers loaded metadata; global query remains title/type only','Queue type filter is explicitly within returned <=100 candidates; existing API has no mode query','Explicit queue preview, remembered per-deck conditions and additional supported batch move are real business controls'],'windows':'NOT_RUN'}
(root/'diff.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'PASS','pageWidthGroups':len(checks)}))
