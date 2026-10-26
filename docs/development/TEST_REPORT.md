## S8.a 预览/确认API与实际界面（2026-10-26）

已接通完整恢复的4个typed方法（open/cancel/confirm/status）和设置页的备份摘要、取消、独立全库替换确认、旧版转换确认及上次操作查询。专用restore-session仅对已有隔离606 control显式启用；确认方法不写旧业务DB的pending/成功回执，使用control持久确认hash/操作回执。确认后退役旧owner、按同control重开新连接并重建host，清空旧学习缓存后真实重载UI；响应丢失只能查询回执，不能自动覆盖重试。取消或过期确认不改变活动库，confirm完整payload/hash/请求ID/epoch绑定，重复并发与重启后回放不重复切换。增加保守剩余空间预检；own生成文件用r+ fsync兼容Windows写句柄要求。生产604/旧恢复入口未变。

验证：服务20+API4=24/24 PASS；协议21/边界/类型/导出139方法PASS，应用与隔离构建PASS，CI基础5/5；实际Electron恢复UI7场景PASS（文件取消、损坏拒绝、只读预览/确认隔离、离开清理、720布局、成功后真实reload+全表媒体事实一致+旧库保留、重载后操作查询），errors/external为空；原设置UI5回归PASS。新1366/720两张截图已实际看过，布局未见遮挡；Linux无CJK字体，不能宣称新恢复界面中文视觉PASS，须从新Windows CI取得两图复核。已接入原Windows质量链，无新工作流/超时上调/断言删减。

诊断提交1f6fee6的CI40247001997实际scope/Windows/Ubuntu/pr-gate全PASS；它没有复现旧40207324786的列拖拽失败，故只记本次回归通过、根因仍未确认，不虚称修复或随机故障。源服务检查点626ae46ac575fc395c970647f23bf1f7a08fa079已独立核验777文件，CI40247748859首次in_progress不等待。当前S8.a集成已本地闭环，Windows恢复UI/中文视觉待验，S8整体IN_PROGRESS，S9 NOT_STARTED；下一独立项S8.b外库只读扫描/独立deck追加规划，不跨库合并历史/FSRS。当前提交完整源码、测试、配置必须一起保存，不能仅保存文档。

## S8.a 受控恢复服务检查点（2026-10-26）

已实现同一owner/control租约内的完整恢复服务：确认绑定preview/hash/epoch/revision/全库替换及604转换；冻结旧连接与SQLite写锁，先制作并复验当前全库恢复点，再stage候选/媒体/历史、落盘并以唯一active.json提交。新generation不创建第二控制域，旧目录保留拒写，新epoch拒绝旧窗口。操作回执位于control而非被替换的DB；提交前失败原库保持不变，提交后响应丢失只返回已提交状态，不覆盖重试；新目录损坏/缺失禁止回退。604转换只在已授权隔离606 owner候选进行，生产604和旧公开恢复入口未改。

tests/full-restore-v075.test.ts20/20 PASS（7个真实子进程中断点、提交前ENOSPC注入、响应丢失、当前恢复点重建比对、全表/媒体事实一致、连续恢复和旧回执、候选媒体破坏）；原迁移30+备份预检4相关回归PASS，npm run build/协议边界PASS。首次回归暴露未激活目录的错误码顺序变化，已修正后原断言全部通过。未删除/跳过/放宽测试。Windows本轮尚未复验，真实Win10/11仍NOT_RUN。

首个未完成：S8.a公开typed API/预览与确认UI/成功后重开连接/状态查询与取消。服务已实现不代表T38全流程DONE。随后T39外库独立追加、T40目录迁移、T41回收站、T42全阶段故障验收；S8 IN_PROGRESS，S9 NOT_STARTED。Windows列拖拽仍FAIL待诊断；诊断检查点1f6fee6f7786cf59025316070c337193914e5f27已完整取回比对，首次查询无Run，不等待。本提交自身SHA/CI从Git和GitHub实时解析。

## 2026-10-26 恢复：Windows列拖拽门禁未解决

已核实9b1b16e3d0a68da6b091d022313639bb17b4a00c完整776文件保存；本地07a7c80树相等且无WIP。CI40207324786：Ubuntu/scope PASS，Windows/pr-gate FAIL。Windows121210985278的Artifact12604447465已下载校验。失败仅完整编辑器列拖拽指示线5秒等待；隔离适配拖拽、系统PNG及离线资源均PASS，ERR_INTERNET_DISCONNECTED是离线控制预期结果。不能将此记为随机故障或离线资源失败。相同1008×681长页面Linux实际鼠标专项PASS但未复现Windows根因；增加释放鼠标/截图前的目标、指示线、父元素和滚动坐标诊断，原5秒/8像素/drop/顺序断言保持。故障仍FAIL待Windows证据，不声称已修复。S7已有视觉准入证据有效；当前编辑器回归风险仍开放，S9不准放行。保存后不等CI，继续独立S8.a受控恢复。

## S8.a 预检检查点

