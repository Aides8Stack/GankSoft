"""R2 geometry gates; business-content differences remain explicit, not pixel equality."""
import json
from pathlib import Path
root=Path('docs/v076/rebuild-v37-source-first/stages/R2/evidence-closure')
checks=[];comparisons=[]
def read(kind,page,width):
 return {e['selector']:e for e in json.loads((root/f'{kind}-{page}-{width}.json').read_text())['elements'] if 'box' in e}
def delta(a,b):return {k:round(b['box'][k]-a['box'][k],6) for k in a['box']}
def same(a,b,selector,keys=('x','y','width','height')):
 values=delta(a[selector],b[selector]);assert all(abs(values[k])<=.1 for k in keys),(selector,values)
 checks.append({'selector':selector,'delta':{k:values[k] for k in keys}})
for page in ['overview','deck']:
 for width in [1500,1366,900]:
  ref,prod=read('prototype',page,width),read('production',page,width)
  for selector in ['.page-heading','.heading-actions','.heading-actions button']:same(ref,prod,selector)
  for selector in ['.page-heading h1','.page-heading p']:same(ref,prod,selector,('x','y','height'))
  assert ref['.page-heading h1']['text']==prod['.page-heading h1']['text']
  for prop in ['fontSize','fontWeight','lineHeight','color']:assert ref['.page-heading h1']['css'][prop]==prod['.page-heading h1']['css'][prop]
  if page=='deck':
   for selector in ['.content-container','.hero-panel','.quick-row','.subsection-grid','.subsection-grid>.surface:last-child']:same(ref,prod,selector)
  elif width!=900:
   for selector in ['.content-container','.summary-strip','.split-layout','.deck-list','.deck-row']:same(ref,prod,selector)
  else:
   control=read('prototype-content-control',page,width)
   for selector in ['.split-layout']:same(control,prod,selector)
   for selector in ['.deck-list','.deck-row']:same(control,prod,selector,('y','height'))
   assert ref['.deck-row-main']['css']['textAlign']==prod['.deck-row-main']['css']['textAlign']=='center'
  differences=[]
  for selector,a in ref.items():
   if selector not in prod:continue
   b=prod[selector];geometry={k:v for k,v in delta(a,b).items() if abs(v)>.1}
   styles={k:{'prototype':v,'production':b['css'][k]} for k,v in a['css'].items() if v!=b['css'][k]}
   if geometry or styles:differences.append({'selector':selector,'geometry':geometry,'styles':styles})
  comparisons.append({'page':page,'width':width,'differences':differences})
result={'status':'PASS','scope':'R2 realizable geometry and typography; not whole-app pixel equality','assertedBoxes':len(checks),'checks':checks,'comparisons':comparisons,'remainingAdaptations':['900px description lengths: actual folder paths vs prototype topic copy; content-only control restores equal split/list/row heights','Real review events / average score / objective correctness replace demonstration mastery numbers','Folder colors and deck ordering have no frozen production metadata; use real catalog order and neutral blue','Extra folder-management disclosure and actual-session continuation are production business entries'],'windows':'NOT_RUN','fullCrossPageVisual':'NOT_RUN'}
(root/'diff.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':result['status'],'assertedBoxes':len(checks),'comparisons':len(comparisons)}))
