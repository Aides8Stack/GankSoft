import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMarkedMarkdown,serializeMarkedMarkdown,externalHeadingCandidates,confirmExternalHeadings,MARKDOWN_HEADER as H,BODY_START as S,BODY_END as E,MarkdownProtocolError,type MarkdownForestNode} from '../shared/knowledge/markdown.ts';
const node=(markdown='',extra:Partial<MarkdownForestNode>={}):MarkdownForestNode=>({key:'root',parentKey:null,name:'合成根',position:0,markdown,line:1,...extra});
const shape=(nodes:MarkdownForestNode[])=>nodes.map(n=>({name:n.name,position:n.position,markdown:n.markdown,parent:n.parentKey?nodes.find(p=>p.key===n.parentKey)!.name:null}));
const code=(value:string)=>(e:unknown)=>e instanceof MarkdownProtocolError&&e.code===value&&e.line>0;
test('T28 original marked fixture keeps body headings and fenced fake directives inside exactly four nodes',()=>{
 const fixture=readFileSync(new URL('./fixtures/v075-md-marked.md',import.meta.url),'utf8'),nodes=parseMarkedMarkdown(fixture);
 assert.equal(nodes.length,4);assert.deepEqual(nodes.filter(n=>!n.parentKey).map(n=>n.name),['逻辑填空','资料分析']);
 assert.match(nodes[0].markdown,/## 正文中的常见考点/);assert.match(nodes[0].markdown,/<!-- ganksoft:body:start -->/);
 assert.equal(nodes[1].name,'语境分析');assert.match(nodes[1].markdown,/### 转折关系的提示词（正文标题）/);
 assert.deepEqual(shape(parseMarkedMarkdown(serializeMarkedMarkdown(nodes))),shape(nodes));
});
test('T28/T29 literal reserved comments are escaped reversibly, including a literal escape directive and trailing blank lines',()=>{
 for(const body of [E,S,H,'<!-- ganksoft:literal:v1:bm90LWEtZGlyZWN0aXZl -->','前文\n\n'+E+'\n\n后文\n\n','\uFEFF正文', '', '正文\n']){
  const encoded=serializeMarkedMarkdown([node(body)]),decoded=parseMarkedMarkdown(encoded);assert.equal(decoded[0].markdown,body);assert.equal(decoded.length,1);
 }
});
test('T28 CommonMark AST protects fenced, indented, quoted and multiline comment marker literals',()=>{
 const bodies=['```markdown\n'+E+'\n# 假标题\n```','~~~~\n'+S+'\n~~~~','    '+E+'\n    # 假标题','> '+E+'\n> # 假标题','<!-- 合成跨行注释\n'+E+'\n尾部 -->'];
 for(const body of bodies){const encoded=serializeMarkedMarkdown([node(body)]);assert.equal(parseMarkedMarkdown(encoded)[0].markdown,body);}
});
test('T29 malformed nesting, missing body, out-of-order markers and skipped ancestors have line diagnostics',()=>{
 const cases:[string,string][]=[
  [H+'\n'+E,'MARKDOWN_UNEXPECTED_END'],[H+'\n'+S,'MARKDOWN_BODY_WITHOUT_NODE'],[H+'\n# 根','MARKDOWN_BODY_REQUIRED'],
  [H+'\n# 根\n'+S+'\n'+S+'\n'+E,'MARKDOWN_NESTED_BODY'],[H+'\n# 根\n'+S+'\n正文','MARKDOWN_BODY_UNCLOSED'],
  [H+'\n## 缺父\n'+S+'\n'+E,'MARKDOWN_DEPTH_JUMP'],[H+'\n# 根\n正文','MARKDOWN_BODY_REQUIRED'],
  [H+'\n# 根\n'+S+'\n<!-- ganksoft:literal:v1:??? -->\n'+E,'MARKDOWN_LITERAL_INVALID'],
 ];for(const [source,expected]of cases)assert.throws(()=>parseMarkedMarkdown(source),code(expected));
});
test('T29 duplicate sibling paths are rejected while equal names on different branches remain distinct',()=>{
 assert.throws(()=>serializeMarkedMarkdown([node(),node('',{key:'r2',position:1})]),code('MARKDOWN_DUPLICATE_PATH'));
 const nodes=[node('',{name:'根甲'}),node('',{key:'r2',name:'根乙',position:1}),node('甲',{key:'a',parentKey:'root',name:'同名子节点'}),node('乙',{key:'b',parentKey:'r2',name:'同名子节点'})];
 assert.equal(parseMarkedMarkdown(serializeMarkedMarkdown(nodes)).length,4);
 const text=[H,'# 重名',S,'',E,'# 重名',S,'',E].join('\n');assert.throws(()=>parseMarkedMarkdown(text),code('MARKDOWN_DUPLICATE_PATH'));
});
test('T30 multiple roots and six-level branches preserve sibling order and never flatten a seventh level or a cycle',()=>{
 const nodes:MarkdownForestNode[]=[];for(let i=0;i<6;i++)nodes.push(node('层级'+i,{key:'n'+i,parentKey:i?'n'+(i-1):null,name:'层级'+i}));
 assert.equal(parseMarkedMarkdown(serializeMarkedMarkdown(nodes)).length,6);
 assert.throws(()=>serializeMarkedMarkdown([...nodes,node('',{key:'n6',parentKey:'n5',name:'超深'})]),code('MARKDOWN_DEPTH_UNSUPPORTED'));
 assert.throws(()=>serializeMarkedMarkdown([node('',{parentKey:'child'}),node('',{key:'child',parentKey:'root',name:'子'})]),code('MARKDOWN_CYCLE'));
 assert.throws(()=>serializeMarkedMarkdown([node('',{parentKey:'missing'})]),code('MARKDOWN_PARENT_MISSING'));
});
test('T28/T32 body formatting, formulas, closed color markup and image placement text survive protocol round-trip unchanged',()=>{
 const body='## 正文标题\n\n公式 $E=mc^2$\n\n$$\n\\frac{1}{2}\n$$\n\n<span data-gank-color="#b91c1c">有色文字</span>\n\n![图](gank-asset://10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000002?width=30)';
 assert.equal(parseMarkedMarkdown(serializeMarkedMarkdown([node(body)]))[0].markdown,body);
});
test('T29 BOM/CRLF normalize at the file boundary without discarding a BOM in node body',()=>{
 const encoded=serializeMarkedMarkdown([node('\uFEFF保留正文')]);const parsed=parseMarkedMarkdown('\uFEFF'+encoded.replace(/\n/g,'\r\n'));assert.equal(parsed[0].markdown,'\uFEFF保留正文');
 assert.throws(()=>parseMarkedMarkdown('普通Markdown'),code('MARKDOWN_FORMAT_REQUIRED'));
});
test('T31 external headings remain candidates until explicit line selection; unselected headings stay body content',()=>{
 const source=readFileSync(new URL('./fixtures/v075-md-external.md',import.meta.url),'utf8'),candidates=externalHeadingCandidates(source);
 assert.equal(candidates.length,3);assert.throws(()=>confirmExternalHeadings(source,[]),code('MARKDOWN_SELECTION_REQUIRED'));
 const chosen=confirmExternalHeadings(source,candidates.slice(0,2).map(c=>c.line));assert.equal(chosen.length,2);assert.match(chosen[1].markdown,/### 转折关系/);
 assert.deepEqual(shape(parseMarkedMarkdown(serializeMarkedMarkdown(chosen))),shape(chosen));
});
test('T31 external fenced/quoted titles are not candidates; preamble and missing selected ancestors require explicit correction',()=>{
 const source='# 根\n\n```md\n## 代码标题\n```\n\n> ## 引用标题\n\n## 子\n\n正文';const candidates=externalHeadingCandidates(source);assert.equal(candidates.length,2);
 assert.throws(()=>confirmExternalHeadings('未归属说明\n\n# 根',[3]),code('MARKDOWN_PREAMBLE_UNASSIGNED'));
 assert.throws(()=>confirmExternalHeadings('# 根\n\n### 孙',[1,3]),code('MARKDOWN_DEPTH_JUMP'));
});

test('T29 serializer refuses a body that would swallow structural markers instead of emitting an unrecoverable file',()=>{
 for(const body of ['```md\n未闭合代码','<div>\n不支持的HTML块\n</div>'])assert.throws(()=>serializeMarkedMarkdown([node(body)]),code('MARKDOWN_BODY_CONTEXT_UNSUPPORTED'));
});
