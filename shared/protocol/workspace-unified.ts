import {z} from 'zod';
import {Id,Name,Revision} from './data.ts';
export const CatalogInput=z.strictObject({folderId:Id.nullable().default(null),cursor:z.string().max(2000).nullable().default(null),limit:Revision.min(1).max(100).default(50)});
const CatalogFolder=z.strictObject({kind:z.literal('folder'),id:Id,name:Name,revision:Revision.min(1),parentId:Id.nullable(),cardCount:z.null(),knowledgeCount:z.null()});
const CatalogDeck=z.strictObject({kind:z.literal('deck'),id:Id,name:Name,revision:Revision.min(1),parentId:Id.nullable(),cardCount:Revision,knowledgeCount:Revision});
export const CatalogPage=z.strictObject({model:z.enum(['legacy','unified']),items:z.array(z.discriminatedUnion('kind',[CatalogFolder,CatalogDeck])).max(100),breadcrumbs:z.array(z.strictObject({id:Id,name:Name})).max(100),nextCursor:z.string().nullable(),dataRevision:Revision});
export const SessionSummariesInput=z.strictObject({deckId:Id,after:Id.nullable().default(null),limit:Revision.min(1).max(100).default(20),exactCardIds:z.array(Id).min(1).max(500).optional()});
export const SessionSummaries=z.strictObject({items:z.array(z.strictObject({sessionId:Id,deckId:Id,title:z.string().max(300),index:Revision,total:Revision.min(1),paused:z.boolean(),completed:z.boolean(),stage:z.enum(['answer','reveal','result'])})).max(100),nextCursor:Id.nullable()});
