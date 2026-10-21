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
                base / "build-metadata.json": json.dumps({"sha":"a"*40,"packagingToolchain":{"sha":"b"*40},"runId":"123","runAttempt":"1","name":"full-fixture-build-identity"}).encode(),
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
            result = subprocess.run([sys.executable, "-X", "utf8=0", "-c", wrapper, "tools/build/zip-windows.py", str(base), str(archive), "GankSoft"], env=env, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8", errors="replace"))
            with zipfile.ZipFile(archive) as zipped:
                self.assertTrue(all(n.startswith("GankSoft/") for n in zipped.namelist()))
                self.assertLess(max(len(n) for n in zipped.namelist()) + 101, 260)
                manifest = json.loads(zipped.read("GankSoft/SHA256SUMS.json").decode("utf-8"))
                self.assertIn("使用说明.txt", manifest)
                self.assertEqual(zipped.read("GankSoft/使用说明.txt"), "中文说明".encode("utf-8"))
                self.assertEqual(manifest["使用说明.txt"], hashlib.sha256("中文说明".encode("utf-8")).hexdigest())

            if sys.platform == "win32":
                report = Path(temp) / "extraction.json"
                actual = subprocess.run(["pwsh", "-NoProfile", "-File", "tools/ci/windows-extract.ps1", "-Archive", str(archive), "-Report", str(report), "-Metadata", str(base / "build-metadata.json")], capture_output=True)
                self.assertEqual(actual.returncode, 0, actual.stderr.decode("utf-8", errors="replace"))
                evidence = json.loads(report.read_text(encoding="utf-8-sig"))
                self.assertEqual(evidence["status"], "PASS")
                self.assertEqual(evidence["platform"], "win32")
                self.assertEqual(evidence["archiveSha256"], hashlib.sha256(archive.read_bytes()).hexdigest())
                self.assertEqual([d["destinationLength"] for d in evidence["destinations"]], [80,100])
                self.assertTrue(all(d["maxAbsolutePath"] < 260 and d["status"] == "PASS" for d in evidence["destinations"]))
                print(json.dumps(evidence))
                # The native check must reject a substituted expected build identity.
                wrong = Path(temp) / "wrong-metadata.json"
                wrong.write_text('{}', encoding='utf-8')
                rejected = subprocess.run(["pwsh", "-NoProfile", "-File", "tools/ci/windows-extract.ps1", "-Archive", str(archive), "-Report", str(report), "-Metadata", str(wrong)], capture_output=True)
                self.assertNotEqual(rejected.returncode, 0)
                self.assertFalse(report.exists(), "failed extraction must not leave stale PASS evidence")


if __name__ == "__main__":
    unittest.main()
