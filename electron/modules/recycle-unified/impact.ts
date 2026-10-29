import {createHash} from 'node:crypto';
import type {Context} from '../../infrastructure/context.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {RecycleImpactInput,RecycleImpact} from '../../../shared/protocol/recycle-impact.ts';
import {StoredNewDraft} from '../../../shared/protocol/card-draft.ts';
import {StoredKnowledgeRecycle} from '../../../shared/protocol/knowledge-tree.ts';
import {requireDraftModel} from '../cards-unified/new-drafts.ts';
/** Native606 read-only scope inspection. No purge command/token is issued while
 * the immutable-history retention contract remains undecided. */
export function previewRecycleImpact(ctx:Context,input:unknown){
 const p=RecycleImpactInput.parse(input);requireDraftModel(ctx);
 const ownReadTransaction=!ctx.db.isTransaction;
 if(ownReadTransaction)ctx.db.exec('BEGIN DEFERRED');
 try {const result=(()=>{
  const deck=ctx.db.prepare('SELECT * FROM decks WHERE id=?').get(p.deckId);
  if(!deck)throw new ProtocolError('DECK_CONFLICT','卡片集不存在');
  const cards:any[]=[],nodes:any[]=[],objects:any[]=[],evidence:unknown[]=[deck],newDrafts:any[]=[];
  if(p.kind==='deck'){
   if(!deck.deleted_at||deck.version!==p.expectedRevision)throw new ProtocolError('REVISION_CONFLICT','卡片集状态已变化，请刷新后重新预览');
   objects.push({kind:'deck',id:p.deckId,label:deck.name,revision:deck.version});
   cards.push(...ctx.db.prepare('SELECT * FROM learning_cards WHERE deck_id=? ORDER BY id').all(p.deckId));
   nodes.push(...ctx.db.prepare('SELECT * FROM knowledge WHERE module=? ORDER BY id').all(p.deckId));
   for(const row of ctx.db.prepare("SELECT value FROM settings WHERE key LIKE 'new-card-draft:%' AND json_extract(value,'$.deckId')=? ORDER BY key").all(p.deckId)){const draft=StoredNewDraft.parse(JSON.parse(String(row.value)));newDrafts.push(draft);objects.push({kind:'draft',id:draft.document.cardId,label:draft.document.title,revision:draft.document.revision});}
  }else if(p.kind==='cards'){
   if(deck.deleted_at)throw new ProtocolError('DECK_CONFLICT','请从已删除的卡片集预览完整范围');
   for(const c of p.cards){const row=ctx.db.prepare('SELECT * FROM learning_cards WHERE id=? AND deck_id=?').get(c.cardId,p.deckId);
    if(!row||!row.deleted_at||row.revision!==c.expectedRevision)throw new ProtocolError('REVISION_CONFLICT','所选卡片已变化，请刷新后重新预览');cards.push(row);}
  }else{
   const row=ctx.db.prepare("SELECT payload FROM recycle_batches WHERE kind='unified-knowledge' AND item_id=?").get(p.batchId);
   if(!row)throw new ProtocolError('RECYCLE_NOT_FOUND','知识回收批次不存在');
   const batch=StoredKnowledgeRecycle.parse(JSON.parse(String(row.payload)));evidence.push(batch);
   if(batch.deckId!==p.deckId)throw new ProtocolError('DECK_CONFLICT','知识回收批次不属于当前卡片集');
   for(const n of batch.nodes){const row=ctx.db.prepare('SELECT * FROM knowledge WHERE id=? AND module=?').get(n.nodeId,p.deckId);
    if(!row||!row.deleted_at||row.version!==n.deletedRevision)throw new ProtocolError('REVISION_CONFLICT','知识点已经恢复、合并或修改，请刷新后重新预览');nodes.push(row);}
  }
  if(cards.length+nodes.length+objects.length>10000)throw new ProtocolError('RECYCLE_TOO_LARGE','关联范围超过10000项，无法完整预览');
  for(const row of cards)objects.push({kind:'card',id:row.id,label:row.title,revision:row.revision});
  for(const row of nodes)objects.push({kind:'knowledge',id:row.id,label:row.name,revision:row.version});
  objects.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));evidence.push(cards,nodes,newDrafts);
  const ids=JSON.stringify(cards.map(c=>c.id)),allIds=new Set([...cards,...nodes].map(n=>String(n.id)));if(p.kind==='deck')allIds.add(p.deckId);
  const counts={cards:cards.length,knowledge:nodes.length,versions:0,cycles:0,events:0,drafts:0,newDrafts:newDrafts.length,schedules:0,sessions:0,referenceDocuments:0,imageReferences:0};
  const documents:string[]=[];
  for(const [table,key] of [['learning_content_versions','versions'],['learning_study_cycles','cycles'],['learning_review_events','events'],['learning_card_drafts','drafts'],['scheduling','schedules']] as const){
   const rows=ctx.db.prepare(`SELECT * FROM ${table} WHERE card_id IN (SELECT value FROM json_each(?)) ORDER BY rowid`).all(ids);counts[key]=rows.length;evidence.push(rows);documents.push(...rows.flatMap(r=>Object.values(r).filter((v):v is string=>typeof v==='string')));
  }
  // Include completed/active and archived pages and knowledge/link/recycle data.
  // Preview only: conservative references are retained, never detached.
  for(const table of ['settings','study_sessions','recycle_batches']){
   const rows=ctx.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().filter(r=>{const text=JSON.stringify(r);return [...allIds].some(id=>text.includes(id));});
   evidence.push(rows);documents.push(...rows.flatMap(r=>Object.values(r).filter((v):v is string=>typeof v==='string')));
   if(table==='study_sessions')counts.sessions=rows.length;else counts.referenceDocuments+=rows.length;
  }
  const assets=new Set<string>();for(const text of documents)for(const match of text.matchAll(/gank-asset:\/\/([a-f0-9-]+)|"assetId"\s*:\s*"([a-f0-9-]+)"/gi))assets.add(match[1]??match[2]);counts.imageReferences=assets.size;
  const epoch=String(ctx.db.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()!.epoch);
  const blockers=['统一永久删除协议尚未启用；本预览不执行删除，全部文件保留。'];
  if(counts.versions||counts.cycles||counts.events)blockers.push('Schema606 外键与不可变触发器保护发布版本、学习周期和复盘事件。必须先批准历史保留/删除语义及相应数据迁移。');
  if(newDrafts.length)blockers.push('卡片集仍含未发布草稿，预览保留其身份、内容和图片，禁止静默级联销毁。');
  if(nodes.length)blockers.push('知识点回收批次、正文、卡片关联及历史快照的永久处置合同尚待批准。');
  if(cards.some(c=>!c.deleted_at)||nodes.some(n=>!n.deleted_at))blockers.push('范围包含尚未删除的子对象，禁止级联永久删除。');
  return RecycleImpact.parse({kind:p.kind,deckId:p.deckId,epoch,fingerprint:createHash('sha256').update(JSON.stringify({p,epoch,evidence})).digest('hex'),objects,counts,execution:'blocked',blockers,filePolicy:'retain-all'});
 })();if(ownReadTransaction)ctx.db.exec('COMMIT');return result;
 }catch(error){if(ownReadTransaction&&ctx.db.isTransaction)ctx.db.exec('ROLLBACK');throw error;}
}
