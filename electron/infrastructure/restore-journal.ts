import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  openSync,
  writeFileSync,
  fsyncSync,
  closeSync,
} from 'node:fs';
export function writeRestoreJournal(dataDir: string, staging: string, old: string) {
  const file = dataDir + '-restore.json',
    fd = openSync(file, 'w', 0o600);
  try {
    writeFileSync(fd, JSON.stringify({ version: 1, staging, old }));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
export function finishRestoreJournal(dataDir: string) {
  rmSync(dataDir + '-restore.json', { force: true });
}
/** A process interruption rolls back the unacknowledged directory swap before any new database opens. */
export function recoverInterruptedRestore(dataDir: string) {
  const file = dataDir + '-restore.json';
  if (!existsSync(file)) return false;
  const journal = JSON.parse(readFileSync(file, 'utf8'));
  if (
    journal.version !== 1 ||
    typeof journal.staging !== 'string' ||
    typeof journal.old !== 'string' ||
    !journal.staging.startsWith(dataDir + '-staging-') ||
    !journal.old.startsWith(dataDir + '-before-restore-') ||
    [journal.staging, journal.old].some((p: string) => /[\\/]/.test(p.slice(dataDir.length)))
  )
    throw new Error('恢复日志路径不合法，未自动修改数据');
  if (existsSync(journal.old)) {
    if (existsSync(dataDir)) renameSync(dataDir, dataDir + '-unconfirmed-' + Date.now());
    renameSync(journal.old, dataDir);
  } else if (!existsSync(dataDir)) throw new Error('恢复日志中的原数据目录缺失，请手动核对备份');
  if (existsSync(journal.staging)) rmSync(journal.staging, { recursive: true, force: true });
  finishRestoreJournal(dataDir);
  return true;
}
