import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ProtocolError, Id, Timestamp } from '../../../shared/protocol/data.ts';
import { UnifiedScheduleMetadata } from '../../../shared/protocol/review-details.ts';
import type { Context } from '../../infrastructure/context.ts';
import { transaction } from '../../infrastructure/database.ts';
import { reviewConfig } from '../review/config-service.ts';
import { publishedCard, readSchedule, schedulePolicy, digest } from './schedule.ts';
import { requireDraftModel } from './new-drafts.ts';

const secret=randomBytes(32),prefix='gank-unified:';
const Token=z.strictObject({deckId:Id,cardId:Id.nullable(),at:Timestamp,expires:z.number().int(),fingerprint:z.string().length(64)});
const signature=(body:string)=>createHmac('sha256',secret).update(body).digest('hex');
function calculate(ctx:Context,p:{deckId:string;cardId?:string}) {
  requireDraftModel(ctx);const config=reviewConfig(ctx,p.deckId),now=ctx.now();
  const cards=ctx.db.prepare('SELECT id,title FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL AND (? IS NULL OR id=?) ORDER BY id LIMIT 5001')
    .all(p.deckId,p.cardId??null,p.cardId??null);
  if(cards.length>5000)throw new ProtocolError('RECOMPUTE_TOO_LARGE','请分批选择卡片');
  if(p.cardId&&!cards.length)throw new ProtocolError('DECK_CONFLICT','卡片不属于当前集');
  const states=cards.map(row=>{
    const card=publishedCard(ctx,{cardId:String(row.id),deckId:p.deckId}),schedule=readSchedule(ctx,card),policy=schedulePolicy(ctx,card);
    const before=schedule.state?.due?new Date(schedule.state.due).toISOString():null;
    const last=schedule.state?.last_review?Date.parse(String(schedule.state.last_review)):NaN;
    const snoozed=ctx.db.prepare("SELECT 1 FROM review_due_overrides WHERE kind=? AND card_id=? AND source='snooze'").get(card.kind,card.cardId);
    const plan=card.kind==='question'?ctx.db.prepare('SELECT paused FROM plans WHERE question_id=?').get(card.cardId):card.kind==='memory'?ctx.db.prepare('SELECT paused FROM memory_plans WHERE card_id=?').get(card.cardId):null;
    const reason=policy.source==='card_override'?'card_override':plan?.paused?'paused':snoozed?'manual_snooze':!before||!Number.isFinite(last)||last>+now?'no_valid_state':'unchanged';
    // Same conservative rule as the existing advance_existing operation.
    const after=reason==='unchanged'?new Date(Math.min(Date.parse(before!),Math.max(+now,last+policy.maxIntervalDays*86400000))).toISOString():before;
    return {title:String(row.title),card,schedule,policy,before,after,reason:after&&before&&after<before?'advance':reason};
  });
  const epoch=ctx.db.prepare('SELECT epoch FROM protocol_meta WHERE singleton=1').get()?.epoch;
  const fingerprint=digest({epoch,config,states:states.map(s=>({card:s.card,hash:s.schedule.hash,policy:s.policy,before:s.before,reason:s.reason==='advance'?'unchanged':s.reason}))});
  return {states,fingerprint};
}
export function previewUnifiedRecompute(ctx:Context,p:{deckId:string;cardId?:string;offset?:number;limit?:number}) {
  const {states,fingerprint}=calculate(ctx,p),at=ctx.now().toISOString();
  const body=Buffer.from(JSON.stringify({deckId:p.deckId,cardId:p.cardId??null,at,expires:ctx.now().getTime()+300000,fingerprint})).toString('base64url');
  return {encoding:'ganksoft.recompute-preview/1' as const,deckId:p.deckId,calculatedAt:at,previewToken:prefix+body+'.'+signature(body),
    total:states.length,affectedCount:states.filter(s=>s.reason==='advance').length,overriddenCount:states.filter(s=>s.reason==='card_override').length,
    rows:states.slice(p.offset??0,(p.offset??0)+(p.limit??50)).map(s=>({cardId:s.card.cardId,title:s.title,source:s.policy.source,maxIntervalDays:s.policy.maxIntervalDays,
      beforeDue:s.before,afterDue:s.after,reason:s.reason}))};
}
export function isUnifiedRecompute(token:string) {return token.startsWith(prefix);}
export function applyUnifiedRecompute(ctx:Context,previewToken:string,requestId:string) {
  return transaction(ctx.db,()=>{
    const [body,sig]=previewToken.slice(prefix.length).split('.');
    if(!isUnifiedRecompute(previewToken)||!body||signature(body)!==sig)throw new ProtocolError('PREVIEW_STALE','预览签名失效，请重新预览');
    const token=Token.parse(JSON.parse(Buffer.from(body,'base64url').toString()));
    if(ctx.now().getTime()>token.expires||ctx.now().getTime()<Date.parse(token.at))throw new ProtocolError('PREVIEW_STALE','预览已过期');
    const fixed={...ctx,now:()=>new Date(token.at)};
    const {states,fingerprint}=calculate(fixed,{deckId:token.deckId,...(token.cardId?{cardId:token.cardId}:{})});
    if(fingerprint!==token.fingerprint)throw new ProtocolError('PREVIEW_STALE','排期或配置已变化，请重新预览');
    const operationId=randomUUID();let count=0;
    for(const s of states.filter(s=>s.reason==='advance')) {
      const state=structuredClone(s.schedule.state!);
      state.due=new Date(s.after!);
      state.scheduled_days=Math.max(0,(Date.parse(s.after!)-Date.parse(String(state.last_review)))/86400000);
      const oldMeta=s.schedule.state as typeof state & {_gank?:unknown};
      const meta=oldMeta._gank?UnifiedScheduleMetadata.parse(oldMeta._gank):null;
      // Imported legacy state is tagged on the same canonical row, never copied.
      const lastEvent=meta?.eventId??String(ctx.db.prepare('SELECT id FROM learning_review_events WHERE card_id=? AND cycle_id=? ORDER BY created_at DESC,id DESC LIMIT 1').get(s.card.cardId,s.card.cycleId)?.id??operationId);
      const after={...state,_gank:{encoding:'ganksoft.schedule/1',cycleId:s.card.cycleId,revision:s.schedule.revision+1,eventId:lastEvent}};
      ctx.db.prepare('UPDATE scheduling SET data=?,updated_at=? WHERE kind=? AND card_id=?').run(JSON.stringify(after),ctx.now().toISOString(),s.card.kind,s.card.cardId);
      ctx.db.prepare('INSERT INTO schedule_events VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),s.card.kind,s.card.cardId,0,
        JSON.stringify(s.schedule.state),JSON.stringify(after),JSON.stringify({encoding:'ganksoft.recompute/1',operationId,deckId:token.deckId,
          sourcePolicyRev:s.policy.revision,beforeHash:s.schedule.hash,afterHash:digest({cycleId:s.card.cycleId,state:after})}),ctx.now().toISOString());
      count++;
    }
    ctx.db.prepare('INSERT INTO review_config_operations VALUES(?,?,?,?,?)').run(operationId,requestId,digest(previewToken),
      JSON.stringify({operationId,count,model:'unified',deckId:token.deckId,undone:false}),ctx.now().toISOString());
    return {operationId,count};
  });
}
export function isUnifiedOperation(ctx:Context,operationId:string) {
  const row=ctx.db.prepare('SELECT response FROM review_config_operations WHERE id=?').get(operationId);
  return !!row&&JSON.parse(String(row.response)).model==='unified';
}
export function undoUnifiedRecompute(ctx:Context,p:{operationId:string;deckId:string}) {
  requireDraftModel(ctx);
  return transaction(ctx.db,()=>{
    const row=ctx.db.prepare('SELECT response FROM review_config_operations WHERE id=?').get(p.operationId);
    const op=row?JSON.parse(String(row.response)):null;
    if(!op||op.model!=='unified'||op.deckId!==p.deckId||op.undone)throw new ProtocolError('RECOMPUTE_CONFLICT','没有可撤销的操作');
    const logs=ctx.db.prepare("SELECT * FROM schedule_events WHERE json_extract(log,'$.encoding')='ganksoft.recompute/1' AND json_extract(log,'$.operationId')=?").all(p.operationId);
    for(const row of logs) {
      const card=publishedCard(ctx,{cardId:String(row.card_id),deckId:p.deckId}),current=readSchedule(ctx,card),log=JSON.parse(String(row.log));
      if(current.hash!==log.afterHash)throw new ProtocolError('RECOMPUTE_CONFLICT','卡片已复盘、移动或重算，不能撤销旧操作');
    }
    for(const row of logs) {
      const card=publishedCard(ctx,{cardId:String(row.card_id),deckId:p.deckId}),current=readSchedule(ctx,card);
      const previous=JSON.parse(String(row.before_state));
      if(Date.parse(String(current.state!.due))<=ctx.now().getTime()&&Date.parse(previous.due)>ctx.now().getTime())previous.due=ctx.now().toISOString();
      const meta=UnifiedScheduleMetadata.parse((current.state as typeof previous)._gank);
      const after={...previous,_gank:{...meta,revision:meta.revision+1}};
      ctx.db.prepare('UPDATE scheduling SET data=?,updated_at=? WHERE kind=? AND card_id=?').run(JSON.stringify(after),ctx.now().toISOString(),card.kind,card.cardId);
      ctx.db.prepare('INSERT INTO schedule_events VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),card.kind,card.cardId,0,JSON.stringify(current.state),JSON.stringify(after),
        JSON.stringify({encoding:'ganksoft.recompute-undo/1',operationId:p.operationId,beforeHash:current.hash,afterHash:digest({cycleId:card.cycleId,state:after})}),ctx.now().toISOString());
    }
    ctx.db.prepare('UPDATE review_config_operations SET response=? WHERE id=?').run(JSON.stringify({...op,undone:true}),p.operationId);
    return {count:logs.length};
  });
}
