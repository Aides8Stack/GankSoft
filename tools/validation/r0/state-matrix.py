"""Human-authored semantic contracts against the existing 52-state enumeration; no re-indexing."""
from pathlib import Path
import json,re,hashlib
ROOT=Path('docs/v076/rebuild-v37-source-first/stages/R0')
prior=json.loads((ROOT/'evidence/reference-states-summary.json').read_text())
api=json.loads((ROOT/'api-component-index.json').read_text()); methods={m['method']:m for m in api['methods']}
functions={f['name']:f for f in json.loads((ROOT/'source-audit.json').read_text())['functions'] if f['kind']=='FunctionDeclaration'}
result_path=ROOT/'evidence/semantic-v1/result.json'; result=json.loads(result_path.read_text()) if result_path.exists() else {}
passed={c['id']:c for c in result.get('cases',[]) if c['status']=='PASS'}
failed={c['id']:c for c in result.get('cases',[]) if c['status']=='FAIL'}
# owner, prototype function, Vue source, exact formal state/DOM, method(s), service source, tests, difference
contracts={
'overview':('R2','overview','src/unified/UnifiedHome.vue','summary/dashboard; .summary-strip, .split-layout',['workspace.dashboard','workspace.catalog'],'electron/modules/workspace-unified/dashboard.ts',['tests/dashboard-v076.test.ts'],'原型静态五集/最近示例；正式顶层文件夹和真实事件。四指标夹具等效，不代表条目/排序等效。'),
'deck':('R2','deckHome','src/unified/UnifiedDeckOverview.vue','deckId; dashboard/analysis; .hero-panel/.quick-row',['workspace.dashboard','workspace.analytics'],'electron/modules/workspace-unified/dashboard.ts',['tests/dashboard-v076.test.ts'],'76%演示掌握度无可信业务定义；正式累计复盘/平均自评必须保留准确标签。'),
'cards':('R3','cardsScreen','src/unified/UnifiedWorkspace.vue','page=cards; query/mode/selection/cursor; .unified-card-list',['card.listSummary','draft.listSummary'],'electron/modules/cards-unified/queries.ts',['tests/unified-workspace-v075.test.ts'],'原型本地10条及内存选择；正式分页摘要、本页全选、草稿分离。'),
'cardDetail':('R3','cardDetailScreen','src/unified/UnifiedCardDetail.vue','cardId/event; article[aria-label=卡片详情]',['card.getPublishedContent','learning.history.list','learning.history.get'],'electron/modules/cards-unified/history.ts',['tests/unified-history-evidence-v075.test.ts'],'原型固定趋势与假历史；正式按卡片/内容版本/事件读取。'),
'filter':('R3','filterScreen','src/unified/UnifiedStudyPlanner.vue','filters/random/seed/queue; section[aria-label=筛选学习]',['learning.queue.preview','knowledge.tree.read'],'electron/modules/cards-unified/queue.ts',['tests/unified-workspace-v075.test.ts'],'正式受排期预算/会话占用约束，原型选择控件部分为展示。'),
'analytics':('R4','analyticsScreen','src/unified/UnifiedAnalytics.vue','date/result/mastery; analytics sections',['workspace.analytics','learning.mastery.deck','learning.mastery.knowledge'],'electron/modules/cards-unified/mastery.ts',['tests/unified-analytics-catalog-v075.test.ts'],'固定SVG趋势不可当真实趋势，自评平均不等于掌握率。'),
'exchange':('R5','exchangeScreen','src/unified/UnifiedCardExchange.vue','preview/importing/pending; .exchange-preview',['card.exchange.preview','card.exchange.import','card.exchange.save'],'electron/modules/cards-unified/exchange.ts',['tests/unified-card-exchange-v075.test.ts'],'正式文件选择/媒体闭包/回执，不以原型demo按钮证明业务。'),
'schedule':('R6','scheduleScreen','src/unified/UnifiedScheduleSettings.vue','config/policy/preview; FSRS settings',['policy.config.get','policy.deck.set','policy.card.get','policy.card.set','policy.config.preview'],'electron/modules/cards-unified/recompute.ts',['tests/unified-review-v075.test.ts'],'参数保存与显式预览/重算分离；不照搬演示下拉重排排期。'),
'settings':('R6','settingsBody','src/unified/UnifiedSystemSettings.vue','section=appearance|review|data|operations|ai; .system-settings',['preferences.get','preferences.set','maintenance.operations'],'electron/protocol/gateway.ts',['tools/workspace-spike/settings-smoke.ts'],'原型默认general，正式默认appearance；额外operations/ai须保留。'),
'knowledge':('R5','knowledgeScreen','src/components/MindMapWorkspace.vue','nativeTree/view/selectedKnowledgeId/expandedNodes; .mind-workspace',['knowledge.tree.read','knowledge.tree.layer','knowledge.node.read','knowledge.tree.apply'],'electron/modules/knowledge-unified/tree.ts',['tests/unified-knowledge-v075.test.ts'],'原型12节点/显示28；正式业务节点数来自服务，gank-root仅展示根不能计数。'),
'knowledgeTransfer':('R5','knowledgeTransferScreen','src/components/KnowledgeMarkdownExchange.vue','mode/source/preview/exported/selected/mount; dialog',['knowledge.md.source.text','knowledge.md.import.preview','knowledge.md.import.confirm','knowledge.md.export.preview'],'electron/modules/knowledge-unified/markdown-exchange.ts',['tests/knowledge-markdown-store-v075.test.ts'],'正式token/过期/CAS/取消不写，原型preview注入null并不等于真实预览。'),
'editor':('R4','editorScreen','src/cards/CardDraftForm.vue','mode/controller/preview; [data-testid=card-draft-form]',['draft.get','draft.save','draft.previewSwitch','draft.switchType','card.publish'],'electron/modules/cards-unified/draft-service.ts',['tests/card-drafts-v075.test.ts'],'question→question、recall→qa、reading→direct；Crepe替代demo contenteditable，草稿/发布分离。'),
'review':('R4','reviewScreen','src/review/UnifiedReviewForm.vue','session.stage/paused/draft/pending; .unified-review',['learning.session.get','learning.session.change','learning.review.submit'],'electron/modules/cards-unified/review-session.ts',['tests/unified-review-v075.test.ts'],'冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。')}
# modal contract: formal component and entry, API, confirmed source disposition, dynamic witness
modal={
'switchEditorMode':('src/cards/CardDraftForm.vue','卡片类型按钮→switchType/saveAll/previewType→确认切换卡片类型',['draft.previewSwitch','draft.switchType'],'BUSINESS_ADAPTED','取消保留原类型；正式先flush当前草稿，再preview，不能宣称预览前绝无草稿保存。','production-dialog-switch-cancel'),
'knowledgePicker':('src/unified/UnifiedCardEditor.vue','选择知识点→openLinks→选择知识点关联',['knowledge.cardLinks.get','knowledge.cardLinks.set','knowledge.tree.read'],'BUSINESS_ADAPTED','AI示例推荐不是真实关联；人工确认后写CAS关系。','production-dialog-knowledge-picker-cancel'),
'paste':('src/cards/CardDraftForm.vue','粘贴卡片→openTransfer(paste)→内容交换',['card.clipboard.preview','card.clipboard.apply'],'BUSINESS_ADAPTED','文本parse/预览和原生二进制剪贴板通道分开，取消不发布。','production-dialog-paste-cancel'),
'copyCard':('src/cards/CardDraftForm.vue','复制卡片→copyContent（无独立scope模态框）',['card.clipboard.copy'],'BUSINESS_ADAPTED','正式复制二进制闭包；不能臆造原型复制范围对话框已实现。',None),
'copyPrompt':('src/cards/CardDraftForm.vue','复制 Prompt→openTransfer(prompt)→内容交换',['card.getPromptContext'],'BUSINESS_ADAPTED','候选目录与已确认路径独立默认不选；本地模板。','production-dialog-prompt-template-cancel'),
'media':('src/editor/media-adapter.ts','Crepe粘贴入口→stageClipboard；无独立资源管理窗',['media.stage'],'MISSING','保留媒体暂存/引用/历史能力；独立管理窗缺失由R4补，不能将演示refs=0视为生产可删除。',None),
'deleteMedia':('src/editor/media-adapter.ts','无已验证的独立资源删除对话框',[],'MISSING','media.remove存在不等于606历史资产可由新UI安全删除；须先定义引用/版本归属门禁。',None),
'batchOptions':('src/cards/CardDraftForm.vue','addOption/removeOption/moveOption；无批量选项弹窗',[],'MISSING','保留2–100稳定optionId和答案校验；批量输入需要R4接入解析预览。',None),
'promptManager':('src/cards/CardDraftForm.vue','复制 Prompt→Prompt 模板 details',[],'BUSINESS_ADAPTED','管理从独立modal改为Prompt对话框内details，不删除模板能力。','production-dialog-prompt-template-cancel'),
'newKnowledge':('src/components/MindMapWorkspace.vue','新增下级/同级/根→MindElixir公开hook→真实tree apply',['knowledge.tree.apply','knowledge.node.create'],'BUSINESS_ADAPTED','原型新建命名modal与正式原生节点编辑不同，UI创建/命名取消待R5专项。',None),
'batchExport':('src/unified/UnifiedCardBatch.vue','多选→导出选中卡片→UnifiedCardExchange内联预览',['card.exchange.preview','card.exchange.save'],'BUSINESS_ADAPTED','正式不是相同modal，真实媒体/知识闭包+回执。',None),
'batchDelete':('src/unified/UnifiedCardBatch.vue','移到回收站→native confirm→remove',['card.batch.apply'],'BUSINESS_ADAPTED','危险操作确认仍保留；原型自制modal与原生confirm样式不同。',None),
'permanentTrash':('src/unified/UnifiedRecycle.vue','没有606永久清除的已实现入口/专用typed命令',[],'MISSING','不得将legacy删除路径绑定到606永久清除；R6先明确历史/媒体/备份风险。',None),
'historyDetail':('src/unified/UnifiedCardDetail.vue','learning.history.get(eventId)→只读历史详情',['learning.history.get'],'BUSINESS_ADAPTED','原型generic示意没有真实历史；正式按eventId读取冻结证据。',None),
'demo':('src/unified/UnifiedWorkspace.vue','genericDialog(交互演示)无生产对应',[],'MISSING','通用demo提示非生产功能，必须逐具体业务按钮拆到R1-R6，不能实现万能demo弹窗冒充功能。',None)}
# Source anchors for event/DOM locations: line evidence is verified against real files.
def location(path,needle):
 p=Path(path);assert p.exists(),path;text=p.read_text();pos=text.find(needle);assert pos>=0,(path,needle);return {'path':path,'line':text[:pos].count('\n')+1,'anchor':needle}
