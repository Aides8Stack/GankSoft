import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
/** Resolve the same package manifest in TS sources, compiled output and app.asar. */
export function applicationVersion(moduleUrl: string = import.meta.url): string {
  let directory = dirname(fileURLToPath(moduleUrl));
  for (let depth = 0; depth < 5; depth++) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      if (pkg.name !== 'ganksoft' || typeof pkg.version !== 'string')
        throw new Error('Invalid application version manifest');
      return pkg.version;
    }
    directory = dirname(directory);
  }
  throw new Error('Application version manifest missing');
}
export const APPLICATION_VERSION = applicationVersion();
