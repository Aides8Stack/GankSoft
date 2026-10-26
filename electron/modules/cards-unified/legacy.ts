import { createHash } from 'node:crypto';
import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import { contentIdentity } from '../../../shared/protocol/identity.ts';
import { ContentVersion, type ContentVersionDTO } from '../../../shared/protocol/unified.ts';

export type Row = Record<string, SQLOutputValue>;
export type LegacyKind = 'question' | 'memory';
export function stableId(namespace: string, ...parts: unknown[]): string {
  return 'v075:' + createHash('sha256').update(JSON.stringify([namespace, ...parts])).digest('hex');
}
export function legacyToken(cardId: string, ordinal: number): string | null {
  try { return contentIdentity(cardId, ordinal); } catch { return null; }
}
export function mediaReferences(value: unknown): ContentVersionDTO['mediaRefs'] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw Error('旧媒体快照不是数组');
  return value.map((a: Row, index) => ({
    placementId: stableId('placement', a.id, index), assetId: String(a.id),
    fileName: String(a.file_name), mime: String(a.mime) as 'image/png',
    role: String(a.role) as 'question', width: null,
  }));
}
export function currentLegacyContent(db: DatabaseSync, kind: LegacyKind, row: Row, versionId?: string): ContentVersionDTO {
  const cardId = String(row.id);
  const assets = kind === 'question' ? db.prepare('SELECT * FROM assets WHERE question_id=? ORDER BY sort_order,id').all(cardId) : [];
  const material = kind === 'question' && row.material_id ? db.prepare('SELECT content FROM materials WHERE id=?').get(row.material_id) : null;
  return legacyCurrentDocument(kind,row,assets,material,versionId);
}
/** Canonical projection from a captured legacy row graph, including old versions
 * whose material/asset snapshot is no longer the current SQL projection. */
export function legacyCurrentDocument(kind:LegacyKind,row:Row,assets:Row[],material:Row|null|undefined,versionId?:string):ContentVersionDTO {
  const cardId = String(row.id), ordinal = Number(kind === 'question' ? row.content_version : row.learning_version);
  const rawJson = JSON.stringify({ row, assets, material });
  return ContentVersion.parse({
    versionId: versionId ?? stableId('current', kind, rawJson), cardId, mode: kind === 'question' ? 'question' : 'qa',
    title: row.title, availability: 'known',
    payload: kind === 'question'
      ? { encoding: 'legacy-question-604', mode: 'question', fields: { stem: row.stem, options: row.options, answer: row.answer,
        analysis: row.analysis, source: row.source, material: material?.content ?? '', initialThought: row.initial_thought } }
      : { encoding: 'qa-v1', mode: 'qa', fields: { front: row.cue, back: row.content, supplement: '', source: row.source } },
    mediaRefs: mediaReferences(assets), publishedAt: null,
    source: { schema: 604, kind: 'legacy-current', key: cardId, ordinal, wireToken: legacyToken(cardId, ordinal), rawJson },
  });
}
/** A source-specific archive: ordinal equality is not evidence of identical content. */
export function historicalLegacyContent(kind: LegacyKind, event: Row): ContentVersionDTO {
  const cardId = String(kind === 'question' ? event.question_id : event.card_id);
  const text = String(kind === 'question' ? event.question_snapshot : event.card_snapshot);
  const snapshot = text ? JSON.parse(text) as Record<string, unknown> : null;
  if (snapshot && (typeof snapshot !== 'object' || Array.isArray(snapshot))) throw Error('旧内容快照不是对象');
  const mode = kind === 'question' ? 'question' : 'qa';
  // Partial snapshots stay partial. Missing fields are not filled from today's card.
  const known = !!snapshot && (kind === 'question'
    ? ['stem', 'options', 'answer', 'analysis', 'material', 'source', 'initialThought'].every(k => typeof snapshot[k] === 'string')
    : ['cue', 'content', 'source'].every(k => typeof snapshot[k] === 'string'));
  const ordinal = Number(kind === 'question' ? event.content_version : event.card_version);
  return ContentVersion.parse({
    versionId: stableId('event-content', kind, event.id), cardId, mode,
    title: typeof snapshot?.title === 'string' ? snapshot.title : '',
    availability: known ? 'known' : text || event.content_snapshot ? 'partial' : 'unknown',
    payload: !known ? null : kind === 'question'
      ? { encoding: 'legacy-question-604', mode, fields: { stem: snapshot!.stem, options: snapshot!.options, answer: snapshot!.answer,
        analysis: snapshot!.analysis, material: snapshot!.material, source: snapshot!.source, initialThought: snapshot!.initialThought } }
      : { encoding: 'qa-v1', mode, fields: { front: snapshot!.cue, back: snapshot!.content, supplement: '', source: snapshot!.source } },
    mediaRefs: mediaReferences(snapshot?.assets), publishedAt: null,
    source: { schema: 604, kind: 'legacy-event', key: event.id, ordinal, wireToken: legacyToken(cardId, ordinal), rawJson: JSON.stringify(event) },
  });
}
