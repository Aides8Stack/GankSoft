import {readFileSync} from 'node:fs';

// Canonical test IDs and priorities are owned by docs/v077/E2E-RESULTS.json.
// Register only scenarios that contain real Electron GUI assertions.
export const PLATFORM_GATED = Object.freeze(['NEW-13','CLIP-03','CLIP-09']);
export const IMPLEMENTED = Object.freeze({
  'HOME-01': 'scenarios/m1-home.mjs',
  'HOME-02': 'scenarios/m1-home.mjs',
  'HOME-03': 'scenarios/m1-home.mjs',
  'HOME-04': 'scenarios/m1-home.mjs',
  'HOME-05': 'scenarios/m1-home.mjs',
  'HOME-06': 'scenarios/m1-home.mjs',
  'HOME-07': 'scenarios/m1-home.mjs',
  'HOME-08': 'scenarios/m1-home.mjs',
  'CAT-01': 'scenarios/m1-catalog.mjs',
  'CAT-03': 'scenarios/m1-catalog.mjs',
  'CAT-04': 'scenarios/m1-catalog.mjs',
  'CAT-05': 'scenarios/m1-catalog.mjs',
  'CAT-06': 'scenarios/m1-catalog.mjs',
  'CAT-07': 'scenarios/m1-catalog.mjs',
  'CAT-08': 'scenarios/m1-catalog.mjs',
  'CAT-09': 'scenarios/m1-catalog.mjs',
  'CAT-10': 'scenarios/m1-catalog.mjs',
  'CAT-11': 'scenarios/m1-catalog.mjs',
  'ENV-02': 'scenarios/m1-app.mjs',
  'ENV-03': 'scenarios/m1-app.mjs',
  'ENV-04': 'scenarios/m1-app.mjs',
  'ENV-05': 'scenarios/m1-app.mjs',
  'ENV-06': 'scenarios/m1-app.mjs',
  'ENV-07': 'scenarios/m1-app.mjs',
  'ENV-08': 'scenarios/m1-app.mjs',
  'ENV-09': 'scenarios/m1-app.mjs',
  'CLIP-14': 'scenarios/p0-editor.mjs',
  'CLIP-15': 'scenarios/p0-editor.mjs',
  'CLIP-16': 'scenarios/p0-editor.mjs',
  'FAULT-05': 'scenarios/p0-editor.mjs',
  'BACK-05': 'scenarios/p0-storage.mjs',
  'BACK-06': 'scenarios/p0-storage.mjs',
  'BACK-07': 'scenarios/p0-storage.mjs',
  'BACK-10': 'scenarios/p0-storage.mjs',
  'BACK-11': 'scenarios/p0-storage.mjs',
  'BACK-13': 'scenarios/p0-storage.mjs',
  'TRASH-03': 'scenarios/p0-storage.mjs',
  'TRASH-08': 'scenarios/p0-storage.mjs',
  'TRASH-09': 'scenarios/p0-storage.mjs',
  'FAULT-04': 'scenarios/p0-reliability.mjs',
  'FAULT-14': 'scenarios/p0-reliability.mjs',

  'NEW-05': 'scenarios/p0-cards.mjs',
  'NEW-09': 'scenarios/p0-cards.mjs',
  'NEW-19': 'scenarios/p0-cards.mjs',
  'OLD-02': 'scenarios/p0-cards.mjs',
  'OLD-06': 'scenarios/p0-cards.mjs',
  'OLD-07': 'scenarios/p0-cards.mjs',
  'OLD-08': 'scenarios/p0-cards.mjs',
  'OLD-09': 'scenarios/p0-cards.mjs',
  'OLD-10': 'scenarios/p0-cards.mjs',
  'OLD-11': 'scenarios/p0-cards.mjs',
  'OLD-14': 'scenarios/p0-cards.mjs',
  'REVIEW-02': 'scenarios/p0-learning.mjs',
  'REVIEW-03': 'scenarios/p0-learning.mjs',
  'REVIEW-04': 'scenarios/p0-learning.mjs',
  'REVIEW-10': 'scenarios/p0-learning.mjs',
  'REVIEW-11': 'scenarios/p0-learning.mjs',
  'REVIEW-17': 'scenarios/p0-learning.mjs',

  'KNOW-12': 'scenarios/knowledge-safety.mjs',
  'BACK-01': 'scenarios/storage.mjs',
  'BACK-03': 'scenarios/storage.mjs',
  'BACK-04': 'scenarios/storage.mjs',
  'TRASH-02': 'scenarios/storage.mjs',
  'TRASH-04': 'scenarios/storage.mjs',
  'FAULT-02': 'scenarios/reliability.mjs',
  'FAULT-03': 'scenarios/reliability.mjs',
  'FAULT-08': 'scenarios/reliability.mjs',

  'EX-02': 'scenarios/exchange.mjs',
  'EX-03': 'scenarios/exchange.mjs',
  'EX-05': 'scenarios/exchange.mjs',
  'SET-01': 'scenarios/settings.mjs',
  'SET-02': 'scenarios/settings.mjs',
  'SET-03': 'scenarios/settings.mjs',
  'SET-04': 'scenarios/settings.mjs',

  'AN-01': 'scenarios/analytics.mjs',
  'AN-06': 'scenarios/analytics.mjs',
  'AN-07': 'scenarios/analytics.mjs',
  'KNOW-02': 'scenarios/knowledge.mjs',
  'KNOW-11': 'scenarios/knowledge.mjs',
  'MD-01': 'scenarios/knowledge.mjs',
  'MD-07': 'scenarios/knowledge.mjs',
  'MEDIA-01': 'scenarios/media.mjs',
  'MEDIA-03': 'scenarios/media.mjs',
  'ENV-01': 'scenarios/app.mjs',
  'CAT-02': 'scenarios/catalog.mjs',
  'NEW-14': 'scenarios/cards.mjs',
  'NEW-16': 'scenarios/cards.mjs',
  'NEW-17': 'scenarios/cards.mjs',
  'OLD-01': 'scenarios/cards.mjs',
  'LIST-01': 'scenarios/cards.mjs',
  'CLIP-02': 'scenarios/clipboard.mjs',
  'REVIEW-01': 'scenarios/learning.mjs',
  'REVIEW-05': 'scenarios/learning.mjs',
  'NEW-01': 'scenarios/drafts.mjs',
  'NEW-02': 'scenarios/drafts.mjs',
  'NEW-03': 'scenarios/drafts.mjs',
  'NEW-12': 'scenarios/drafts.mjs',
  'NEW-18': 'scenarios/drafts.mjs',
  'OLD-03': 'scenarios/drafts.mjs',
  'CLIP-01': 'scenarios/clipboard.mjs',
  'CLIP-04': 'scenarios/clipboard.mjs',
});

