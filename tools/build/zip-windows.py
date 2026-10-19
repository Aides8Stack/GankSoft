"""Create a complete portable Windows ZIP, including nested node_modules in app.asar.unpacked."""
from pathlib import Path
import hashlib,json,sys,zipfile
base=Path(sys.argv[1]).resolve();target=Path(sys.argv[2]).resolve();prefix=sys.argv[3]
assert (base/'GankSoft.exe').is_file()
# node_modules is runtime data here: never apply source-package exclusions to this directory.
files=sorted(p for p in base.rglob('*') if p.is_file() and not any(c.startswith('.') for c in p.relative_to(base).parts))
manifest=base/'SHA256SUMS.json'
manifest.write_text(json.dumps({str(p.relative_to(base)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p!=manifest},ensure_ascii=False,indent=2)+'\n')
if manifest not in files:files.append(manifest)
target.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in files:z.write(p,prefix+'/'+str(p.relative_to(base)).replace('\\','/'))
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'validation'))
from verify_delivery import verify
print(json.dumps(verify(target),indent=2))
