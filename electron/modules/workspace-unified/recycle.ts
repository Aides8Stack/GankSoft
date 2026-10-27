import type {z} from 'zod';
import type {Context} from '../../infrastructure/context.ts';
import {transaction} from '../../infrastructure/database.ts';
import {requireDraftModel} from '../cards-unified/new-drafts.ts';
import {ProtocolError} from '../../../shared/protocol/data.ts';
import {DeckBatch,RecycleDecksInput,RecycleDecksPage} from '../../../shared/protocol/workspace-unified.ts';
import {deckAction} from '../decks.ts';
export function recycledDecks(ctx:Context,input:z.infer<typeof RecycleDecksInput>){
 requireDraftModel(ctx);const p=RecycleDecksInput.parse(input);
 const rows=ctx.db.prepare(`SELECT id,name,version AS revision,folder_id AS folderId,deleted_at AS deletedAt FROM decks WHERE deleted_at IS ${p.deleted?'NOT ':''}NULL AND id>? ORDER BY id LIMIT ?`).all(p.after??'',p.limit+1);
 const more=rows.length>p.limit;if(more)rows.pop();return RecycleDecksPage.parse({items:rows,nextCursor:more?rows.at(-1)!.id:null});
}
export function batchDecks(ctx:Context,input:z.infer<typeof DeckBatch>){
 requireDraftModel(ctx);const p=DeckBatch.parse(input);
 return transaction(ctx.db,()=>{
  for(const d of p.decks){const row=ctx.db.prepare('SELECT version,deleted_at FROM decks WHERE id=?').get(d.id);
   if(!row||row.version!==d.expectedRevision||!!row.deleted_at!==(p.action==='restore'))throw new ProtocolError('REVISION_CONFLICT','卡片集状态已变化，请刷新后重新确认');}
  for(const d of p.decks)deckAction(ctx,{id:d.id,action:p.action});return {count:p.decks.length,action:p.action};
 });
}
