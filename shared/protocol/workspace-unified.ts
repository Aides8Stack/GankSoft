import {z} from 'zod';
import {Id,Name,Revision} from './data.ts';
import {DateSelection} from '../workspace-contracts.ts';
import {HistorySummary,SessionMetrics} from './unified-review.ts';
export const CatalogInput=z.strictObject({folderId:Id.nullable().default(null),cursor:z.string().max(2000).nullable().default(null),limit:Revision.min(1).max(100).default(50)});
const CatalogFolder=z.strictObject({kind:z.literal('folder'),id:Id,name:Name,revision:Revision.min(1),parentId:Id.nullable(),cardCount:z.null(),knowledgeCount:z.null()});
const CatalogDeck=z.strictObject({kind:z.literal('deck'),id:Id,name:Name,revision:Revision.min(1),parentId:Id.nullable(),cardCount:Revision,knowledgeCount:Revision});
export const CatalogPage=z.strictObject({model:z.enum(['legacy','unified']),items:z.array(z.discriminatedUnion('kind',[CatalogFolder,CatalogDeck])).max(100),breadcrumbs:z.array(z.strictObject({id:Id,name:Name})).max(100),nextCursor:z.string().nullable(),dataRevision:Revision});
export const SessionSummariesInput=z.strictObject({deckId:Id,after:Id.nullable().default(null),limit:Revision.min(1).max(100).default(20),status:z.enum(['all','incomplete','completed']).default('all'),exactCardIds:z.array(Id).min(1).max(500).optional()});
export const SessionSummaries=z.strictObject({items:z.array(z.strictObject({sessionId:Id,deckId:Id,title:z.string().max(300),index:Revision,total:Revision.min(1),paused:z.boolean(),practiceMode:z.boolean(),completed:z.boolean(),stage:z.enum(['answer','reveal','result'])}).extend(SessionMetrics.shape)).max(100),nextCursor:Id.nullable(),totalCount:Revision});
export const AnalyticsInput=z.strictObject({deckId:Id,date:DateSelection.default({range:'30'}),cursor:z.string().max(2000).nullable().default(null),limit:Revision.min(1).max(100).default(20)});
export const AnalyticsPage=z.strictObject({cardCount:Revision,cardsByMode:z.strictObject({question:Revision,qa:Revision,direct:Revision}),eventCount:Revision,gradedCount:Revision,practiceCount:Revision,
 averageScoreTenths:z.number().finite().min(0).max(100).nullable(),averageElapsedSeconds:z.number().finite().nonnegative().nullable(),objectiveCount:Revision,correctCount:Revision,
 window:z.strictObject({start:z.string().nullable(),end:z.string().nullable(),timeZone:z.string()}),
 items:z.array(HistorySummary.extend({cardId:Id,title:z.string().max(300)})).max(100),nextCursor:z.string().nullable()});
export const CatalogSave=z.strictObject({kind:z.enum(['folder','deck']),id:Id.optional(),expectedRevision:Revision.min(1).optional(),name:Name,parentId:Id.nullable()})
 .refine(v=>!!v.id===(v.expectedRevision!==undefined),'编辑需提供当前修订，新建不能携带旧修订');
export const CatalogSaved=z.strictObject({id:Id,kind:z.enum(['folder','deck']),revision:Revision.min(1)});

export const RecycleDecksInput=z.strictObject({deleted:z.boolean().default(true),after:Id.nullable().default(null),limit:Revision.min(1).max(100).default(50)});
export const RecycleDecksPage=z.strictObject({items:z.array(z.strictObject({id:Id,name:Name,revision:Revision.min(1),folderId:Id.nullable(),deletedAt:z.string().nullable()})).max(100),nextCursor:Id.nullable()});
export const DeckBatch=z.strictObject({action:z.enum(['delete','restore']),decks:z.array(z.strictObject({id:Id,expectedRevision:Revision.min(1)})).min(1).max(500)}).refine(p=>new Set(p.decks.map(d=>d.id)).size===p.decks.length,'卡片集选择不能重复');
export const DeckBatchResult=z.strictObject({count:Revision.min(1),action:z.enum(['delete','restore'])});

// v076 bounded read model for the formal overview; no scheduler/content writes.
export const DashboardInput=z.strictObject({deckId:Id.optional()});
export const DashboardView=z.strictObject({deckCount:Revision,cardCount:Revision,knowledgeCount:Revision,dueCount:Revision,todayCount:Revision,eventCount:Revision,gradedCount:Revision,averageScoreTenths:z.number().min(0).max(100).nullable(),objectiveCount:Revision,correctCount:Revision,timeZone:z.string(),today:z.string(),
 recent:z.array(z.strictObject({eventId:Id,cardId:Id,deckId:Id,deckName:Name,title:z.string().max(300),mode:z.enum(['question','qa','direct']),createdAt:z.string(),scoreTenths:z.number().min(0).max(100).nullable()})).max(6),
 recentCards:z.array(z.strictObject({cardId:Id,deckId:Id,title:z.string().max(300),mode:z.enum(['question','qa','direct']),publishedAt:z.string().nullable(),reviewCount:Revision,knowledgeNames:z.array(z.string()).max(6)})).max(6),
 sessions:z.array(z.strictObject({sessionId:Id,deckId:Id,deckName:Name,title:z.string().max(300),index:Revision,total:Revision.min(1)})).max(4)});

// W3: history window and current snapshot are explicit, with version-bound pagination.
export const GroupedAnalyticsInput=AnalyticsInput.extend({dimension:z.enum(['card','knowledge']),entityId:Id.optional(),scope:z.enum(['direct','aggregate']).default('aggregate'),search:z.string().max(300).default(''),sort:z.enum(['name','events','score','due']).default('name'),direction:z.enum(['asc','desc']).default('asc'),expectedDataEpoch:Id.optional(),expectedDataRevision:Revision.optional()});
const LearningMetrics=z.strictObject({cardCount:Revision,cardsByMode:z.strictObject({question:Revision,qa:Revision,direct:Revision}),eventCount:Revision,gradedCount:Revision,averageScoreTenths:z.number().nullable(),latestScoreTenths:z.number().nullable(),objectiveCount:Revision,correctCount:Revision,elapsedSeconds:z.number().nonnegative(),dueCount:Revision});
const DailyLearning=z.strictObject({day:z.string(),eventCount:Revision,averageScoreTenths:z.number().nullable(),elapsedSeconds:z.number().nonnegative()});
export const GroupedAnalyticsPage=z.strictObject({dimension:z.enum(['card','knowledge']),scope:z.enum(['direct','aggregate']),window:AnalyticsPage.shape.window,dataEpoch:Id,dataRevision:Revision,totalCount:Revision,knowledgeCount:Revision,summary:LearningMetrics,trend:z.array(DailyLearning),items:z.array(LearningMetrics.extend({id:Id,name:z.string(),mode:z.enum(['question','qa','direct']).nullable(),status:z.string(),observations:Revision,nextDueAt:z.string().nullable(),fsrsState:z.number().nullable(),paused:z.boolean()})).max(100),nextCursor:z.string().nullable()});
