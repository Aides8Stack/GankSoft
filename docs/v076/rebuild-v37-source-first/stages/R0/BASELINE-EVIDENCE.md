# R0 基线证据 — Linux 实际采集，视觉未验收

源码生产指纹与本地parent `c074dfa33dc4786fdd77e6215b470baae1433c4f`、已核实远端 `acc977dc1ddf7583617995d96157066300e11a05` 见 `evidence/matched-v1/manifest.json`。本地parent与起始远端 bccf6ff9 的 tree 完全相同；本轮未改 src/electron/shared/锁文件，采集脚本属于WIP。脚本最终版本在此检查点提交，命令和失败演进见 TEST_REPORT.md。

`node --experimental-strip-types tools/validation/r0/capture.ts` 最终退出0：3组验证、36张PNG，原型与production606各6页×1500/1366/900宽、高900、deviceScaleFactor=1、zoom=1。同Electron44.9.1、字体栈和宿主Noto Sans CJK SC。所有图的SHA256、实际inner/outer尺寸、BrowserWindow bounds/contentBounds、displayScaleFactor、字体状态、DOM与匹配CSS规则均保存。`collect.py` 核验后保留36张原像素、36个gzip DOM/CSS快照、18张无缩放并排WebP和diff.json。

真实生产入口 `electron/main.ts → src/main.ts → UnifiedWorkspace.vue`，页面URL断言 `gank-app://ui/index.html`。数据为隔离Schema606真实服务生成；不是前端mock。原型仍是冻结只读HTML，未改源码、DOM遮罩或强行替换数值。

## 状态与数据等效边界

| 页面 | 已匹配/实际采集 | 待核语义与差异 | 责任 |
|---|---|---|---|
| overview | 真实5集/242卡/53到期/18今日，与原型四数字一致；真实暂停会话 | 原型显示五集，正式中部显示两文件夹；最近学习条目/顺序不同；侧栏原型显示due、正式显示total | R0补语义映射；R1/R2实现 |
| deck | 言语理解真实86卡/24到期/28知识；计划与快捷入口 | 原型76%与真实累计复盘/平均自评不同；原型近期卡片固定样例，正式按真实时间/ID排序 | R0明确等效策略；R2 |
| editor | 同一question标题、题干、四选项、答案与解析；正式Crepe | 标题/所属集行、正文宽度、选项行密度、固定底部发布区差异；qa/direct等状态另验 | R4 |
| review | 同集question、answer、真实暂停会话 | 原型reviewQuestion自身固定题干与editor不同；正式按真实内容；计时/按钮/区域需进一步归一 | R0/R4 |
| knowledge | 真实28节点/正文/关系、原型图谱都已拍 | 原型实际小树节点数与其显示28不自洽；正式全屏与原型普通态不等价；须补普通/全屏成对状态 | R0/R5 |
| settings | 两版各自默认设置实际拍摄 | 原型general和正式appearance非同分类；通用/关于缺UI、回收站位置、横/纵导航结构差异 | R0/R6 |

因此**采集 PASS，严格同状态视觉验收不是 PASS**。已检查1366px overview/editor/settings并排和1500px真实图谱，有明确MAJOR/BLOCKER差异；未审全图为NOT_RUN。diff.json不使用像素阈值伪造接受结论。

额外 `reference-states.mjs` 枚举52个原型DOM状态，涵盖13主路由/三模式/复盘阶段/6设置分类/15弹层/图谱视图与传输步骤。其PASS只表示原型DOM生成和弹层存在，不能替代生产交互/端到端验收。

首轮图片因宿主缺中文字体被拒为最终证据，补字体后重新采集。字体下载来源和SHA256见font-environment.json；字体文件不入仓。Windows/Win10/Win11/IME/缩放人工验收 NOT_RUN。

## 补充同状态参考（未替换旧证据）

reference-states最终脚本额外采集6张PNG：settings-appearance与knowledge-map-fullscreen各三宽，另建6张无缩放并排图；metadata/hash见supplemental-reference.json。与生产既有appearance和全屏图谱配对，避免将默认分类或普通/全屏差异混成布局结论。原型知识实际小树与显示总数不一致、review内容/暂停/揭示等严格等效边界仍需核实。原36图及其manifest不覆盖、不重命名冒充新图。

## 本轮语义有效性补证

旧103个二进制证据哈希/生产指纹全部相同，未重拍。18个新增语义场景17PASS/1FAIL，见semantic-v1/result.json。精确原型森林实际为12节点；旧28节点图只能作为规模证据，不能标图谱同数据逐节点视觉PASS。原型三个result枚举是非answer分支别名，不是可达提交结果；正式独立result必须另行标注。设置缺项和额外功能已逐项核对。只读知识路径会产生序列化文字/修订变化，仍阻断R0；缩小路径未复现不等于修复。
