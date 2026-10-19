import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { readContainer, writeContainer, sha256 } from '../../infrastructure/containers.ts';
import { validatePackage } from './protocol.ts';
import type { ExchangePackage } from '../../../shared/import-protocol.ts';
import { z } from 'zod';
const Manifest = z.strictObject({
  format: z.literal('ganksoft.content.container'),
  version: z.literal(1),
  entries: z
    .array(
      z.strictObject({
        name: z.string(),
        size: z.number().int().nonnegative(),
        checksum: z.string().regex(/^[0-9a-f]{64}$/),
      }),
    )
    .max(10000),
});
export async function writeContentPackage(destination: string, pkg: ExchangePackage) {
  validatePackage(pkg);
  const files = new Map<string, Buffer>();
  const document = {
    ...pkg,
    items: pkg.items.map((item, i) => ({
      ...item,
      images: item.images?.map((image, j) => {
        const path = `assets/${i}-${j}.bin`;
        files.set(path, Buffer.from(image.base64, 'base64'));
        return { role: image.role, mime: image.mime, path };
      }),
    })),
  };
  files.set('content.json', Buffer.from(JSON.stringify(document)));
  files.set(
    'manifest.json',
    Buffer.from(
      JSON.stringify({
        format: 'ganksoft.content.container',
        version: 1,
        entries: [...files].map(([name, bytes]) => ({
          name,
          size: bytes.length,
          checksum: sha256(bytes),
        })),
      }),
    ),
  );
  await writeContainer(destination, files);
}
export async function readContentPackage(source: string): Promise<ExchangePackage> {
  if ((await stat(source)).size > 128 * 1024 * 1024) throw new Error('导入包不能超过128 MB');
  if (extname(source).toLowerCase() === '.json') {
    const text = (await readFile(source, 'utf8')).replace(/^\uFEFF/, '');
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('JSON 文件格式错误，请检查数据包内容');
    }
    return validatePackage(raw);
  }
  const files = await readContainer(source),
    manifest = Manifest.parse(JSON.parse(files.get('manifest.json')?.toString('utf8') ?? 'null'));
  if (manifest.entries.length + 1 !== files.size) throw new Error('内容包条目不一致');
  const seen = new Set<string>();
  for (const e of manifest.entries) {
    const bytes = files.get(e.name);
    if (seen.has(e.name) || !bytes || bytes.length !== e.size || sha256(bytes) !== e.checksum)
      throw new Error('内容包校验失败');
    seen.add(e.name);
  }
  const raw = JSON.parse(files.get('content.json')?.toString('utf8') ?? 'null');
  if (!raw || !Array.isArray(raw.items)) throw new Error('内容包缺少条目');
  const referenced = new Set(['content.json']);
  for (const item of raw.items) {
    if (item.images !== undefined && !Array.isArray(item.images)) throw new Error('图片条目不合法');
    for (const image of item.images ?? []) {
      if (
        typeof image.path !== 'string' ||
        !/^assets\/[0-9]+-[0-9]+\.bin$/.test(image.path) ||
        !files.has(image.path) ||
        referenced.has(image.path)
      )
        throw new Error('内容包附件引用不合法');
      referenced.add(image.path);
      image.base64 = files.get(image.path)!.toString('base64');
      delete image.path;
    }
  }
  if (referenced.size !== manifest.entries.length) throw new Error('内容包存在未引用条目');
  return validatePackage(raw);
}
