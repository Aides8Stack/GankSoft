import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPLICATION_VERSION } from '../electron/infrastructure/app-version.ts';
import { Application } from '../electron/application.ts';
import { openDatabase } from './fixture.ts';
test('workspace version reads package.json instead of a separate hard-coded application version', () => {
 const expected = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
 const db = openDatabase(':memory:');
 try { assert.equal(APPLICATION_VERSION, expected); assert.equal(new Application({db, now:()=>new Date(),dataDir:''}).snapshot().meta.appVersion,expected); }
 finally { db.close(); }
});