S7 DONE且无需用户人工审图。S8已完成只读完整备份预检模块、共享摘要DTO与4个专项，构建/协议边界PASS；源码/测试必须完整保存。覆盖私有ZIP副本、604/606全表/媒体一致、旧事实不伪造、原/活动库不改、损坏拒绝和临时目录清理。实际受控恢复切换/外库独立追加/路径迁移/回收站最终整合仍未完成，S8整体IN_PROGRESS，S9 NOT_STARTED。下一入口是租约/epoch/唯一指针协调恢复，不能直接放开旧604入口的606拒绝。详情S8-ACCEPTANCE.json与RECOVERY-NEXT.md。用户提示余量22%，当前优先保存完整源码、测试和必要记录。

## S7正式准入与S8连续推进

S7 DONE：Windows原34图逐张审阅，3处真实缺陷最小修复；581e6a7f594def19fa8fc00393d7ddd989551076/CI40205235936全PASS，Windows artifact12603867444修复后10图逐张复核PASS。专项4场景含真实键盘、滚动和遮挡检查。逐图哈希/历史FAIL/修复PASS见S7-VISUAL-REVIEW.json。其余有效测试继承，无重跑/删减/放宽门禁。S8.a开始，S9未开始；真实Win10/11人工及最终同包仍NOT_RUN。当前唯一恢复入口见RECOVERY-NEXT.md，旧段为历史事实，不再代表当前阶段。

## 34张Windows截图逐图审阅与修复

已真实核实075069628dbf1d21c83732cbf0108f0916e3fea3 / CI40203150728四个Job全PASS，原PR13仍Draft。下载Windows artifact12603046107并核验ZIP SHA256；34张图片均逐张查看，对照OPEN-ME-v3.7及设计规范。中文全部可读；24张未见操作遮挡，其余发现三处实际缺陷：单选圆点与正文脱离、练习复选框与标签脱离、大纲工具栏遮住标题/窄屏目录首行。逐图文件hash与原始发现见docs/v075/S7-VISUAL-REVIEW.json，不能把旧图改标全PASS。

最小修复仅为radio/checkbox宽度和内联排版、按实际换行工具栏高度给大纲正文/目录留位。构建/隔离构建、CI基础5和复验专项4场景/10图PASS；Space切换单选/复选、方向键评分、底部保存按钮滚动可达、首个目录/标题无遮挡、键盘中文tooltip均真实操作。10张本地修复图也逐张查看，布局已修复；Linux缺CJK字体，修复后的Windows图像尚待新CI获取，不冒充Windows复验完成。专项已加入原Windows质量入口，无删测试/放宽断言/新流程。

首个未完成：保存当前全部修复源码与测试后，取得新Windows报告s7f-recheck/10图逐张复核。其余24张未变画面与已通过业务/协议/ASAR继承。当前S7仍IN_PROGRESS，S8/S9未开始；原Gate满足后自动连续推进，不需要用户审图，不等待/轮询CI。

# S7.f 验证摘要

使用合成隔离606数据，生产604未变。当前视觉/名称补丁基于已保存dff733d7a6eb02937643f4368a7180d6a8da2139；原始日志、数据库和截图不进入源码。

| 范围 | 实际结果 |
| --- | --- |
| 基线CI | Run40202042436 / dff733d7a6eb02937643f4368a7180d6a8da2139，两平台/Scope/pr-gate全PASS |
| 业务相关回归 | tests/knowledge-layers-v075.test.ts + unified-knowledge-v075 + knowledge-markdown-store-v075 + knowledge-markdown-media-v075：27/27（新增大树4） |
| 协议 | check:protocol PASS21，边界/类型/导出135方法 |
| 窗口 | 单元3/3；Windows真实正常/最大化/还原/重启/移除屏幕/损坏配置4场景PASS（CI40200339283、40201510884） |
| 1×1桌面故障 | 已本地复现screen.workArea=1×1；无效尺寸回退后原失败knowledge-filter4/4 PASS，无force点击或放宽断言 |
| 当前完整Linux ASAR | PASS13组107项，完成标记7fd3555e-878d-4645-b351-e561100a212a，无删减/跳过 |
| 原知识Electron | PASS10，真实拖拽/撤销/正文/失败回执/重启/MD/图片/大纲 |
| 大树Electron | PASS7；2134节点、初始50roots、分层分页/定位/只读正文/冲突/全树CAS保全，含未保存模型搜索保全、1366/720与中文焦点提示 |
| 工作台/设置 | 工作台17、设置5有效PASS；原始历史证据单元3，CI基础5 |
| 最后构建 | npm run build、build:editor-spike PASS，协议边界PASS；新增视觉CI编排基础测试5/5 |
| 最后视觉专项 | tools/workspace-spike/visual-smoke.ts PASS17状态/34采集，真实三模式作答/揭示与导航，图谱根名称断言PASS，errors/external空 |
| 图片实际审阅 | Windows设置1366/720与大树/tooltip1366/720已看，中文可读、全屏/控件边界PASS；Linux其余17状态已看布局但缺中文字体，完整中文视觉BLOCKED，待新Windows图片逐图审阅 |
| Windows10/11人工及最终便携同包 | NOT_RUN；未Release、未生产激活 |

继承S0–S7.e的业务/编辑器/图片/交换等有效证据，不以本轮少量修复重跑全量。构建与共享资源Electron严格串行。截图产出不等于视觉通过，当前S7 Gate未完成；恢复步骤见RECOVERY-NEXT.md。
