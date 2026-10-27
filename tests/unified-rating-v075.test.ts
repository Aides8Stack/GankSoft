import test from 'node:test';
import assert from 'node:assert/strict';
import { ratingFromTenths } from '../shared/unified-rating.ts';

test('T16 all101 integer scores map at the frozen boundaries for QA/direct/correct questions', () => {
  for (let score=0;score<=100;score++) {
    const expected=score<=59?'again':score<=74?'hard':score<=89?'good':'easy';
    assert.equal(ratingFromTenths(score,null),expected);
    assert.equal(ratingFromTenths(score,true),expected);
  }
});
test('T17 objective failure forces Again without changing a high subjective score', () => {
  for (let score=0;score<=100;score++) assert.equal(ratingFromTenths(score,false),'again');
  const score=90;assert.equal(ratingFromTenths(score,false),'again');assert.equal(score,90);
});
test('T16 fractional, non-finite and out-of-range internal values are rejected', () => {
  for(const value of [-1,101,59.1,NaN,Infinity]) assert.throws(()=>ratingFromTenths(value,null));
});
