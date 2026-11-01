import { DatabaseSync } from "node:sqlite";
import { guardDatabaseAccess, bindWriteOwner } from "./write-owner.ts";
/** Authorized read handle for an existing owner, never a new write owner.
 * SQLite readOnly + query_only protect the DB even if a domain write is called.
 * Pin the read transaction before yielding; disposal invalidates this handle. */
export function openReadSnapshot(source: DatabaseSync) {
  guardDatabaseAccess(source);
  const location = source.location();
  if (!location) throw Error("导出需要文件数据库");
  const db = new DatabaseSync(location, { readOnly: true });
  let active = true;
  try {
    db.exec("PRAGMA query_only=ON; PRAGMA cache_size=-8192; BEGIN");
    const meta = db
      .prepare("SELECT epoch,revision FROM protocol_meta WHERE singleton=1")
      .get()!;
    bindWriteOwner(db, {
      active: false,
      guard() {
        if (!active || !db.isTransaction) throw Error("只读导出快照已关闭");
      },
      beforeCommit() {
        throw Error("只读导出禁止写入");
      },
    });
    return {
      db,
      meta,
      close() {
        active = false;
        if (db.isTransaction) db.exec("ROLLBACK");
        db.close();
      },
    };
  } catch (e) {
    db.close();
    throw e;
  }
}
