import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, validateAiConfig } from '../electron/modules/ai/adapter.ts';
test('AI adapter validates endpoints and permits localhost without a key', () => {
  assert.throws(
    () =>
      validateAiConfig({
        endpoint: 'http://example.com/v1/chat/completions',
        model: 'model',
        apiKey: '',
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      validateAiConfig({
        endpoint: 'https://example.com/path?key=secret',
        model: 'model',
        apiKey: '',
      }),
    /查询参数/,
  );
  assert.doesNotThrow(() =>
    validateAiConfig({
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      model: 'local',
      apiKey: '',
    }),
  );
});
test('AI adapter sends explicit evidence to configured provider and returns plain text', async () => {
  let body: any;
  const fake: typeof fetch = async (_input, init) => {
    body = JSON.parse(init!.body as string);
    assert.equal((init!.headers as any).Authorization, 'Bearer test-key');
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '建议复盘 [Q:1]。' } }] }),
      { status: 200 },
    );
  };
  const result = await generate(
    { endpoint: 'https://example.com/chat/completions', model: 'model', apiKey: 'test-key' },
    'Q:1 题目和复盘证据',
    fake,
  );
  assert.equal(result, '建议复盘 [Q:1]。');
  assert.equal(body.messages[1].content, 'Q:1 题目和复盘证据');
  assert.equal(body.stream, false);
});
test('provider failures do not expose response bodies or keys', async () => {
  const fake: typeof fetch = async () => new Response('contains-secret', { status: 401 });
  await assert.rejects(
    () =>
      generate(
        { endpoint: 'https://example.com/api', model: 'model', apiKey: 'test-key' },
        '材料',
        fake,
      ),
    (error) =>
      error instanceof Error && error.message.includes('401') && !error.message.includes('secret'),
  );
});
