"""Check the actual Windows ZIP, not just its pre-compression staging directory."""
from pathlib import Path
import hashlib,json,sys,zipfile

def verify(path):
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        assert len(names)==len(set(names)), 'duplicate entries'
        assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in names), 'unsafe path'
        assert z.testzip() is None, 'ZIP CRC failure'
        roots={n.split('/')[0] for n in names};assert len(roots)==1
        root=next(iter(roots))+'/'
        native=root+'resources/app.asar.unpacked/node_modules/@napi-rs/image-win32-x64-msvc/'
        for relative in ['GankSoft.exe','resources/app.asar']:
            assert root+relative in names, 'missing '+relative
        for relative in ['package.json','image.win32-x64-msvc.node','vcruntime140.dll','vcruntime140_1.dll']:
            assert native+relative in names, 'missing unpacked addon '+relative
        manifest=json.loads(z.read(root+'SHA256SUMS.json'))
        payload={n[len(root):] for n in names if not n.endswith('/') and n!=root+'SHA256SUMS.json'}
        assert set(manifest)==payload, 'manifest does not cover the entire ZIP'
        for relative,digest in manifest.items():
            assert hashlib.sha256(z.read(root+relative)).hexdigest()==digest, 'hash mismatch '+relative
        meta=json.loads(z.read(native+'package.json'))
        assert meta['name']=='@napi-rs/image-win32-x64-msvc'
        assert z.read(native+meta['main'])[:2]==b'MZ', 'invalid Windows addon'
        for dll in ['vcruntime140.dll','vcruntime140_1.dll']:
            assert z.read(native+dll)==z.read(root+dll), 'runtime mismatch'
        return {'zip':Path(path).name,'entries':len(names),'crc':'passed','completeManifest':'passed','unpackedNativeAddon':'present','windowsExecutionTested':False}

if __name__=='__main__':print(json.dumps(verify(sys.argv[1]),indent=2))
