import yauzl from 'yauzl';
import yazl from 'yazl';
import { createWriteStream } from 'node:fs';
import { stat, rename, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { randomUUID, createHash } from 'node:crypto';
const LIMIT = 512 * 1024 * 1024,
  ENTRY_LIMIT = 128 * 1024 * 1024;
export const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
function safeName(name: string) {
  if (
    !name ||
    name.length > 240 ||
    name.includes('\\') ||
    name.startsWith('/') ||
    name.split('/').some((p) => !p || p === '.' || p === '..' || p.includes(':')) ||
    /[\x00-\x1f]/.test(name)
  )
    throw new Error('压缩包路径不合法');
}
/** Bounded ZIP input. No archive-controlled path is extracted to disk. */
export async function readContainer(path: string): Promise<Map<string, Buffer>> {
  if ((await stat(path)).size > LIMIT) throw new Error('压缩包超过512 MB');
  return new Promise((resolve, reject) =>
    yauzl.open(
      path,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (error, zip) => {
        if (error || !zip) {
          reject(error ?? new Error('压缩包无法打开'));
          return;
        }
        const files = new Map<string, Buffer>(),
          names = new Set<string>();
        let total = 0,
          ended = false;
        const fail = (e: unknown) => {
          if (ended) return;
          ended = true;
          zip.close();
          reject(e);
        };
        zip.on('error', fail);
        zip.on('end', () => {
          if (!ended) {
            ended = true;
            resolve(files);
          }
        });
        zip.on('entry', (entry: yauzl.Entry) => {
          void (async () => {
            safeName(entry.fileName);
            const key = entry.fileName.toLowerCase();
            if (names.has(key) || names.size >= 10000) throw new Error('压缩包条目重复或过多');
            names.add(key);
            if (
              entry.generalPurposeBitFlag & 1 ||
              ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000
            )
              throw new Error('压缩包含加密文件或链接');
            if (entry.uncompressedSize > ENTRY_LIMIT || total + entry.uncompressedSize > LIMIT)
              throw new Error('压缩包展开大小超限');
            const bytes = await new Promise<Buffer>((res, rej) =>
              zip.openReadStream(entry, (e, stream) => {
                if (e || !stream) {
                  rej(e);
                  return;
                }
                const chunks: Buffer[] = [];
                let size = 0;
                stream.on('data', (chunk: Buffer) => {
                  size += chunk.length;
                  total += chunk.length;
                  if (size > ENTRY_LIMIT || total > LIMIT) {
                    stream.destroy(new Error('压缩包实际展开大小超限'));
                    return;
                  }
                  chunks.push(chunk);
                });
                stream.on('error', rej);
                stream.on('end', () => res(Buffer.concat(chunks)));
              }),
            );
            files.set(entry.fileName, bytes);
            zip.readEntry();
          })().catch(fail);
        });
        zip.readEntry();
      },
    ),
  );
}
export async function writeContainer(destination: string, files: Map<string, Buffer>) {
  const temp = destination + '.writing-' + randomUUID(),
    zip = new yazl.ZipFile();
  let total = 0;
  try {
    for (const [name, data] of files) {
      safeName(name);
      total += data.length;
      if (data.length > ENTRY_LIMIT || total > LIMIT) throw new Error('压缩包大小超限');
      zip.addBuffer(data, name);
    }
    zip.end();
    await pipeline(zip.outputStream, createWriteStream(temp, { flags: 'wx' }));
    await rename(temp, destination);
  } finally {
    await rm(temp, { force: true });
  }
}
