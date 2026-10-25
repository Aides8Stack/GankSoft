## 显示工作区故障已定位并本地修复

真实诊断证实Linux无头screen.workArea为1×1，窗口归一化将应用压成1×1，导致导航点击无命中。E2E状态隔离不是该故障根因，已纠正此前假设。窗口帮助器把无效/未就绪桌面（含0或1×1）回退为1460×960；正常小屏640×480和移除显示器仍按真实边界保护。窗口单元3/3和构建PASS；原失败tools/smoke-knowledge-filter.mjs四个原业务场景真实PASS，没有删断言、force点击或增加超时。临时诊断已移除。

c35298b的CI40200339283：Windows质量PASS（含原生正常位置、最大化/还原与进程重启），Ubuntu仍为同一ASAR点击失败。大树全源码已保存f9ef54b3b0fa9202f9ca4016fab1a20ffafef224/tree def8ea1c5a9eefc4660f302a4ff67e1045e18205，独立fetch核验本地168dcc1树一致；Run40201510884首次in_progress。现在继续必要ASAR和完整宽窄视觉采集/Windows审阅，不等CI、不进入未准入S8。

# S7.f 当前验证摘要

合成隔离606数据；生产schema604未变，Linux结果不代表Windows人工验收。原始日志和截图不上传到源码，仅保留以下非敏感结论。

| 项目 | 结果与范围 |
| --- | --- |
| 继承S0–S7.e | 业务384、内容交换7、协议21/133、工作台17、Linux ASAR13/107；按改动影响继承，非本轮重跑 |
| 设置/原始历史证据 | 单元3、Electron5、CI基础5；c1bcbc02的CI40173592122两平台/pr-gate PASS |
| Windows设置截图 | CI40173592122的artifact12591835832，1366/720已查看，中文可读、无控件溢出；只代表设置页 |
| 原生窗口 | 单元3/3、构建PASS；Linux原生getNormalBounds为0，BLOCKED；Windows初次CI夹具失败（680低于720最小值），修复为支持尺寸，保留精确断言 |
| 修复CI | c35298b35a5cdb44df79b46a418580931de72c38 / Run40200339283，首次queued；没有等待/轮询。Ubuntu ASAR点击失败已隔离E2E视图状态，根因/修复效果仍待复验 |
| 大树/知识Markdown业务 | node --experimental-strip-types --test tests/knowledge-layers-v075.test.ts tests/unified-knowledge-v075.test.ts tests/knowledge-markdown-store-v075.test.ts tests/knowledge-markdown-media-v075.test.ts：PASS27/27（新增大树4） |
| 协议 | npm run check:protocol：PASS21，135方法、边界/类型/导出一致 |
| 构建 | npm run build / build:editor-spike PASS；最后完整模型搜索补丁重建/专项PASS |
| 大树Electron | tools/knowledge-spike/layers-smoke.ts PASS7；2134节点只取roots/children/路径、只读正文、冲突/重载、CAS保全、全屏1366/720和焦点。补充未保存模型搜索断言也已通过 |
| 原知识Electron | tools/knowledge-spike/smoke.ts PASS10，errors/external空，含真实拖拽/撤销/正文/失败回执/重启/MD/图片/大纲 |
| 工作台相关回归 | tools/workspace-spike/smoke.ts 本轮PASS17，errors/external空；可选截图超时仍记BLOCKED |
| 完整中文视觉 | BLOCKED 当前Linux无CJK字体；Windows设置页已补验，其余页面待真实截图 |
| Win10/11人工/最终便携同包 | NOT_RUN；未生成正式Release、未生产激活 |

构建和共享资源Electron必须串行；无失败删减、测试跳过或放宽门禁。首个未完成见RECOVERY-NEXT.md。
