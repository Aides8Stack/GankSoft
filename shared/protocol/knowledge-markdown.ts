import {z} from 'zod';
import {Id,Revision,Name} from './data.ts';
import {BodyPolicy,TreeHash,TreeScope} from './knowledge-tree.ts';
export const MarkdownSource=TreeScope.extend({sourceToken:Id,name:z.string().max(300),bytes:Revision,format:z.enum(['marked','external']),
 headingTotal:Revision,headings:z.array(z.strictObject({line:Revision.min(1),depth:Revision.min(1).max(6),name:Name})).max(100)});
export const StageMarkdownText=TreeScope.extend({markdown:z.string().max(1_400_000)});
export const ImportMarkdown=TreeScope.extend({sourceToken:Id,parentId:Id.nullable(),selectedLines:z.array(Revision.min(1)).max(5000).optional(),
 policies:z.record(z.string(),BodyPolicy).default({})});
export const MarkdownImportPreview=TreeScope.extend({previewToken:Id,sourceName:z.string().max(300),treeHash:TreeHash,
 total:Revision,nextOffset:Revision.nullable(),rows:z.array(z.strictObject({key:Id,line:Revision.min(1),path:z.array(Name).max(100),nodeId:Id,action:z.enum(['create','keep','replace','append']),beforeChars:Revision,afterChars:Revision})).max(100),
 created:Revision,updated:Revision,kept:Revision,imageCount:Revision,bytes:Revision});
export const ConfirmMarkdownImport=TreeScope.extend({previewToken:Id});
export const MarkdownImportResult=TreeScope.extend({created:Revision,updated:Revision,kept:Revision});
// Unversioned callers retain the original global-flag semantics. New UI uses
// selectionVersion=2 exclusively; strict union rejects ambiguous mixed requests.
export const LegacyExportMarkdown=TreeScope.extend({nodeIds:z.array(Id).min(1).max(5000),includeDescendants:z.boolean().default(false),includeParentBodies:z.boolean().default(false)});
export const ExportMarkdownV2=TreeScope.extend({selectionVersion:z.literal(2),expectedTreeHash:TreeHash,
 directNodeIds:z.array(Id).max(5000),rules:z.array(z.strictObject({nodeId:Id,includeParentBodies:z.boolean(),includeDescendants:z.boolean()})).max(5000),excludedNodeIds:z.array(Id).max(5000)});
export const ExportMarkdown=z.union([ExportMarkdownV2,LegacyExportMarkdown]);
export const MarkdownExportPreview=TreeScope.extend({exportToken:Id,nodeCount:Revision,bodyCount:Revision,bytes:Revision,imageCount:Revision,
 markdown:z.string().max(100000),truncated:z.boolean()});
export const UseMarkdownExport=TreeScope.extend({exportToken:Id});
export const SaveMarkdownFile=z.strictObject({saved:z.boolean(),name:z.string().max(300).nullable()});

export const MarkdownPage=TreeScope.extend({previewToken:Id,offset:Revision,limit:Revision.min(1).max(100).default(50)});
export const MarkdownDiff=TreeScope.extend({previewToken:Id,key:Id});
export const MarkdownIncomingImage=z.strictObject({index:Revision.min(1),alt:z.string().max(1000),title:z.string().max(1000).nullable(),mime:z.enum(['image/png','image/jpeg','image/webp']),bytes:Revision,sha256:z.string().regex(/^[a-f0-9]{64}$/),width:Revision.min(1).max(100)});
export const MarkdownDiffView=z.strictObject({key:Id,path:z.array(Name).max(100),before:z.string().max(200000),after:z.string().max(200000),action:z.enum(['create','keep','replace','append']),incoming:z.string().max(200000),incomingChars:Revision,incomingTruncated:z.boolean(),images:z.array(MarkdownIncomingImage).max(200)});
export const MarkdownHeadings=TreeScope.extend({sourceToken:Id,offset:Revision,limit:Revision.min(1).max(100).default(100)});
export const MarkdownHeadingsPage=z.strictObject({total:Revision,nextOffset:Revision.nullable(),headings:MarkdownSource.shape.headings});
