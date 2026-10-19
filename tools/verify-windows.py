#!/usr/bin/env python3
"""Verify a GankSoft Windows ZIP, optionally against an original runtime ZIP."""
import argparse
import hashlib
import struct
import zipfile


def entries(archive):
    result = {}
    for info in archive.infolist():
        if info.is_dir():
            continue
        path = info.filename.split('/', 1)
        if len(path) != 2:
            continue
        if path[1] in result:
            raise ValueError('Duplicate ZIP path: ' + path[1])
        result[path[1]] = info
    return result


def validate_pe(data, name):
    if len(data) < 64 or data[:2] != b'MZ':
        raise ValueError('Invalid executable header: ' + name)
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    if pe + 24 > len(data) or data[pe:pe + 4] != b'PE\0\0':
        raise ValueError('Invalid PE header: ' + name)
    machine, count = struct.unpack_from('<HH', data, pe + 4)
    if machine != 0x8664:
        raise ValueError('Expected Windows x64: ' + name)
    optional_size = struct.unpack_from('<H', data, pe + 20)[0]
    start = pe + 24 + optional_size
    if start + count * 40 > len(data):
        raise ValueError('Truncated PE section table: ' + name)
    for i in range(count):
        size, offset = struct.unpack_from('<II', data, start + i * 40 + 16)
        if offset + size > len(data):
            raise ValueError('Truncated PE section: ' + name)


def verify(path, runtime_path=None):
    with zipfile.ZipFile(path) as archive:
        files = entries(archive)
        for required in ['GankSoft.exe', 'resources/app.asar', 'icudtl.dat', 'resources.pak',
                         'v8_context_snapshot.bin', 'snapshot_blob.bin', 'locales/zh-CN.pak']:
            if required not in files:
                raise ValueError('Missing required runtime file: ' + required)
        if archive.testzip() is not None:
            raise ValueError('ZIP CRC validation failed')
        pe_count = 0
        for name, info in files.items():
            if name.lower().endswith(('.exe', '.dll')):
                validate_pe(archive.read(info), name)
                pe_count += 1
        if runtime_path:
            with zipfile.ZipFile(runtime_path) as original:
                compared = 0
                for name, info in entries(original).items():
                    if name == 'resources/app.asar':
                        continue
                    if name not in files or files[name].file_size != info.file_size:
                        raise ValueError('Runtime size mismatch: ' + name)
                    actual = hashlib.sha256(archive.read(files[name])).digest()
                    expected = hashlib.sha256(original.read(info)).digest()
                    if actual != expected:
                        raise ValueError('Runtime hash mismatch: ' + name)
                    compared += 1
                print('Original runtime files matched:', compared)
        print('ZIP integrity passed; valid x64 EXE/DLL files:', pe_count)
        print('GankSoft.exe size:', files['GankSoft.exe'].file_size)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('package')
    parser.add_argument('--runtime-zip')
    args = parser.parse_args()
    verify(args.package, args.runtime_zip)
