import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {prototypePath, prototypeSha256, verifyPrototype} from '../tools/validation/prototype-identity.ts';

const lf = Buffer.from(readFileSync(prototypePath).toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
test('frozen prototype verifies Git LF and Windows CRLF with distinct raw fingerprints', () => {
  const linux = verifyPrototype(lf);
  const windows = verifyPrototype(Buffer.from(lf.toString('latin1').replace(/\n/g, '\r\n'), 'latin1'));
  assert.equal(linux.canonicalSha256, prototypeSha256);
  assert.equal(windows.canonicalSha256, prototypeSha256);
  assert.equal(windows.rawSha256, '5c2d5e67b07975c19c88bed55a372d1d799f5dcd6375f4fc5b6014697be91c6a');
  assert.notEqual(linux.rawSha256, windows.rawSha256);
});
test('source identity rejects content, whitespace, BOM, lone CR and byte corruption', () => {
  for (const mutated of [Buffer.concat([lf, Buffer.from(' ')]), Buffer.concat([Buffer.from([239,187,191]), lf]), Buffer.concat([lf, Buffer.from('\r')]), Buffer.from(lf).fill(255, 100, 101), Buffer.from(lf.toString('latin1').replace('<', '>'), 'latin1')]) {
    assert.throws(() => verifyPrototype(mutated), /Frozen v3.7 source changed/);
  }
});
