import type {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {CatalogSave} from '../../../shared/protocol/workspace-unified.ts';
import {requireDraftModel} from '../cards-unified/new-drafts.ts';
import {saveFolder} from '../folders.ts';
import {saveDeck} from '../decks.ts';
/** Existing catalog identity/name/parent/CAS rules remain the sole writer.
 * A legacy kind is retained as storage metadata, never a new-card restriction. */
export function saveUnifiedCatalog(ctx:Context,input:z.infer<typeof CatalogSave>){
 requireDraftModel(ctx);const p=CatalogSave.parse(input);
 let ancestor=p.parentId,depth=0;const seen=new Set<string>();
 while(ancestor){if(++depth>=100||seen.has(ancestor))throw new ProtocolError('CATALOG_CYCLE','目录过深或有循环');seen.add(ancestor);const row=ctx.db.prepare('SELECT parent_id FROM folders WHERE id=? AND deleted_at IS NULL').get(ancestor);if(!row)throw new ProtocolError('FOLDER_NOT_FOUND','目标文件夹不存在或已删除');ancestor=row.parent_id?String(row.parent_id):null;}
 const existing=p.id?ctx.db.prepare(`SELECT sort_order FROM ${p.kind==='folder'?'folders':'decks'} WHERE id=?`).get(p.id):null;
 const value={id:p.id,version:p.expectedRevision,name:p.name,sort_order:existing?.sort_order??0};
 let id:string;
 if(p.kind==='folder')id=saveFolder(ctx,{...value,parent_id:p.parentId});
 else{
  const old=p.id?ctx.db.prepare('SELECT kind FROM decks WHERE id=? AND deleted_at IS NULL').get(p.id):null;
  id=saveDeck(ctx,{...value,folder_id:p.parentId,kind:old?.kind??'question'});
 }
 const revision=Number(ctx.db.prepare(`SELECT version FROM ${p.kind==='folder'?'folders':'decks'} WHERE id=?`).get(id)!.version);
 return {id,kind:p.kind,revision};
}
