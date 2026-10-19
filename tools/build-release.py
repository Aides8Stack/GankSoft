#!/usr/bin/env python3
"""Build a validated Windows portable package from a complete original runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile
import zlib

parser=argparse.ArgumentParser()
parser.add_argument('--runtime-zip',required=True)
parser.add_argument('--output',required=True)
parser.add_argument('--design',required=True)
a=parser.parse_args()
root=Path(__file__).resolve().parent.parent
out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
version=json.loads((root/'package.json').read_text())['version']
work=Path(tempfile.mkdtemp(prefix='ganksoft-release-'))
windows=work/('GankSoft-v'+version);windows.mkdir()
with zipfile.ZipFile(a.runtime_zip) as original:
    for info in original.infolist():
        if info.is_dir():continue
        path=Path(*Path(info.filename).parts[1:])
        if path.is_absolute() or '..' in path.parts:raise ValueError('Unsafe runtime path')
        dest=windows/path;dest.parent.mkdir(parents=True,exist_ok=True)
        with original.open(info) as source,dest.open('wb') as target:
            shutil.copyfileobj(source,target,1024*1024)
        data=dest.read_bytes()
        assert len(data)==info.file_size and zlib.crc32(data)&0xffffffff==info.CRC,str(path)
app=work/'application';app.mkdir()
for name in ['dist','dist-electron']:
    shutil.copytree(root/name,app/name)
shutil.copyfile(root/'package.json',app/'package.json')
# Include every main-process runtime dependency, with the Windows native image decoder.
(app/'node_modules').mkdir()
shutil.copytree(root/'node_modules/ts-fsrs',app/'node_modules/ts-fsrs')
for package in ['image','image-win32-x64-msvc']:
    source=root/'node_modules/@napi-rs'/package
    if not source.exists():
        raise SystemExit('Windows image decoder missing. Run npm ci and package-win.cmd on Windows, or install the matching Windows optional dependency before cross-packaging.')
    shutil.copytree(source,app/'node_modules/@napi-rs'/package)
subprocess.run(['node',str(root/'node_modules/@electron/asar/bin/asar.js'),'pack',str(app),str(windows/'resources/app.asar'),'--unpack','**/*.node'],check=True,cwd=root)
shutil.copyfile(root/'README.md',windows/'README.md')
if (root/'docs/RELIABILITY-v0.4.8.md').exists():
    (windows/'docs').mkdir(exist_ok=True)
    shutil.copyfile(root/'docs/RELIABILITY-v0.4.8.md',windows/'docs/RELIABILITY-v0.4.8.md')
shutil.copyfile(root/'docs/REVIEW-POLICY-v0.4.9.md',windows/'docs/REVIEW-POLICY-v0.4.9.md')
shutil.copyfile(root/'docs/REVIEW-MODULES-v0.4.10.md',windows/'docs/REVIEW-MODULES-v0.4.10.md')
shutil.copyfile(root/'docs/REVIEW-TIMELINE-v0.4.11.md',windows/'docs/REVIEW-TIMELINE-v0.4.11.md')
shutil.copyfile(a.design,windows/'GankSoft-v0.4-Design.pdf')
shutil.copytree(root/'examples',windows/'examples')
shutil.copytree(root/'LICENSES',windows/'LICENSES')
manifest={str(f.relative_to(windows)):hashlib.sha256(f.read_bytes()).hexdigest() for f in windows.rglob('*') if f.is_file()}
(windows/'SHA256SUMS.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
archive=out/('GankSoft-v'+version+'-Windows-x64.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in windows.rglob('*'):
        if f.is_file():z.write(f,Path(windows.name)/f.relative_to(windows))
subprocess.run([sys.executable,str(root/'tools/verify-windows.py'),str(archive),'--runtime-zip',a.runtime_zip],check=True)
source=out/('GankSoft-v'+version+'-source.zip')
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in root.rglob('*'):
        if not f.is_file():continue
        rel=f.relative_to(root)
        if rel.parts[0] in {'node_modules','dist','dist-electron','out'}:continue
        z.write(f,Path('GankSoft-v'+version+'-source')/rel)
for file in [archive,source]:
    with zipfile.ZipFile(file) as z:assert z.testzip() is None
    print(file.name,file.stat().st_size)
print('RELEASE_ASAR='+str(windows/'resources/app.asar'))
