import { z } from 'zod';
import { KnowledgeEditorAsset,KnowledgeAsset } from './knowledge-media.ts';
import { Id, Name, Revision, Text } from './data.ts';
export const TreeScope=z.strictObject({deckId:Id});
export const NodeScope=TreeScope.extend({nodeId:Id});
export const TreeHash=z.string().regex(/^[a-f0-9]{64}$/);
export const TreeNode=z.strictObject({nodeId:Id,name:Name,parentId:Id.nullable(),position:Revision,revision:Revision.min(1)});
export const TreeView=TreeScope.extend({treeHash:TreeHash,nodes:z.array(TreeNode).max(5000)});
export const NodeBody=NodeScope.extend({name:Name,parentId:Id.nullable(),position:Revision,revision:Revision.min(1),markdown:Text,assets:z.array(KnowledgeEditorAsset).max(200).default([])});
export const StoredNodeBody=z.strictObject({encoding:z.literal('ganksoft.knowledge-body/1'),nodeId:Id,deckId:Id,markdown:Text,assets:z.array(KnowledgeAsset).max(200).default([])});
export const StoredTreeOrder=z.strictObject({encoding:z.literal('ganksoft.knowledge-order/1'),deckId:Id,nodeIds:z.array(Id).max(10000)})
  .refine(v=>new Set(v.nodeIds).size===v.nodeIds.length,'知识顺序包含重复身份');
export const ApplyTree=TreeScope.extend({expectedTreeHash:TreeHash,nodes:z.array(TreeNode.omit({revision:true})).max(5000)});
export const CreateNode=TreeScope.extend({expectedTreeHash:TreeHash,parentId:Id.nullable(),name:Name.optional(),afterId:Id.optional()});
export const SaveNode=NodeScope.extend({expectedRevision:Revision.min(1),markdown:Text});
export const CardLinks=z.strictObject({cardId:Id,deckId:Id,nodeIds:z.array(Id).max(500),revision:Revision});
export const StoredCardLinks=CardLinks.extend({encoding:z.literal('ganksoft.card-knowledge/1')})
  .refine(v=>new Set(v.nodeIds).size===v.nodeIds.length,'卡片关联重复');
export const SaveCardLinks=CardLinks.omit({revision:true}).extend({expectedRevision:Revision});
export const BodyPolicy=z.enum(['keep','replace','append']);
export const MergeNodes=TreeScope.extend({sourceId:Id,targetId:Id,bodyPolicy:BodyPolicy.default('keep')});
export const MergePreview=TreeScope.extend({previewToken:z.string().max(10000).nullable(),source:NodeBody,target:NodeBody,
  bodyPolicy:BodyPolicy,children:Revision,linkedCards:Revision,conflicts:z.array(z.string())});
export const TreeToken=z.strictObject({previewToken:z.string().min(1).max(10000)});
export const DeleteSubtree=NodeScope.extend({expectedTreeHash:TreeHash});
export const RecycleNode=TreeNode.extend({deletedRevision:Revision.min(1)});
export const StoredKnowledgeRecycle=z.strictObject({encoding:z.literal('ganksoft.knowledge-recycle/1'),batchId:Id,deckId:Id,rootId:Id,
  nodes:z.array(RecycleNode).min(1).max(5000),mergedInto:Id.nullable(),createdAt:z.iso.datetime()})
  .refine(v=>new Set(v.nodes.map(n=>n.nodeId)).size===v.nodes.length&&v.nodes.some(n=>n.nodeId===v.rootId),'回收批次身份重复或根缺失');
export const RecycleBatchView=TreeScope.extend({batchId:Id,rootId:Id,name:Name,count:Revision,mergedInto:Id.nullable(),createdAt:z.iso.datetime()});
export const RestoreNodes=TreeScope.extend({batchId:Id,rootName:Name.optional(),parentId:Id.nullable().optional()});
export const RestorePreview=TreeScope.extend({batchId:Id,previewToken:z.string().max(10000).nullable(),rootName:Name,parentId:Id.nullable(),count:Revision,conflicts:z.array(z.string())});
