import { realpathSync } from 'node:fs';
import { transaction } from '../database.ts';
import type { Context } from '../context.ts';
import { DomainError } from '../../../shared/domain-error.ts';
import { inspectLegacyBaseline, inspectDatabaseBaseline } from './baseline.ts';
import { UNIFIED_SCHEMA, UNIFIED_SCHEMA_VERSION } from './unified-schema.ts';
import { synchronizeLegacyModel } from './legacy-projection.ts';
import { validateUnifiedData } from './unified-integrity.ts';

const known604 = '355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad';
/** Internal deterministic failure/process-interruption seam, never a public protocol. */
export interface ModelHooks { checkpoint?: (phase: string) => void }
/** Only builds/validates an isolated copy. Activation is a separate durable operation. */
export function stageUnifiedModel(ctx: Context, sourceDatabasePath: string, hooks: ModelHooks = {}) {
  const db=ctx.db,path=db.location();
  if(db.isTransaction || !path || path===':memory:' || realpathSync(path)===realpathSync(sourceDatabasePath))
    throw new DomainError('MIGRATION_STAGING_REQUIRED','统一模型只能构建在源库以外的隔离副本');
  const checkpoint=hooks.checkpoint ?? (()=>{});
  if(Number(db.prepare('PRAGMA user_version').get()?.user_version)===606) {
    inspectDatabaseBaseline(path,ctx.dataDir,606); validateUnifiedData(db);
    return {sourceDigest:String(db.prepare('SELECT source_digest FROM learning_model_meta').get()!.source_digest),schemaVersion:606,
      cards:Number(db.prepare('SELECT count(*) AS n FROM learning_cards').get()?.n),events:Number(db.prepare('SELECT count(*) AS n FROM learning_review_events').get()?.n),
      cycles:Number(db.prepare('SELECT count(*) AS n FROM learning_study_cycles').get()?.n),state:'staged' as const,noOp:true};
  }
  const baseline=inspectLegacyBaseline(path,ctx.dataDir);
  if(baseline.schemaHash!==known604) throw new DomainError('MIGRATION_SCHEMA_UNSUPPORTED','仅已核实的完整schema604结构可构建');
  if(db.prepare("SELECT 1 FROM platform_operations WHERE state='pending' LIMIT 1").get())
    throw new DomainError('MIGRATION_OPERATION_PENDING','必须先核对未决平台操作');
  return transaction(db,()=>{
    if(inspectLegacyBaseline(path,ctx.dataDir).digest!==baseline.digest) throw new DomainError('MIGRATION_SOURCE_CHANGED','隔离副本在预检后发生变化');
    db.exec(UNIFIED_SCHEMA); checkpoint('ddl');
    const counts=synchronizeLegacyModel(db,checkpoint);
    db.prepare("INSERT INTO learning_model_meta VALUES(1,604,?,'staged',?)").run(UNIFIED_SCHEMA_VERSION,baseline.digest);
    db.exec(`PRAGMA user_version=${UNIFIED_SCHEMA_VERSION}`);
    validateUnifiedData(db);
    if(db.prepare('PRAGMA foreign_key_check').all().length || db.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok')
      throw new DomainError('MIGRATION_DATA_INVALID','统一模型完整性检查失败');
    checkpoint('before-commit');
    return {sourceDigest:baseline.digest,schemaVersion:UNIFIED_SCHEMA_VERSION,...counts,state:'staged' as const,noOp:false};
  });
}
