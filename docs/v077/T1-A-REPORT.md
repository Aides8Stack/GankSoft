# GankSoft v0.7.7 T1-A 核心模块真实操作测试

状态：IN_PROGRESS。恢复基线：`0d0c072117dfed45f6463789fb289e2153a18409`。

范围：app / catalog / cards / editor / learning，所选 10 CASE；只补测试工具，不修改生产业务。

环境：Linux x64，Node 24.22.1，Electron 44.9.1，package.json 实际版本 0.7.6（v077 为开发阶段名），Schema606 隔离夹具。远端分支无 Actions run，未找到可恢复 Artifact；首次 npm ci/build，410 个输出哈希通过，再次 prepare 为 REUSED/REUSED_VERIFIED。

脚本预先提交后才运行正式 CASE。当前尚未运行这 10 CASE；已有 8 条 Linux 历史 PASS 不记为本轮通过。执行后在本文件补真实 SHA、逐 CASE 结果、缺陷与后续模块。

新增模块脚本：scenarios/app.mjs、catalog.mjs、cards.mjs、learning.mjs、core-support.mjs；clipboard.mjs 补 CLIP-02。唯一 registry 注册 10 CASE；共用原有 runner/helpers/606 fixture。OLD-01/REVIEW-01 的已发布错题由 fixture 在启动前生成，受测操作由 GUI 完成。网页粘贴采用原生剪贴板 HTML+文本、真实 Ctrl+V，不能冒充 Windows 物理浏览器选择复制。

日志/截图/只读数据库快照保留在 validation-results/v077/runs；Git 仅保存脱敏摘要与哈希。反馈 DOM mutation trace 只观察，不延迟或修改业务请求。

基础设施预检说明：普通 Git HTTPS push 无凭据失败，后续使用 GitHub Git Data API 原 tree + parent + 非强推保存。一次误启动的预保存试跑不用于验收，暴露诊断快照循环引用；已最小修复测试证据序列化，生产业务未改。正式结果仅来自远端保存后的 SHA。
