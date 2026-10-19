import {readFileSync,statSync} from 'node:fs';
import {writeContentPackage} from '../../electron/modules/imports/container.ts';
const [source,destination]=process.argv.slice(2);
if(!source||!destination)throw new Error('Usage: node --experimental-strip-types tools/build/content-package.ts input.json output.gank.zip');
if(statSync(source).size>128*1024*1024)throw new Error('JSON source exceeds 128 MiB');
await writeContentPackage(destination,JSON.parse(readFileSync(source,'utf8')));
console.log(destination);
