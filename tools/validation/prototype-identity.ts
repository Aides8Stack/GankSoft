import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

export const prototypePath = 'docs/v075/reference/OPEN-ME-v3.7.html';
export const prototypeSha256 = '8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015';
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

// Git's Windows checkout may expand LF to CRLF. Normalize only that byte pair;
// preserve BOMs, lone CRs, spaces, encoding and all HTML/script bytes.
export function verifyPrototype(bytes: Uint8Array = readFileSync(prototypePath)) {
  const raw = Buffer.from(bytes);
  const canonical = Buffer.from(raw.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  const canonicalSha256 = sha256(canonical);
  assert.equal(canonicalSha256, prototypeSha256, 'Frozen v3.7 source changed (CRLF normalized only)');
  return {path: prototypePath, rawSha256: sha256(raw), canonicalSha256, normalization: 'CRLF_TO_LF_ONLY'};
}
