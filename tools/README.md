# v0.5.0 测试入口

当前发布门禁：npm run check 与 npm run smoke:v050。默认 npm run smoke 指向 v0.5.0。

- smoke-audit-v050：保存故障、双击、计时行为、失效题跳过、图表只读和窗口宽度。
- smoke-chart-v050：60/120 条同值记录，两类图表逐点鼠标与键盘验证。
- smoke-protocol-v050：真实 IPC 错误码、字段错误、损坏图片拒绝及有效图片重试。
- smoke-import-scope：导入隔离、重复导入、切集清空预览、导入后立即可学习。
- smoke-direct-study：当前直接学习流程，版本从被测 package 读取。
- smoke-reliability-v048：当前门禁仍执行的可靠性场景，包括 UI ZIP 恢复、响应丢失重试、版本冲突及原稿续学。
- validation/package-check：Linux x64 ASAR 及原生图片解码依赖检查。

其他按旧版本命名的脚本保留历史用途，不自动代表当前版本验收；不要以某个历史脚本通过替代当前门禁。

Windows 安装与打包请在 Windows 执行 npm ci、package-win.cmd。自定义 build-release.py 需要匹配版本的 Windows 原生图片依赖，否则会明确拒绝生成不完整包。
