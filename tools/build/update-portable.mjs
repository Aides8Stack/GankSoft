/** Update app code and EXE version resources; preserve runtime DLL/native binaries. */
import { extractAll, createPackageWithOptions, extractFile } from '@electron/asar';
import {
  cpSync,
  mkdtempSync,
  rmSync,
  renameSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const folder = resolve(process.argv[2] ?? ''),
  resources = join(folder, 'resources'),
  archive = join(resources, 'app.asar'),
  work = mkdtempSync(join(tmpdir(), 'gank-update-'));
extractAll(archive, work);
const pkg = JSON.parse(readFileSync('package.json', 'utf8')),
  oldPkg = JSON.parse(readFileSync(join(work, 'package.json'), 'utf8'));
writeFileSync(
  join(work, 'package.json'),
  JSON.stringify({ ...oldPkg, version: pkg.version }, null, 2),
);
for (const dir of ['dist', 'dist-electron']) {
  rmSync(join(work, dir), { recursive: true, force: true });
  cpSync(resolve(dir), join(work, dir), { recursive: true });
}
for (const name of readdirSync(folder))
  if (name.startsWith('.GankSoft.exe.')) unlinkSync(join(folder, name));
const next = join(resources, 'app.next.asar');
await createPackageWithOptions(work, next, { unpack: '**/*.node', unpackDir:'node_modules/@napi-rs/image-win32-x64-msvc' });
assert(extractFile(next, 'dist/index.html').equals(readFileSync('dist/index.html')));
renameSync(next, archive);
rmSync(join(resources, 'app.asar.unpacked'), { recursive: true, force: true });
renameSync(next + '.unpacked', archive + '.unpacked');
cpSync('LICENSES', join(folder, 'LICENSES'), { recursive: true });
cpSync('examples', join(folder, 'examples'), { recursive: true });
const { resedit } = await import('@electron/packager/resedit');
await resedit(join(folder, 'GankSoft.exe'), {
  fileVersion: pkg.version,
  productVersion: pkg.version,
  productName: pkg.productName,
});
writeFileSync(join(folder,'本次更新.txt'),'GankSoft '+pkg.version+' RC：详见当前版本设计与验证文档。Windows10/11尚未实测。\r\n');
writeFileSync(join(folder,'使用说明.txt'),'GankSoft '+pkg.version+' RC / Windows10、11 x64\r\n完整解压运行，无需Node。数据空间v060/data、schema601保持。升级前完整备份。图片在编辑页管理，详情只读。Windows双系统尚未实测。\r\n');
for (const name of readdirSync(folder))
  if (name.startsWith('.GankSoft.exe.')) unlinkSync(join(folder, name));
rmSync(work, { recursive: true, force: true });
console.log('Updated portable app; DLL/native runtime unchanged; EXE version resources updated.');