registry=Path('shared/protocol/registry.ts').read_text();gateway=Path('electron/protocol/gateway.ts').read_text()
rows=[]
for item in prior['scenarios']:
 ident=item['id'];group='review' if ident.startswith('review-') else 'editor' if ident.startswith('editor-') else 'knowledgeTransfer' if ident.startswith('transfer-') else 'knowledge' if ident.startswith('knowledge-') else 'settings' if ident.startswith('settings-') else ident
 if ident.startswith('modal-'):group='editor'
 owner,fn,component,state,ms,backend,tests,difference=contracts[group]
 witness=None;semantic='BUSINESS_ADAPTED';trigger='导航data-go / navTo → render；正式用户可见导航→switchPage'
 if ident.startswith('modal-'):
  key=ident[6:];component,trigger,ms,semantic,difference,witness=modal[key];fn='renderModal';owner='R5' if key=='newKnowledge' else 'R6' if key=='permanentTrash' else 'R3' if key in ['batchDelete','batchExport','historyDetail'] else 'R4';state=trigger
 elif group=='review':
  mode=ident.split('-')[1];phase=ident.split('-')[2];formal={'question':'question','recall':'qa','reading':'direct'}[mode];state=f"content.mode={formal}; session.stage={phase if not(mode=='reading' and phase=='answer') else 'reveal'}";witness='production-review-'+formal;trigger='data-review-mode→answer；data-answer→reviewPicked；reveal→reveal；pause切布尔；reviewNext→answer'
  if phase=='result':difference+=' 原型无可达result事件，旧枚举脚本人为赋值result，只复用非answer分支；正式result是已落库的独立阶段。'
  if mode=='reading' and phase=='answer':difference+=' 原型需点击完成阅读，正式direct初始即reveal；不能向真实状态机添加虚假answer。'
 elif group=='editor':witness='production-editor-'+{'question':'question','recall':'qa','reading':'direct'}[ident.split('-')[1]];trigger='data-editor-mode→switchEditorMode确认；正式卡片类型→previewType/confirmSwitch，初始模式来自published/draft'
 elif group=='knowledge':witness='production-knowledge-selection-hierarchy';trigger='data-map-id/knowledge-nav-select/outline-select；data-knowledge-view；fullMap；正式selectNode/outlineSelect/expandAll/toggleView'
 elif group=='knowledgeTransfer':witness='production-transfer-'+('export' if 'export' in ident else 'import')+'-preview-cancel';trigger='transferOpenImport/Export→openKnowledgeTransfer；transferPreview需实际输入/选择；正式open/stage/makePreview/close'
 elif group=='settings':
  key=ident.split('-',1)[1] if '-' in ident else 'general';trigger=f'data-setting={key}→state.setting；正式设置分类@click→section';witness='production-settings-trash' if key=='trash' else 'production-settings-categories'
  if key in ['general','about']:semantic='MISSING';difference+=f' 正式没有{key}分类；不能用appearance页面冒称该分类已还原。'
  state={'general':'无通用设置分类；启动页/语言/快捷键说明缺映射UI','about':'无关于分类；版本在侧栏/能力元数据','trash':'footer emit recycle→UnifiedRecycle；主侧栏重复入口','appearance':'section=appearance; themeMode→preferences.set','review':'section=review→emit schedule；配置在UnifiedScheduleSettings','data':'section=data→FullRestore/Relocation/backup；取消/未知结果保护'}.get(key,state)
 if group=='knowledge' and not ident.endswith('true'):semantic='MISSING';difference+=' 正式父组件固定expanded，普通态入口不存在；全屏补测不能冒充普通态。'
 refs=[]
 for method in ms:
  assert method in methods,(ident,method);refs.append({'method':method,'registryLine':methods[method]['line'],'definition':methods[method]['definition'],'handlerReferences':[r for r in methods[method]['references'] if r['file'].startswith('electron/')][:5]})
 if ident=='modal-newKnowledge' or ident=='modal-knowledgePicker':tests=['tests/unified-knowledge-v075.test.ts']
 if ident=='modal-batchExport':tests=['tests/unified-card-exchange-v075.test.ts']
 if ident in ['modal-batchDelete','modal-permanentTrash']:tests=['tests/unified-card-lifecycle-v075.test.ts']
 if ident=='modal-historyDetail':tests=['tests/unified-history-evidence-v075.test.ts']
 candidate=[]
 for file in tests:
  assert Path(file).exists(),file
  source=Path(file).read_text();names=re.findall(r"test\(['\"]([^'\"]+)",source)
  candidate.append({'file':file,'scenarios':names[:6],'execution':'INHERITED_PASS' if file in ['tests/dashboard-v076.test.ts','tests/unified-analytics-catalog-v075.test.ts','tests/unified-workspace-v075.test.ts','tests/unified-review-v075.test.ts','tests/unified-knowledge-v075.test.ts'] else 'NOT_RUN','evidence':'prior evidence/related-tests.txt or domain-tests.txt; implementation fingerprint unchanged' if file in ['tests/dashboard-v076.test.ts','tests/unified-analytics-catalog-v075.test.ts','tests/unified-workspace-v075.test.ts','tests/unified-review-v075.test.ts','tests/unified-knowledge-v075.test.ts'] else 'Test source inspected only; no current passing execution claimed'})
 source=Path(component).read_text();needle=next((s for s in ['<template>','export function','const props','<script'] if s in source),source.splitlines()[0])
 row={'id':ident,'prototype':{'function':fn,'location':functions[fn]['line'],'state':ident,'triggerAndEvent':trigger,'priorDomEvidence':'evidence/reference-states.json.gz#'+ident},'production':{'component':location(component,needle),'stateAndDOM':state,'api':refs,'dataSource':backend,'dataSourceExists':Path(backend).exists()},'mappingStatus':semantic,'difference':difference,'owner':owner,'sourceReview':'PASS','testSourcesInspected':candidate,'dynamicSupplement':{'status':'FAIL' if witness in failed else 'PASS' if witness in passed and not(semantic=='MISSING') else 'NOT_RUN','caseId':witness,'evidence':'evidence/semantic-v1/result.json' if witness else None},'visualAcceptance':'NOT_RUN','remaining':[]}
 if semantic=='MISSING':row['remaining'].append('Production capability/entry absent or deliberately unbound; mapping verified as missing, implementation belongs to '+owner)
 elif witness not in passed:row['remaining'].append('No dedicated current production UI event run for this exact state; source/API/tests checked; retain '+owner+' behavioral acceptance')
 if group=='knowledge' and ident.endswith('false'):row['remaining'].append('Production parent always passes expanded; ordinary embedded knowledge layout absent, R5 UI implementation gap')
 if ident.endswith('-result') and group=='review':row['prototype']['reachableByPrototypeEvents']=False
 rows.append(row)
