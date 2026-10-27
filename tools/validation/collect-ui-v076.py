"""Collect synthetic/reference evidence, preserving pixels and recording source identity."""
from pathlib import Path
import hashlib,json,subprocess,shutil
from PIL import Image,ImageDraw,ImageFont
root=Path('validation-results/v076'); target=Path('docs/v076/stages')
source_sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
files=subprocess.check_output(['git','ls-files','src','electron','shared'],text=True).splitlines()
fingerprint=hashlib.sha256()
for name in files:
    fingerprint.update(name.encode());fingerprint.update(Path(name).read_bytes())
for stage,names in {'P1':['home-empty','home-synthetic'],'P2':['deck-overview','deck-empty','cards','cards-empty','card-detail']}.items():
    out=target/stage/'evidence'/'full-fidelity';out.mkdir(parents=True,exist_ok=True)
    entries=[]
    for name in names:
        reference='overview' if name.startswith('home') else 'deck' if name.startswith('deck') else 'cardDetail' if name=='card-detail' else 'cards'
        for width in (1500,1366,900):
            production=root/'P2'/f'{name}-{width}.png';ref=root/'reference'/f'reference-{reference}-{width}.png'
            for src in (production,ref):
                image=Image.open(src);assert image.size==(width,900),src
                shutil.copyfile(src,out/src.name)
            sheet=Image.new('RGB',(width*2,936),'#f7f8f7');draw=ImageDraw.Draw(sheet)
            draw.text((16,10),'v3.7 REFERENCE / demo data',fill='#26352f')
            draw.text((width+16,10),'PRODUCTION606 / synthetic data / Linux',fill='#26352f')
            sheet.paste(Image.open(ref),(0,36));sheet.paste(Image.open(production),(width,36))
            comparison=f'compare-{name}-{width}.webp';sheet.save(out/comparison,'WEBP',lossless=True)
            entries.append({'page':name,'width':width,'height':900,'reference':ref.name,'production':production.name,'comparison':comparison,'sha256':hashlib.sha256(production.read_bytes()).hexdigest()})
    manifest={'sourceParentSha':source_sha,'implementationFingerprintSha256':fingerprint.hexdigest(),'workingTree':True,'platform':'Linux','font':'Noto Sans CJK SC fallback','scaleFactor':1,'referenceSha256':'8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015','entry':'electron/main.ts -> src/main.ts -> UnifiedWorkspace.vue','data':'temporary fresh606 / synthetic606, no real user data','visualWindows':'NOT_RUN','visualWin10Manual':'NOT_RUN','visualWin11Manual':'NOT_RUN','images':entries}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
