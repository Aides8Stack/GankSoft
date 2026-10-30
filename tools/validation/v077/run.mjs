import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {IMPLEMENTED, loadCases, selectCases} from './registry.mjs';

// Commands:
//   node tools/validation/v077/run.mjs list [--group NEW] [--priority P0]
//   node tools/validation/v077/run.mjs run --ids NEW-01,OLD-03
//   node tools/validation/v077/run.mjs run --group NEW --mapped-only
const [command = 'list', ...args] = process.argv.slice(2);
const flag = name => args.includes('--' + name);
function option(name) {
  const i = args.indexOf('--' + name);
  if (i === -1) return null;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error('V077_MISSING_OPTION_VALUE: ' + name);
  return args[i + 1];
}
const valued = new Set(['--group','--priority','--ids']);
for (let i = 0; i < args.length; i++) {
  const item = args[i];
  if (item === '--mapped-only') continue;
  if (valued.has(item)) { option(item.slice(2)); i++; continue; }
  throw Error('V077_UNKNOWN_ARGUMENT: ' + item);
}
if (!['list','run'].includes(command)) throw Error('V077_UNKNOWN_COMMAND: ' + command);
const all = loadCases();
const options = {
  group: option('group')?.toUpperCase(),
  priority: option('priority')?.toUpperCase(),
  ids: option('ids')?.split(',').map(x => x.trim().toUpperCase()).filter(Boolean),
  mappedOnly: flag('mapped-only')
};
const selected = selectCases(all, options);
const mapped = selected.filter(row => IMPLEMENTED[row.id]);
const notImplemented = selected.filter(row => !IMPLEMENTED[row.id]);
const counts = rows => Object.fromEntries(['P0','P1','P2'].map(p => [p, rows.filter(r => r.priority === p).length]));
if (command === 'list') {
  console.log(JSON.stringify({total:all.length, selected:selected.length, implemented:mapped.length,
    unmapped:notImplemented.length, priorityCounts:counts(selected),
    implementedIDs:mapped.map(row => row.id), uncoveredIDs:notImplemented.map(row => row.id)}, null, 2));
} else {
  if (!existsSync(resolve('dist-electron/electron/main.js'))) {
    throw Error('V077_BUILD_REQUIRED: npm run build (the real Electron production bundle is required)');
  }
  const runId = new Date().toISOString().replace(/[:.]/g,'-') + '-' + process.pid;
  const root = resolve('validation-results/v077/runs', runId);
  mkdirSync(root, {recursive:true});
  const git = spawnSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'});
  const sourceSha = git.status === 0 ? git.stdout.trim() : process.env.GANKSOFT_SOURCE_SHA ?? null;
  const rows = [];
  let failed = 0;
  for (const item of selected) {
    const script = IMPLEMENTED[item.id];
    if (!script) {
      rows.push({id:item.id, status:'NOT_RUN', reason:'NO_AUTOMATED_HANDLER'});
      continue;
    }
    const dir = join(root, item.id);
    mkdirSync(dir, {recursive:true});
    const scriptPath = fileURLToPath(new URL(script, import.meta.url));
    const execution = spawnSync(process.execPath,
      ['--experimental-strip-types', scriptPath, item.id, dir],
      {encoding:'utf8', timeout:180000, maxBuffer:4*1024*1024,
        env:{...process.env, GANKSOFT_V077_CASE:item.id}});
    writeFileSync(join(dir,'console.log'), (execution.stdout ?? '') + '\nSTDERR:\n' + (execution.stderr ?? ''));
    let result;
    const resultPath = join(dir,'case.json');
    try {if (existsSync(resultPath)) result = JSON.parse(readFileSync(resultPath, 'utf8'));} catch {}
    if (!result || result.id !== item.id ||
        !['PASS','FAIL','BLOCKED'].includes(result.status) ||
        (execution.status !== 0 && result.status === 'PASS')) {
      result = {id:item.id,status:'FAIL',reason:'CASE_DID_NOT_RETURN_VALID_SUCCESS',
        exitCode:execution.status, signal:execution.signal, error:String(execution.error ?? ''),
        claimedStatus:result?.status ?? null};
    }
    if (result.status === 'FAIL') failed++;
    rows.push({...result, consolePath:join(dir,'console.log')});
    console.log(item.id + ': ' + result.status);
  }
  const pending = rows.filter(x => x.status === 'NOT_RUN').length;
  const blocked = rows.filter(x => x.status === 'BLOCKED').length;
  const summary = {schema:'ganksoft.v077/automation-run-1', sourceSha, platform:process.platform,
    runId, testLayer:'electronUi', selectedCount:selected.length, implementedCount:mapped.length,
    passed:rows.filter(x => x.status === 'PASS').length, failed, blocked, notRun:pending,
    resultDirectory:root, rows};
  writeFileSync(join(root,'summary.json'), JSON.stringify(summary,null,2)+'\n');
  console.log('V077_E2E_REPORT=' + join(root,'summary.json'));
  console.log(JSON.stringify({selected:summary.selectedCount,passed:summary.passed,failed,
    blocked,notRun:pending,sha:sourceSha}));
  // Unimplemented tests never count as PASS and the full-selection command is not green.
  if (failed) process.exitCode = 1;
  else if (blocked || pending) process.exitCode = 2;
}
