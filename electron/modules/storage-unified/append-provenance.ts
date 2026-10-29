// Retained internal S8.b input adapter; never imported by production.
import {z} from 'zod';
import {AppendProvenance as ImportProvenance,appendProvenanceSetting as setting} from './import-provenance.ts';
export {appendDeckVersions,readAppendProvenance,planAppendDuplicates} from './import-provenance.ts';
export type {AppendDeckVersion} from './import-provenance.ts';
export const AppendProvenance=ImportProvenance.extend({encoding:z.literal('ganksoft.independent-append-provenance/1')});
export type AppendProvenanceDTO=z.infer<typeof AppendProvenance>;
export function appendProvenanceSetting(value:AppendProvenanceDTO){const p=AppendProvenance.parse(value);return setting({...p,encoding:'ganksoft.independent-import-provenance/1'});}
