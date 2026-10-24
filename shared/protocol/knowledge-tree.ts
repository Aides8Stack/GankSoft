import { z } from 'zod';
import { Id, Name, Revision, Text } from './data.ts';
export const TreeScope=z.strictObject({deckId:Id});
export const NodeScope=TreeScope.extend({nodeId:Id});
export const TreeHash=z.string().regex(/^[a-f0-9]{64}$/);
export const TreeNode=z.strictObject({nodeId:Id,name:Name,parentId:Id.nullable(),position:Revision,revision:Revision.min(1)});
export const TreeView=TreeScope.extend({treeHash:TreeHash,nodes:z.array(TreeNode).max(5000)});
export const NodeBody=NodeScope.extend({name:Name,parentId:Id.nullable(),position:Revision,revision:Revision.min(1),markdown:Text});
export const StoredNodeBody=z.strictObject({encoding:z.literal('ganksoft.knowledge-body/1'),nodeId:Id,deckId:Id,markdown:Text});
export const StoredTreeOrder=z.strictObject({encoding:z.literal('ganksoft.knowledge-order/1'),deckId:Id,nodeIds:z.array(Id).max(10000)})
  .refine(v=>new Set(v.nodeIds).size===v.nodeIds.length,'知识顺序包含重复身份');
export const ApplyTree=TreeScope.extend({expectedTreeHash:TreeHash,nodes:z.array(TreeNode.omit({revision:true})).max(5000)});
export const CreateNode=TreeScope.extend({expectedTreeHash:TreeHash,parentId:Id.nullable(),name:Name.optional(),afterId:Id.optional()});
export const SaveNode=NodeScope.extend({expectedRevision:Revision.min(1),markdown:Text});
export const CardLinks=z.strictObject({cardId:Id,deckId:Id,nodeIds:z.array(Id).max(500),revision:Revision});
export const StoredCardLinks=CardLinks.extend({encoding:z.literal('ganksoft.card-knowledge/1')})
  .refine(v=>new Set(v.nodeIds).size===v.nodeIds.length,'卡片关联重复');
export const SaveCardLinks=CardLinks.omit({revision:true}).extend({expectedRevision:Revision});