assert len(rows)==52 and len({r['id'] for r in rows})==52
output={'startingRemote':'4765bef6966ceb4cb277779daa8db3716578d52a','scope':'52 source/semantic audits, never 52 feature passes','inheritedEvidenceFingerprint':result.get('inheritedImplementationFingerprint'),'rows':rows}
(ROOT/'STATE-SEMANTIC-MAP.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
lines=['# R0 52状态语义核对','','逐条来源/精确协议签名/handler引用/候选测试名称/实际运行状态见STATE-SEMANTIC-MAP.json。52是既有枚举行数，不是功能完成数。静态sourceReview PASS仅表示本轮读源核对，动态证据单列。','', '| 原型状态 | 正式状态/DOM | 判定与责任 | 动态补证 |','|---|---|---|---|']
for r in rows:lines.append(f"| {r['id']} | {r['production']['component']['path']} — {r['production']['stateAndDOM']} | {r['mappingStatus']} / {r['owner']}；{r['difference']} | {r['dynamicSupplement']['status']} / {r['dynamicSupplement']['caseId'] or '候选测试未跑'} |")
(ROOT/'STATE-SEMANTIC-MAP.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'sourceReviewed':52,'dynamicWitnessedRows':sum(r['dynamicSupplement']['status']=='PASS' for r in rows),'missing':sum(r['mappingStatus']=='MISSING' for r in rows),'unrunRows':sum(r['dynamicSupplement']['status']=='NOT_RUN' for r in rows)}))