const source = new URL('../../../docs/v077/E2E-RESULTS.json', import.meta.url);
export function loadCases() {
  const ledger = JSON.parse(readFileSync(source, 'utf8'));
  if (ledger.schema !== 'ganksoft.v077/e2e-results-1' || !Array.isArray(ledger.cases)) {
    throw Error('V077_CASE_LEDGER_SCHEMA_INVALID');
  }
  const ids = new Set();
  for (const row of ledger.cases) {
    if (!/^[A-Z]+-\d{2}$/.test(row.id) || ids.has(row.id)) {
      throw Error('V077_DUPLICATE_OR_INVALID_CASE_ID: ' + String(row.id));
    }
    ids.add(row.id);
  }
  for (const id of Object.keys(IMPLEMENTED)) {
    if (!ids.has(id)) throw Error('V077_HANDLER_WITHOUT_SPEC: ' + id);
  }
  return ledger.cases;
}

export function selectCases(cases, options = {}) {
  const wanted = options.ids ? new Set(options.ids) : null;
  if (wanted) for (const id of wanted) {
    if (!cases.some(row => row.id === id)) throw Error('V077_UNKNOWN_CASE_ID: ' + id);
  }
  const selected = cases.filter(row =>
    (!wanted || wanted.has(row.id)) &&
    (!options.group || row.id.startsWith(options.group + '-')) &&
    (!options.priority || row.priority === options.priority)
  );
  if (!selected.length) throw Error('V077_EMPTY_SELECTION');
  const runnable = options.mappedOnly ? selected.filter(row => IMPLEMENTED[row.id]) : selected;
  if (!runnable.length) throw Error('V077_NO_IMPLEMENTED_CASES');
  return runnable;
}

export function resultExitCode(rows) {
  if (rows.some(row => row.status === 'FAIL')) return 1;
  if (!rows.length || rows.some(row => !['PASS','FAIL'].includes(row.status))) return 2;
  return 0;
}
