import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  automaticQuestionTitle,
  isLegacyQuestionTitle,
} from "../../shared/question-title.ts";
import { REVIEW_SCHEMA, DUE_SCHEMA, EVIDENCE_SCHEMA } from "./review-schema.ts";
import { INITIAL_SCHEMA } from "./schema.ts";
import { guardUnmanagedPath, guardDatabaseAccess, beforeOwnedCommit } from './write-owner.ts';
export const SCHEMA_VERSION = 604;
export const APPLICATION_ID = 0x47414e4b;
export const DEFAULT_QUESTION_DECK = "e2bec1ad-2134-4b36-89e5-e0785788f540";
export const DEFAULT_MEMORY_DECK = "01699e04-dc9d-4c79-a58c-07c913b8819e";
export function openDatabase(path: string): DatabaseSync {
  guardUnmanagedPath(path);
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000",
  );
  const version = Number(db.prepare("PRAGMA user_version").get()?.user_version);
  const marker = Number(
    db.prepare("PRAGMA application_id").get()?.application_id,
  );
  if (
    version !== 0 &&
    (![600, 601, 602, 603, SCHEMA_VERSION].includes(version) || marker !== APPLICATION_ID)
  ) {
    db.close();
    throw new Error("此数据库不是GankSoft v0.6.0数据，不能打开或迁移。");
  }
  if (version === 0) {
    const existing = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all();
    if (existing.length) {
      db.close();
      throw new Error("拒绝接管未知数据库");
    }
    transaction(db, () => {
      db.exec(INITIAL_SCHEMA);
      db.prepare("INSERT INTO settings VALUES (?,?)").run(
        "review",
        '{"dailyLimit":15,"maxInterval":365}',
      );
      db.prepare("INSERT INTO settings VALUES (?,?)").run(
        "studyTimezone",
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      for (const [id, name, kind] of [
        [DEFAULT_QUESTION_DECK, "错题复盘", "question"],
        [DEFAULT_MEMORY_DECK, "记忆积累", "memory"],
      ]) {
        db.prepare("INSERT INTO decks(id,name,kind) VALUES (?,?,?)").run(
          id,
          name,
          kind,
        );
        db.prepare("INSERT INTO deck_review_policies VALUES (?,15,365)").run(
          id,
        );
      }
      db.exec(
        `PRAGMA user_version=${SCHEMA_VERSION};PRAGMA application_id=${APPLICATION_ID}`,
      );
    });
  }
  if (version === 600) {
    transaction(db, () => {
      db.exec(`ALTER TABLE study_sessions RENAME TO study_sessions_v600;
        CREATE TABLE study_sessions(deck_id TEXT NOT NULL REFERENCES decks(id),payload TEXT NOT NULL,updated_at TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
        INSERT INTO study_sessions SELECT * FROM study_sessions_v600;
        DROP TABLE study_sessions_v600;
        CREATE UNIQUE INDEX study_session_identity ON study_sessions(deck_id,json_extract(payload,'$.sessionId')) WHERE json_valid(payload);
        PRAGMA user_version=601;`);
    });
  }
  if (version <= 601) transaction(db, () => {
    db.exec(REVIEW_SCHEMA);
    db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
  });
  if (version <= 602) transaction(db, () => { db.exec(DUE_SCHEMA); db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`); });
  if (version <= 603) transaction(db, () => { db.exec(EVIDENCE_SCHEMA); db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`); });
  // Idempotent, narrowly recognized metadata repair. No learning content or history is changed.
  transaction(db, () => {
    const rows = db
      .prepare("SELECT id,module,title,stem FROM questions")
      .all() as { id: string; module: string; title: string; stem: string }[];
    const update = db.prepare(
      "UPDATE questions SET title=?,version=version+1 WHERE id=?",
    );
    for (const row of rows)
      if (isLegacyQuestionTitle(row.title, row.module, row.stem))
        update.run(automaticQuestionTitle(row.stem), row.id);
  });
  return db;
}
export function transaction<T>(db: DatabaseSync, action: () => T): T {
  guardDatabaseAccess(db);
  const nested = db.isTransaction;
  // Nested module calls share the outer owner; savepoints never commit it.
  const savepoint = "gank_module_" + crypto.randomUUID().replaceAll("-", "");
  db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
  try {
    const value = action();
    if (!nested) beforeOwnedCommit(db);
    db.exec(nested ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT");
    return value;
  } catch (error) {
    try {
      if (!db.isTransaction) throw new Error("事务已结束，无法确认提交状态");
      if (nested) {
        db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      } else db.exec("ROLLBACK");
    } catch (rollbackError) {
      throw Object.assign(
        new Error("事务提交或回滚状态未知", { cause: rollbackError }),
        {
          transactionOutcome: "unknown" as const,
        },
      );
    }
    throw error;
  }
}
