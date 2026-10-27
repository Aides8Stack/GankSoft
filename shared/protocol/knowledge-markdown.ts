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
export const ExportMarkdown=TreeScope.extend({nodeIds:z.array(Id).min(1).max(5000),includeDescendants:z.boolean().default(false),includeParentBodies:z.boolean().default(false)});
export const MarkdownExportPreview=TreeScope.extend({exportToken:Id,nodeCount:Revision,bodyCount:Revision,bytes:Revision,imageCount:Revision,
 markdown:z.string().max(100000),truncated:z.boolean()});
export const UseMarkdownExport=TreeScope.extend({exportToken:Id});
export const SaveMarkdownFile=z.strictObject({saved:z.boolean(),name:z.string().max(300).nullable()});

export const MarkdownPage=TreeScope.extend({previewToken:Id,offset:Revision,limit:Revision.min(1).max(100).default(50)});
export const MarkdownDiff=TreeScope.extend({previewToken:Id,key:Id});
export const MarkdownDiffView=z.strictObject({key:Id,path:z.array(Name).max(100),before:z.string().max(200000),after:z.string().max(200000)});
export const MarkdownHeadings=TreeScope.extend({sourceToken:Id,offset:Revision,limit:Revision.min(1).max(100).default(100)});
export const MarkdownHeadingsPage=z.strictObject({total:Revision,nextOffset:Revision.nullable(),headings:MarkdownSource.shape.headings});
