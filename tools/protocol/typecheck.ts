import { createClient } from '../../shared/protocol/client.ts';
import type { Handlers } from '../../shared/protocol/registry.ts';
function compileOnly() {
  const client = createClient(async () => null);
  client.call('catalog.deck.save', { name: '资料', kind: 'question' });
  // @ts-expect-error unknown methods are not callable
  client.call('arbitrary.execute', {});
  // @ts-expect-error query inputs have declared fields
  client.call('workspace.read', { sql: 'select 1' });
  // @ts-expect-error wrong review kind cannot contain question fields
  client.call('review.memory.submit', { kind: 'memory', answer: 'A' });
  // @ts-expect-error handler return values are tied to the method output
  const bad: Handlers = { 'workspace.read': () => ({ not: 'a deck array' }) };
  return bad;
}
void compileOnly;
