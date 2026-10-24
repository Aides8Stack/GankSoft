import {fromMarkdown} from 'mdast-util-from-markdown';
import type {RootContent} from 'mdast';
export const MARKDOWN_HEADER='<!-- ganksoft:md:v1 -->';
export const BODY_START='<!-- ganksoft:body:start -->';
export const BODY_END='<!-- ganksoft:body:end -->';
const literalPrefix='<!-- ganksoft:literal:v1:',literalSuffix=' -->';
export const MAX_MARKDOWN_BYTES=64*1024*1024;
export interface MarkdownForestNode {key:string;parentKey:string|null;name:string;position:number;markdown:string;line:number}
export class MarkdownProtocolError extends Error {
 readonly code:string;readonly line:number;
 constructor(code:string,line:number,message:string){super(`第${line}行：${message}`);this.code=code;this.line=line;}
}
function fail(code:string,line:number,message:string):never{throw new MarkdownProtocolError(code,line,message);}
function textInput(source:string,stripBom=true){
 if(new TextEncoder().encode(source).length>MAX_MARKDOWN_BYTES)fail('MARKDOWN_TOO_LARGE',1,'Markdown文件超过64MiB，请分批导入');
 if(source.includes('\0'))fail('MARKDOWN_INVALID',1,'Markdown不能包含空字符');
 return (stripBom?source.replace(/^\uFEFF/,''):source).replace(/\r\n?/g,'\n');
}
function position(node:RootContent){
 if(node.position?.start.offset===undefined||node.position?.end.offset===undefined)throw Error('MARKDOWN_AST_POSITION_MISSING');return node.position;
}
function directive(node:RootContent){
 const p=position(node);
 return node.type==='html'&&p.start.column===1&&p.start.line===p.end.line?node.value:null;
}
function base64(value:string){return btoa(Array.from(new TextEncoder().encode(value),b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decodeLiteral(value:string,line:number){
 const raw=value.slice(literalPrefix.length,-literalSuffix.length);
 try{
  if(!/^[A-Za-z0-9_-]+$/.test(raw))throw Error();
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(raw.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));
  if(base64(decoded)!==raw||/[\r\n\0]/.test(decoded))throw Error();return decoded;
 }catch{return fail('MARKDOWN_LITERAL_INVALID',line,'字面标记编码损坏');}
}
function isLiteral(value:string){return value.startsWith(literalPrefix)&&value.endsWith(literalSuffix);}
function escapeBody(body:string){
 const replacements:{start:number;end:number;value:string}[]=[];
 for(const node of fromMarkdown(body).children){const value=directive(node);if(value!==null&&([MARKDOWN_HEADER,BODY_START,BODY_END].includes(value)||isLiteral(value))){const p=position(node);replacements.push({start:p.start.offset!,end:p.end.offset!,value:literalPrefix+base64(value)+literalSuffix});}}
 let out=body;for(const r of replacements.reverse())out=out.slice(0,r.start)+r.value+out.slice(r.end);return out;
}
function nodeName(value:string,line:number){
 const name=value.trim();if(!name||name.length>100||/[\r\n\u0000-\u001f\u007f]/.test(name))fail('MARKDOWN_NAME_INVALID',line,'知识点名称为空、过长或包含控制字符');return name;
}
/** CommonMark supplies context; this state machine recognizes only top-level protocol directives. */
export function parseMarkedMarkdown(source:string):MarkdownForestNode[]{
 const text=textInput(source),ast=fromMarkdown(text);
 if(text.split('\n',1)[0]!==MARKDOWN_HEADER||directive(ast.children[0])!==MARKDOWN_HEADER)fail('MARKDOWN_FORMAT_REQUIRED',1,'请选择带GankSoft结构标记的Markdown，或先确认普通Markdown的节点标题');
 const nodes:MarkdownForestNode[]=[],stack:MarkdownForestNode[]=[],names=new Set<string>(),counts=new Map<string|null,number>();
 let pending:MarkdownForestNode|null=null,bodyStart:number|null=null,literals:{start:number;end:number;value:string}[]=[];
 for(const token of ast.children.slice(1)){
  const p=position(token),value=directive(token);
  if(bodyStart!==null){
   if(value===BODY_START)fail('MARKDOWN_NESTED_BODY',p.start.line,'正文标记不能嵌套；字面标记请使用可逆转义');
   if(value===MARKDOWN_HEADER)fail('MARKDOWN_UNESCAPED_HEADER',p.start.line,'正文中的文件标记需要字面转义');
   if(value===BODY_END){
    let end=p.start.offset!;if(end>bodyStart&&text[end-1]==='\n')end--;
    let body=text.slice(bodyStart,end);
    for(const literal of [...literals].reverse())body=body.slice(0,literal.start-bodyStart)+literal.value+body.slice(literal.end-bodyStart);
    pending!.markdown=body;pending=null;bodyStart=null;literals=[];continue;
   }
   if(value!==null&&isLiteral(value))literals.push({start:p.start.offset!,end:p.end.offset!,value:decodeLiteral(value,p.start.line)});
   continue;
  }
  if(value===BODY_START){if(!pending)fail('MARKDOWN_BODY_WITHOUT_NODE',p.start.line,'正文缺少知识点标题');bodyStart=p.end.offset!+(text[p.end.offset!]==='\n'?1:0);continue;}
  if(value===BODY_END)fail('MARKDOWN_UNEXPECTED_END',p.start.line,'正文结束标记没有对应开始标记');
  if(pending)fail('MARKDOWN_BODY_REQUIRED',p.start.line,'知识点标题后必须提供正文开始/结束标记');
  if(token.type!=='heading'||p.start.column!==1||p.start.line!==p.end.line)fail('MARKDOWN_OUTSIDE_BODY',p.start.line,'结构标题以外的内容必须位于正文标记内');
  const raw=text.slice(p.start.offset!,p.end.offset!),match=/^(#{1,6}) (.+)$/.exec(raw);
  if(!match)fail('MARKDOWN_HEADING_INVALID',p.start.line,'仅支持一至六级ATX结构标题');
  const depth=match[1].length;
  if(depth>1&&!stack[depth-2])fail('MARKDOWN_DEPTH_JUMP',p.start.line,'结构标题不能跳过父级');
  const parentKey=depth===1?null:stack[depth-2].key,name=nodeName(match[2],p.start.line),identity=JSON.stringify([parentKey,name]);
  if(names.has(identity))fail('MARKDOWN_DUPLICATE_PATH',p.start.line,'同一父路径的知识点名称重复');names.add(identity);
  const node:MarkdownForestNode={key:'md:'+nodes.length,parentKey,name,position:counts.get(parentKey)??0,markdown:'',line:p.start.line};counts.set(parentKey,node.position+1);
  nodes.push(node);if(nodes.length>5000)fail('MARKDOWN_TOO_MANY_NODES',p.start.line,'单次导入最多5000个知识点');stack.length=depth;stack[depth-1]=node;pending=node;
 }
 if(bodyStart!==null)fail('MARKDOWN_BODY_UNCLOSED',pending!.line,'正文缺少结束标记；请检查未闭合代码块或注释');
 if(pending)fail('MARKDOWN_BODY_REQUIRED',pending.line,'知识点缺少完整正文封套');return nodes;
}
export function serializeMarkedMarkdown(input:readonly MarkdownForestNode[]):string {
 if(input.length>5000)fail('MARKDOWN_TOO_MANY_NODES',1,'单次导出最多5000个知识点');
 const byId=new Map(input.map(n=>[n.key,n]));if(byId.size!==input.length)fail('MARKDOWN_DUPLICATE_ID',1,'节点身份重复');
 const groups=new Map<string|null,MarkdownForestNode[]>(),names=new Set<string>();
 for(const n of input){nodeName(n.name,n.line);if(!n.key||n.parentKey&&!byId.has(n.parentKey))fail('MARKDOWN_PARENT_MISSING',n.line,'知识点缺少父级');
  const identity=JSON.stringify([n.parentKey,nodeName(n.name,n.line)]);if(names.has(identity))fail('MARKDOWN_DUPLICATE_PATH',n.line,'同一父路径知识点重名');names.add(identity);
  if(!Number.isInteger(n.position)||n.position<0)fail('MARKDOWN_ORDER_INVALID',n.line,'知识点顺序无效');const group=groups.get(n.parentKey)??[];group.push(n);groups.set(n.parentKey,group);
 }
 for(const group of groups.values())if(new Set(group.map(n=>n.position)).size!==group.length)fail('MARKDOWN_ORDER_INVALID',1,'同级顺序重复');
 const chunks=[MARKDOWN_HEADER],visited=new Set<string>(),ordered:MarkdownForestNode[]=[];
 function walk(parent:string|null,depth:number){
  if(depth>6&&(groups.get(parent)?.length??0)>0)fail('MARKDOWN_DEPTH_UNSUPPORTED',groups.get(parent)![0].line,'v1最多六级结构；请分支导出，不会扁平化');
  for(const n of (groups.get(parent)??[]).sort((a,b)=>a.position-b.position)){
   if(visited.has(n.key))fail('MARKDOWN_CYCLE',n.line,'知识结构循环');visited.add(n.key);ordered.push(n);
   const body=textInput(n.markdown,false);chunks.push('#'.repeat(depth)+' '+nodeName(n.name,n.line),BODY_START,escapeBody(body),BODY_END,'');walk(n.key,depth+1);
  }
 }
 walk(null,1);if(visited.size!==input.length)fail('MARKDOWN_CYCLE',1,'知识结构存在循环或未连接节点');
 const out=chunks.join('\n');textInput(out);
 try{const parsed=parseMarkedMarkdown(out);if(parsed.length!==ordered.length||parsed.some((n,i)=>n.markdown!==textInput(ordered[i].markdown,false)))throw Error();}
 catch{fail('MARKDOWN_BODY_CONTEXT_UNSUPPORTED',1,'正文含未闭合代码/注释或不支持的HTML块，请先修正；不会输出无法恢复的结构');}
 return out;
}
export interface MarkdownHeadingCandidate {line:number;depth:number;name:string}
export function externalHeadingCandidates(source:string):MarkdownHeadingCandidate[]{
 const text=textInput(source);return fromMarkdown(text).children.flatMap(node=>{const p=position(node);if(node.type!=='heading'||p.start.column!==1||p.start.line!==p.end.line)return [];
  const raw=text.slice(p.start.offset!,p.end.offset!),match=/^(#{1,6}) (.+)$/.exec(raw);return match?[{line:p.start.line,depth:match[1].length,name:nodeName(match[2],p.start.line)}]:[];});
}
/** No heading is promoted to a node until the caller explicitly supplies its line number. */
export function confirmExternalHeadings(source:string,selectedLines:readonly number[]):MarkdownForestNode[]{
 const text=textInput(source),candidates=externalHeadingCandidates(text),chosen=candidates.filter(c=>selectedLines.includes(c.line));
 if(!chosen.length||new Set(selectedLines).size!==selectedLines.length||chosen.length!==selectedLines.length)fail('MARKDOWN_SELECTION_REQUIRED',1,'请选择实际存在且不重复的节点标题行');
 const lines=text.split('\n'),out:MarkdownForestNode[]=[],stack:MarkdownForestNode[]=[],base=chosen[0].depth;
 if(lines.slice(0,chosen[0].line-1).some(line=>line.trim()))fail('MARKDOWN_PREAMBLE_UNASSIGNED',1,'首个节点前有正文，请先确认其归属');
 for(let i=0;i<chosen.length;i++){
  const h=chosen[i],depth=h.depth-base+1;if(depth<1||depth>6)fail('MARKDOWN_DEPTH_UNSUPPORTED',h.line,'选择的标题不能提升为同一森林');
  if(depth>1&&!stack[depth-2])fail('MARKDOWN_DEPTH_JUMP',h.line,'选中的标题缺少已确认父级');
  const parentKey=depth===1?null:stack[depth-2].key,node={key:'external:'+i,parentKey,name:h.name,position:out.filter(n=>n.parentKey===parentKey).length,
   markdown:lines.slice(h.line,i+1<chosen.length?chosen[i+1].line-1:lines.length).join('\n'),line:h.line};
  out.push(node);stack.length=depth;stack[depth-1]=node;
 }
 serializeMarkedMarkdown(out);return out;
}
