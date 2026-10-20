# Pipeline v4.0 实施与验收
分支 infra/pipeline-v4；基线 c8db715d33265bdf8e2edd05f0f14a35b97de8ac；版本0.7.4-rc.1。
P0–P5代码实施及阶段测试DONE，独立提交并远程ref+tree核验。P6本地验收DONE；真实GitHub合并/自动RC/Windows验收BLOCKED（需要用户配置保护并人工合并）。不把代码完成写成上线完成。
产品改动仅版本单一来源（后端去硬编码）；不合入图片PR#2。旧PR#3被v4功能替代但未关闭。禁止自动修改main/develop、合并、公开、Stable。
风险分类对全部非文档保守执行完整双平台质量回归，后续有真实测试映射后再缩小；PR从不制作Windows安装器或便携包。

## G0–G1 Windows 权限审计解阻（2026-10-20）
继续既有 infra/pipeline-v4 任务，不重复初始化。先核实远程 db5a5ea 和 PR #4，复现 LF PASS / CRLF FAIL；仅将 auditWorkflows 改为 yaml 结构化 fail-closed 审计，保留既有测试并追加正反例。复用既有 yaml，不改依赖/业务/工作流。分两次检查点：故障代码和测试；Actions 一次查询确认后必要交接。执行 pipeline、ci:quality、安全与差异检查；不等待 CI、不实施 G2–G7。
