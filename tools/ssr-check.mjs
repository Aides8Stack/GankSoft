import { createServer } from 'vite';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { openDatabase } from '../electron/infrastructure/database.ts';
import { Application } from '../electron/application.ts';
const db = openDatabase(':memory:');
const app = new Application({ db, dataDir: ':memory:', now: () => new Date() });
const m = app.handle('deck.save', { name: '测试积累', kind: 'memory' });
const q = app.handle('deck.save', { name: '测试错题', kind: 'question' });
const k = app.handle('knowledge.save', { module: q, name: '测试知识点' });
const mid = app.handle('memory.save', {
  module: m,
  title: '测试记忆',
  cue: '提示',
  content: '内容',
  knowledge_ids: [k],
});
const qid = app.handle('question.save', {
  module: q,
  stem: '测试题干',
  answer: 'A',
  status: 'ready',
  knowledge_ids: [k],
});
app.handle('memory.review', { id: mid, version: 1, score: 0 });
app.handle('review.submit', {
  thought: '先识别条件，再独立判断选项。',
  question_id: qid,
  question_version: 1,
  answer: 'B',
  basis: 'independent',
  understanding: 0,
  faults: ['知识缺失'],
  error_knowledge_ids: [k],
});
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const store = await server.ssrLoadModule('/src/store.ts');
  store.state.value = app.snapshot();
  store.selectedQuestionId.value = qid;
  store.selectedMemoryId.value = mid;
  store.selectedKnowledgeId.value = k;
  for (const name of [
    'Overview',
    'CollectionSummary',
    'CardExplorer',
    'CatalogManager',
    'Dashboard',
    'QuestionLibrary',
    'QuestionEditor',
    'MemoryWorkspace',
    'ImportWorkspace',
    'KnowledgeWorkspace',
    'ReviewHub',
    'ReviewWorkspace',
    'Insights',
    'Settings',
  ]) {
    const { default: component } = await server.ssrLoadModule('/src/components/' + name + '.vue');
    const html = await renderToString(createSSRApp(component));
    if (!html.length) throw new Error('Empty render: ' + name);
    const expected = {
      DeckWorkspace: '测试积累',
      QuestionLibrary: '测试题干',
      MemoryWorkspace: '测试记忆',
      Insights: '易忘记忆卡',
    }[name];
    if (expected && !html.includes(expected))
      throw new Error('Missing fixture content: ' + name + ' ' + html.slice(0, 100));
    console.log('Rendered ' + name + ' (' + html.length + ' chars)');
  }
  const { default: root } = await server.ssrLoadModule('/src/App.vue');
  const html = await renderToString(createSSRApp(root));
  if (!html.includes('卡片库')) throw new Error('Navigation missing');
  console.log('Rendered App navigation');
} finally {
  await server.close();
  db.close();
}
