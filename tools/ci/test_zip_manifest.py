"""Regression: Windows locale encoding must not corrupt Chinese ZIP manifests."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile


class ZipManifestTest(unittest.TestCase):
    def test_unicode_manifest_with_non_utf8_default(self):
        with tempfile.TemporaryDirectory(prefix="gank-zip-test-") as temp:
            base = Path(temp) / "application"
            native = base / "resources/app.asar.unpacked/node_modules/@napi-rs/image-win32-x64-msvc"
            native.mkdir(parents=True)
            for path, data in {
                base / "GankSoft.exe": b"MZ-fixture",
                base / "resources/app.asar": b"fixture",
                base / "使用说明.txt": "中文说明".encode("utf-8"),
                native / "image.win32-x64-msvc.node": b"MZ-fixture-addon",
                native / "package.json": json.dumps({"name": "@napi-rs/image-win32-x64-msvc", "main": "image.win32-x64-msvc.node"}).encode(),
            }.items():
                path.write_bytes(data)
            for name in ["vcruntime140.dll", "vcruntime140_1.dll"]:
                (base / name).write_bytes(b"MZ-fixture-dll")
                (native / name).write_bytes(b"MZ-fixture-dll")
            archive = Path(temp) / "test.zip"
            # Emulate Windows text defaults without changing filesystem encoding.
            wrapper = """
import pathlib, runpy, sys
original = pathlib.Path.write_text
def windows_default(self, data, encoding=None, errors=None, newline=None):
    return original(self, data, encoding=encoding or 'cp1252', errors=errors, newline=newline)
pathlib.Path.write_text = windows_default
sys.argv = sys.argv[1:]
runpy.run_path(sys.argv[0], run_name='__main__')
"""
            env = {**os.environ, "PYTHONUTF8": "0"}
            result = subprocess.run([sys.executable, "-X", "utf8=0", "-c", wrapper, "tools/build/zip-windows.py", str(base), str(archive), "test"], env=env, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8", errors="replace"))
            with zipfile.ZipFile(archive) as zipped:
                manifest = json.loads(zipped.read("test/SHA256SUMS.json").decode("utf-8"))
                self.assertIn("使用说明.txt", manifest)
                self.assertEqual(zipped.read("test/使用说明.txt"), "中文说明".encode("utf-8"))
                self.assertEqual(manifest["使用说明.txt"], hashlib.sha256("中文说明".encode("utf-8")).hexdigest())


if __name__ == "__main__":
    unittest.main()
