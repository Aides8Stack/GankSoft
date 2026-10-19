import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyReviewBudget } from '../shared/review-budget.ts';
test('SCH-05 distinct due cards, relearning and practice have independent accounts across decks and midnight', () => {
 const at='2026-10-18T17:00:00Z';
 const rows=[...Array.from({length:4},()=>({question_id:'a',effective:1,created_at:at})),
 {question_id:'a',effective:0,created_at:at},{question_id:'b',effective:1,created_at:at},
 {question_id:'other',effective:1,created_at:at},{question_id:'old',effective:1,created_at:'2026-10-18T15:59:59Z'}];
 const r=dailyReviewBudget(rows,new Set(['a','b','old']),new Date(at),'Asia/Shanghai');
 assert.equal(r.uniqueDue,2); assert.equal(r.relearnEvents,3);assert.equal(r.practiceEvents,1);
});
