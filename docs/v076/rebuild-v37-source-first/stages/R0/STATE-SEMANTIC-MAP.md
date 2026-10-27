# R0 52状态语义核对

逐条来源/精确协议签名/handler引用/候选测试名称/实际运行状态见STATE-SEMANTIC-MAP.json。52是既有枚举行数，不是功能完成数。静态sourceReview PASS仅表示本轮读源核对，动态证据单列。

| 原型状态 | 正式状态/DOM | 判定与责任 | 动态补证 |
|---|---|---|---|
| overview | src/unified/UnifiedHome.vue — summary/dashboard; .summary-strip, .split-layout | BUSINESS_ADAPTED / R2；原型静态五集/最近示例；正式顶层文件夹和真实事件。四指标夹具等效，不代表条目/排序等效。 | NOT_RUN / 候选测试未跑 |
| deck | src/unified/UnifiedDeckOverview.vue — deckId; dashboard/analysis; .hero-panel/.quick-row | BUSINESS_ADAPTED / R2；76%演示掌握度无可信业务定义；正式累计复盘/平均自评必须保留准确标签。 | NOT_RUN / 候选测试未跑 |
| cards | src/unified/UnifiedWorkspace.vue — page=cards; query/mode/selection/cursor; .unified-card-list | BUSINESS_ADAPTED / R3；原型本地10条及内存选择；正式分页摘要、本页全选、草稿分离。 | NOT_RUN / 候选测试未跑 |
| cardDetail | src/unified/UnifiedCardDetail.vue — cardId/event; article[aria-label=卡片详情] | BUSINESS_ADAPTED / R3；原型固定趋势与假历史；正式按卡片/内容版本/事件读取。 | NOT_RUN / 候选测试未跑 |
| filter | src/unified/UnifiedStudyPlanner.vue — filters/random/seed/queue; section[aria-label=筛选学习] | BUSINESS_ADAPTED / R3；正式受排期预算/会话占用约束，原型选择控件部分为展示。 | NOT_RUN / 候选测试未跑 |
| analytics | src/unified/UnifiedAnalytics.vue — date/result/mastery; analytics sections | BUSINESS_ADAPTED / R4；固定SVG趋势不可当真实趋势，自评平均不等于掌握率。 | NOT_RUN / 候选测试未跑 |
| exchange | src/unified/UnifiedCardExchange.vue — preview/importing/pending; .exchange-preview | BUSINESS_ADAPTED / R5；正式文件选择/媒体闭包/回执，不以原型demo按钮证明业务。 | NOT_RUN / 候选测试未跑 |
| schedule | src/unified/UnifiedScheduleSettings.vue — config/policy/preview; FSRS settings | BUSINESS_ADAPTED / R6；参数保存与显式预览/重算分离；不照搬演示下拉重排排期。 | NOT_RUN / 候选测试未跑 |
| settings | src/unified/UnifiedSystemSettings.vue — 无通用设置分类；启动页/语言/快捷键说明缺映射UI | MISSING / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 正式没有general分类；不能用appearance页面冒称该分类已还原。 | NOT_RUN / production-settings-categories |
| knowledge | src/components/MindMapWorkspace.vue — nativeTree/view/selectedKnowledgeId/expandedNodes; .mind-workspace | MISSING / R5；原型12节点/显示28；正式业务节点数来自服务，gank-root仅展示根不能计数。 正式父组件固定expanded，普通态入口不存在；全屏补测不能冒充普通态。 | NOT_RUN / production-knowledge-selection-hierarchy |
| knowledgeTransfer | src/components/KnowledgeMarkdownExchange.vue — mode/source/preview/exported/selected/mount; dialog | BUSINESS_ADAPTED / R5；正式token/过期/CAS/取消不写，原型preview注入null并不等于真实预览。 | PASS / production-transfer-import-preview-cancel |
| editor-question | src/cards/CardDraftForm.vue — mode/controller/preview; [data-testid=card-draft-form] | BUSINESS_ADAPTED / R4；question→question、recall→qa、reading→direct；Crepe替代demo contenteditable，草稿/发布分离。 | PASS / production-editor-question |
| review-question-answer | src/review/UnifiedReviewForm.vue — content.mode=question; session.stage=answer | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 | PASS / production-review-question |
| review-question-reveal | src/review/UnifiedReviewForm.vue — content.mode=question; session.stage=reveal | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 | PASS / production-review-question |
| review-question-result | src/review/UnifiedReviewForm.vue — content.mode=question; session.stage=result | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 原型无可达result事件，旧枚举脚本人为赋值result，只复用非answer分支；正式result是已落库的独立阶段。 | PASS / production-review-question |
| editor-recall | src/cards/CardDraftForm.vue — mode/controller/preview; [data-testid=card-draft-form] | BUSINESS_ADAPTED / R4；question→question、recall→qa、reading→direct；Crepe替代demo contenteditable，草稿/发布分离。 | PASS / production-editor-qa |
| review-recall-answer | src/review/UnifiedReviewForm.vue — content.mode=qa; session.stage=answer | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 | PASS / production-review-qa |
| review-recall-reveal | src/review/UnifiedReviewForm.vue — content.mode=qa; session.stage=reveal | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 | PASS / production-review-qa |
| review-recall-result | src/review/UnifiedReviewForm.vue — content.mode=qa; session.stage=result | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 原型无可达result事件，旧枚举脚本人为赋值result，只复用非answer分支；正式result是已落库的独立阶段。 | PASS / production-review-qa |
| editor-reading | src/cards/CardDraftForm.vue — mode/controller/preview; [data-testid=card-draft-form] | BUSINESS_ADAPTED / R4；question→question、recall→qa、reading→direct；Crepe替代demo contenteditable，草稿/发布分离。 | PASS / production-editor-direct |
| review-reading-answer | src/review/UnifiedReviewForm.vue — content.mode=direct; session.stage=reveal | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 原型需点击完成阅读，正式direct初始即reveal；不能向真实状态机添加虚假answer。 | PASS / production-review-direct |
| review-reading-reveal | src/review/UnifiedReviewForm.vue — content.mode=direct; session.stage=reveal | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 | PASS / production-review-direct |
| review-reading-result | src/review/UnifiedReviewForm.vue — content.mode=direct; session.stage=result | BUSINESS_ADAPTED / R4；冻结内容/稳定optionId、真实elapsed/scoreTenths/FSRS；无原型固定答案/08:42。 原型无可达result事件，旧枚举脚本人为赋值result，只复用非answer分支；正式result是已落库的独立阶段。 | PASS / production-review-direct |
| settings-general | src/unified/UnifiedSystemSettings.vue — 无通用设置分类；启动页/语言/快捷键说明缺映射UI | MISSING / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 正式没有general分类；不能用appearance页面冒称该分类已还原。 | NOT_RUN / production-settings-categories |
| settings-review | src/unified/UnifiedSystemSettings.vue — section=review→emit schedule；配置在UnifiedScheduleSettings | BUSINESS_ADAPTED / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 | PASS / production-settings-categories |
| settings-data | src/unified/UnifiedSystemSettings.vue — section=data→FullRestore/Relocation/backup；取消/未知结果保护 | BUSINESS_ADAPTED / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 | PASS / production-settings-categories |
| settings-appearance | src/unified/UnifiedSystemSettings.vue — section=appearance; themeMode→preferences.set | BUSINESS_ADAPTED / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 | PASS / production-settings-categories |
| settings-about | src/unified/UnifiedSystemSettings.vue — 无关于分类；版本在侧栏/能力元数据 | MISSING / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 正式没有about分类；不能用appearance页面冒称该分类已还原。 | NOT_RUN / production-settings-categories |
| settings-trash | src/unified/UnifiedSystemSettings.vue — footer emit recycle→UnifiedRecycle；主侧栏重复入口 | BUSINESS_ADAPTED / R6；原型默认general，正式默认appearance；额外operations/ai须保留。 | PASS / production-settings-trash |
| modal-switchEditorMode | src/cards/CardDraftForm.vue — 卡片类型按钮→switchType/saveAll/previewType→确认切换卡片类型 | BUSINESS_ADAPTED / R4；取消保留原类型；正式先flush当前草稿，再preview，不能宣称预览前绝无草稿保存。 | PASS / production-dialog-switch-cancel |
| modal-knowledgePicker | src/unified/UnifiedCardEditor.vue — 选择知识点→openLinks→选择知识点关联 | BUSINESS_ADAPTED / R4；AI示例推荐不是真实关联；人工确认后写CAS关系。 | PASS / production-dialog-knowledge-picker-cancel |
| modal-paste | src/cards/CardDraftForm.vue — 粘贴卡片→openTransfer(paste)→内容交换 | BUSINESS_ADAPTED / R4；文本parse/预览和原生二进制剪贴板通道分开，取消不发布。 | PASS / production-dialog-paste-cancel |
| modal-copyCard | src/cards/CardDraftForm.vue — 复制卡片→copyContent（无独立scope模态框） | BUSINESS_ADAPTED / R4；正式复制二进制闭包；不能臆造原型复制范围对话框已实现。 | NOT_RUN / 候选测试未跑 |
| modal-copyPrompt | src/cards/CardDraftForm.vue — 复制 Prompt→openTransfer(prompt)→内容交换 | BUSINESS_ADAPTED / R4；候选目录与已确认路径独立默认不选；本地模板。 | PASS / production-dialog-prompt-template-cancel |
| modal-media | src/editor/media-adapter.ts — Crepe粘贴入口→stageClipboard；无独立资源管理窗 | MISSING / R4；保留媒体暂存/引用/历史能力；独立管理窗缺失由R4补，不能将演示refs=0视为生产可删除。 | NOT_RUN / 候选测试未跑 |
| modal-deleteMedia | src/editor/media-adapter.ts — 无已验证的独立资源删除对话框 | MISSING / R4；media.remove存在不等于606历史资产可由新UI安全删除；须先定义引用/版本归属门禁。 | NOT_RUN / 候选测试未跑 |
| modal-batchOptions | src/cards/CardDraftForm.vue — addOption/removeOption/moveOption；无批量选项弹窗 | MISSING / R4；保留2–100稳定optionId和答案校验；批量输入需要R4接入解析预览。 | NOT_RUN / 候选测试未跑 |
| modal-promptManager | src/cards/CardDraftForm.vue — 复制 Prompt→Prompt 模板 details | BUSINESS_ADAPTED / R4；管理从独立modal改为Prompt对话框内details，不删除模板能力。 | PASS / production-dialog-prompt-template-cancel |
| modal-newKnowledge | src/components/MindMapWorkspace.vue — 新增下级/同级/根→MindElixir公开hook→真实tree apply | BUSINESS_ADAPTED / R5；原型新建命名modal与正式原生节点编辑不同，UI创建/命名取消待R5专项。 | NOT_RUN / 候选测试未跑 |
| modal-batchExport | src/unified/UnifiedCardBatch.vue — 多选→导出选中卡片→UnifiedCardExchange内联预览 | BUSINESS_ADAPTED / R3；正式不是相同modal，真实媒体/知识闭包+回执。 | NOT_RUN / 候选测试未跑 |
| modal-batchDelete | src/unified/UnifiedCardBatch.vue — 移到回收站→native confirm→remove | BUSINESS_ADAPTED / R3；危险操作确认仍保留；原型自制modal与原生confirm样式不同。 | NOT_RUN / 候选测试未跑 |
| modal-permanentTrash | src/unified/UnifiedRecycle.vue — 没有606永久清除的已实现入口/专用typed命令 | MISSING / R6；不得将legacy删除路径绑定到606永久清除；R6先明确历史/媒体/备份风险。 | NOT_RUN / 候选测试未跑 |
| modal-historyDetail | src/unified/UnifiedCardDetail.vue — learning.history.get(eventId)→只读历史详情 | BUSINESS_ADAPTED / R3；原型generic示意没有真实历史；正式按eventId读取冻结证据。 | NOT_RUN / 候选测试未跑 |
| modal-demo | src/unified/UnifiedWorkspace.vue — genericDialog(交互演示)无生产对应 | MISSING / R4；通用demo提示非生产功能，必须逐具体业务按钮拆到R1-R6，不能实现万能demo弹窗冒充功能。 | NOT_RUN / 候选测试未跑 |
| knowledge-map-false | src/components/MindMapWorkspace.vue — nativeTree/view/selectedKnowledgeId/expandedNodes; .mind-workspace | MISSING / R5；原型12节点/显示28；正式业务节点数来自服务，gank-root仅展示根不能计数。 正式父组件固定expanded，普通态入口不存在；全屏补测不能冒充普通态。 | NOT_RUN / production-knowledge-selection-hierarchy |
| knowledge-map-true | src/components/MindMapWorkspace.vue — nativeTree/view/selectedKnowledgeId/expandedNodes; .mind-workspace | BUSINESS_ADAPTED / R5；原型12节点/显示28；正式业务节点数来自服务，gank-root仅展示根不能计数。 | PASS / production-knowledge-selection-hierarchy |
| knowledge-outline-false | src/components/MindMapWorkspace.vue — nativeTree/view/selectedKnowledgeId/expandedNodes; .mind-workspace | MISSING / R5；原型12节点/显示28；正式业务节点数来自服务，gank-root仅展示根不能计数。 正式父组件固定expanded，普通态入口不存在；全屏补测不能冒充普通态。 | NOT_RUN / production-knowledge-selection-hierarchy |
| knowledge-outline-true | src/components/MindMapWorkspace.vue — nativeTree/view/selectedKnowledgeId/expandedNodes; .mind-workspace | BUSINESS_ADAPTED / R5；原型12节点/显示28；正式业务节点数来自服务，gank-root仅展示根不能计数。 | PASS / production-knowledge-selection-hierarchy |
| transfer-import-select | src/components/KnowledgeMarkdownExchange.vue — mode/source/preview/exported/selected/mount; dialog | BUSINESS_ADAPTED / R5；正式token/过期/CAS/取消不写，原型preview注入null并不等于真实预览。 | PASS / production-transfer-import-preview-cancel |
| transfer-import-preview | src/components/KnowledgeMarkdownExchange.vue — mode/source/preview/exported/selected/mount; dialog | BUSINESS_ADAPTED / R5；正式token/过期/CAS/取消不写，原型preview注入null并不等于真实预览。 | PASS / production-transfer-import-preview-cancel |
| transfer-export-select | src/components/KnowledgeMarkdownExchange.vue — mode/source/preview/exported/selected/mount; dialog | BUSINESS_ADAPTED / R5；正式token/过期/CAS/取消不写，原型preview注入null并不等于真实预览。 | FAIL / production-transfer-export-preview-cancel |
| transfer-export-preview | src/components/KnowledgeMarkdownExchange.vue — mode/source/preview/exported/selected/mount; dialog | BUSINESS_ADAPTED / R5；正式token/过期/CAS/取消不写，原型preview注入null并不等于真实预览。 | FAIL / production-transfer-export-preview-cancel |
