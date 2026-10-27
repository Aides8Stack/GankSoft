import {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {CatalogInput,CatalogPage,SessionSummariesInput,SessionSummaries} from '../../../shared/protocol/workspace-unified.ts';
import {ProtocolError,Id,Revision} from '../../../shared/protocol/data.ts';
import {requireTree} from '../knowledge-unified/storage.ts';
const Cursor=z.strictObject({folderId:Id.nullable(),after:z.string().max(300),epoch:Id,revision:Revision});
export function workspaceCatalog(ctx:Context,input:unknown){
 const p=CatalogInput.parse(input),db=ctx.db,meta=db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
 const schema=Number(db.prepare('PRAGMA user_version').get()!.user_version);if(![604,606].includes(schema))throw new ProtocolError('CONTRACT_UNSUPPORTED','数据模型版本不受支持');
 let after='';if(p.cursor){let c:z.infer<typeof Cursor>;try{c=Cursor.parse(JSON.parse(p.cursor));}catch{throw new ProtocolError('CURSOR_INVALID','目录分页游标无效');}if(c.folderId!==p.folderId||c.epoch!==meta.epoch||c.revision!==meta.revision)throw new ProtocolError('DATA_REVISION_CHANGED','目录已变化，请从第一页读取');after=c.after;}
 const breadcrumbs:{id:string;name:string}[]=[],seen=new Set<string>();let parent=p.folderId;
 while(parent){if(seen.has(parent)||seen.size>=100)throw new ProtocolError('CATALOG_CYCLE','目录层级无效');seen.add(parent);const row=db.prepare('SELECT id,name,parent_id FROM folders WHERE id=? AND deleted_at IS NULL').get(parent);if(!row)throw new ProtocolError('FOLDER_NOT_FOUND','目录不存在或已删除');breadcrumbs.unshift({id:String(row.id),name:String(row.name)});parent=row.parent_id?String(row.parent_id):null;}
 const rows=db.prepare(`SELECT * FROM (
  SELECT 'folder:'||id AS cursor_key,'folder' AS kind,id,name,version AS revision,parent_id AS parentId,NULL AS cardCount,NULL AS knowledgeCount,sort_order FROM folders WHERE parent_id IS ? AND deleted_at IS NULL
  UNION ALL SELECT 'deck:'||d.id,'deck',d.id,d.name,d.version,d.folder_id,
   ${schema===606?'(SELECT count(*) FROM learning_cards c WHERE c.deck_id=d.id AND c.deleted_at IS NULL)':'((SELECT count(*) FROM questions q WHERE q.module=d.id AND q.deleted_at IS NULL)+(SELECT count(*) FROM memory_cards m WHERE m.module=d.id AND m.deleted_at IS NULL))'},
   (SELECT count(*) FROM knowledge k WHERE k.module=d.id AND k.deleted_at IS NULL),d.sort_order FROM decks d WHERE d.folder_id IS ? AND d.deleted_at IS NULL
 ) WHERE cursor_key>? ORDER BY cursor_key LIMIT ?`).all(p.folderId,p.folderId,after,p.limit+1);
 const more=rows.length>p.limit;if(more)rows.pop();
 return CatalogPage.parse({model:schema===606?'unified':'legacy',items:rows.map(({cursor_key,sort_order,...row})=>row),breadcrumbs,nextCursor:more?JSON.stringify({folderId:p.folderId,after:rows.at(-1)!.cursor_key,epoch:meta.epoch,revision:meta.revision}):null,dataRevision:Number(meta.revision)});
}
export function workspaceSessionSummaries(ctx:Context,input:unknown){
 const p=SessionSummariesInput.parse(input);requireTree(ctx,p.deckId);
 const rows=ctx.db.prepare(`SELECT json_extract(s.payload,'$.sessionId') AS sessionId,s.deck_id AS deckId,
  coalesce(c.title,'复盘') AS title,json_extract(s.payload,'$.index') AS 'index',json_array_length(s.payload,'$.ids') AS total,
  json_extract(s.payload,'$.resumedAt') IS NULL AS paused,coalesce(json_extract(s.payload,'$.practiceMode'),0) AS practiceMode,json_extract(s.payload,'$.completed') AS completed,json_extract(s.payload,'$.stage') AS stage
  FROM study_sessions s LEFT JOIN learning_cards c ON c.id=json_extract(s.payload,'$.entry.cardId')
  WHERE s.deck_id=? AND json_extract(s.payload,'$.encoding')='ganksoft.review-session/1' AND json_extract(s.payload,'$.sessionId')>?
  ${p.exactCardIds?"AND json_array_length(s.payload,'$.ids')=? AND NOT EXISTS(SELECT 1 FROM json_each(s.payload,'$.ids') q WHERE q.value NOT IN (SELECT value FROM json_each(?)))":''}
  ORDER BY sessionId LIMIT ?`).all(p.deckId,p.after??'',...(p.exactCardIds?[new Set(p.exactCardIds).size,JSON.stringify([...new Set(p.exactCardIds)])]:[]),p.limit+1);
 const more=rows.length>p.limit;if(more)rows.pop();
 return SessionSummaries.parse({items:rows.map(r=>({...r,paused:!!r.paused,practiceMode:!!r.practiceMode,completed:!!r.completed})),nextCursor:more?rows.at(-1)!.sessionId:null});
}
