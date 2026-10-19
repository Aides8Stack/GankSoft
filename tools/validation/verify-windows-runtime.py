"""Verify target PE architecture and unchanged official Electron runtime bytes."""
from pathlib import Path
import zipfile, hashlib, json, struct, sys
folder=Path(sys.argv[1]);runtime=Path(sys.argv[2])
def sha(b):return hashlib.sha256(b).hexdigest()
def pe(data,name):
 assert data[:2]==b'MZ',name
 pos=struct.unpack_from('<I',data,0x3c)[0]
 assert data[pos:pos+4]==b'PE\0\0',name
 machine,count=struct.unpack_from('<HH',data,pos+4)
 assert machine==0x8664,(name,'not x64',hex(machine))
 optional=struct.unpack_from('<H',data,pos+20)[0]
 start=pos+24+optional
 assert start+count*40<=len(data),name
 for i in range(count):
  size,offset=struct.unpack_from('<II',data,start+i*40+16)
  assert size+offset<=len(data),(name,'truncated section')
matched=0
with zipfile.ZipFile(runtime) as z:
 assert z.testzip() is None
 for info in z.infolist():
  if info.is_dir() or info.filename in ['electron.exe','resources/default_app.asar']:continue
  target=folder/info.filename
  assert target.is_file(),info.filename
  assert sha(target.read_bytes())==sha(z.read(info)),info.filename
  matched+=1
count=0
for path in folder.rglob('*'):
 if path.is_file() and path.suffix.lower() in ['.exe','.dll','.node']:
  pe(path.read_bytes(),str(path.relative_to(folder)));count+=1
assert (folder/'GankSoft.exe').is_file()
assert not any(p.suffix=='.sqlite' for p in folder.rglob('*'))
result={'officialRuntimeFilesMatched':matched,'validWindowsX64ExeDllNode':count,'officialRuntimeZipSha256':sha(runtime.read_bytes()),'windowsExecutionTested':False}
print(json.dumps(result,indent=2))
Path('validation-results/windows-runtime.json').write_text(json.dumps(result,indent=2))
