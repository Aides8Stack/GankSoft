import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { ProtocolStore, Receipt } from '../../shared/protocol/host.ts';
import { Envelope } from '../../shared/protocol/registry.ts';
import { transaction } from '../infrastructure/database.ts';

/** Installed independently from domain schema; no historical data conversion. */
export function sqliteProtocolStore(db: DatabaseSync): ProtocolStore {
  db.exec(`CREATE TABLE IF NOT EXISTS protocol_meta(
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),epoch TEXT NOT NULL,revision INTEGER NOT NULL,
    schema_version INTEGER NOT NULL CHECK(schema_version>=1));
    CREATE TABLE IF NOT EXISTS protocol_receipts(
    epoch TEXT NOT NULL,request_id TEXT NOT NULL,method TEXT NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,
    PRIMARY KEY(epoch,request_id));`);
  db.prepare('INSERT OR IGNORE INTO protocol_meta VALUES(1,?,0,1)').run(randomUUID());
  if (
    db.prepare('SELECT schema_version FROM protocol_meta WHERE singleton=1').get()
      ?.schema_version !== 1
  )
    throw new Error('不支持的内部协议存储版本，禁止继续写入');
  const meta = () =>
    db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get() as {
      epoch: string;
      revision: number;
    };
  return {
    epoch: () => meta().epoch,
    revision: () => meta().revision,
    atomic: (fn) => transaction(db, fn),
    getReceipt(id) {
      const r = db
        .prepare(
          'SELECT method,digest,response FROM protocol_receipts WHERE epoch=? AND request_id=?',
        )
        .get(meta().epoch, id) as { method: string; digest: string; response: string } | undefined;
      return r
        ? { method: r.method, digest: r.digest, response: Envelope.parse(JSON.parse(r.response)) }
        : null;
    },
    putReceipt(id, r: Receipt) {
      db.prepare('INSERT INTO protocol_receipts VALUES(?,?,?,?,?)').run(
        meta().epoch,
        id,
        r.method,
        r.digest,
        JSON.stringify(r.response),
      );
    },
    bumpRevision() {
      db.prepare('UPDATE protocol_meta SET revision=revision+1 WHERE singleton=1').run();
      return meta().revision;
    },
  };
}
export function renewProtocolEpoch(db: DatabaseSync): string {
  return transaction(db, () => {
    const epoch = randomUUID();
    db.prepare('UPDATE protocol_meta SET epoch=?,revision=0 WHERE singleton=1').run(epoch);
    return epoch;
  });
}
