import type {ReviewEventDTO,ContentVersionDTO} from '../protocol/unified.ts';
const text=(v:unknown)=>typeof v==='string'?v:'';
/** Original event evidence only; missing facts are never reconstructed from the
 * current card, present knowledge links or the latest answer. */
export function historyEvidence(event:ReviewEventDTO|null|undefined,version?:ContentVersionDTO|null){
 let raw:Record<string,unknown>={};
 try{const v:unknown=JSON.parse(event?.legacyRaw??'null');if(v&&typeof v==='object'&&!Array.isArray(v))raw=v as Record<string,unknown>;}catch{}
 const row=raw.row&&typeof raw.row==='object'&&!Array.isArray(raw.row)?raw.row as Record<string,unknown>:{};
 const faults=Array.isArray(raw.faults)?raw.faults.flatMap(v=>v&&typeof v==='object'?[v as Record<string,unknown>]:[]):[];
 const original=event?.native,p=version?.versionId===event?.contentVersionId?version?.payload:null;
 return {
  thought:original?.thought??text(row.thought),
  reflection:original?.reflection??(text(row.improvement)||text(row.note)),
  faults:original?.faults??[text(row.fault_detail),...faults.map(f=>[text(f.category),text(f.detail),text(f.knowledge_snapshot)].filter(Boolean).join(' · '))].filter(Boolean),
  gaps:original?.gaps??text(row.knowledge_gap),
  choice:original?(p?.encoding==='question-v1'?p.fields.options.find(o=>o.optionId===original.selectedOptionId)?.markdown??'未作答':event?.mode==='question'?'未记录':'不适用'):text(row.answer)||'不适用',
 };
}
