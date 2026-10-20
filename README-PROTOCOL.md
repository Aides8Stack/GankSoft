# GankSoft 内部协议基础代码

本包基于 v0.5.1 源码增量增加内部协议 1.0，供 v0.6.0 后续开发使用。它不是正式 v0.6.0 程序发布，应用版本仍为 0.5.1。

- 25 个严格输入输出契约，19 个已接真实后台业务。
- 新增类型安全前端客户端和受限 IPC 入口。
- 统一数据代次、请求、错误、幂等回执、并发校验。
- 实现并验证调用状态机，复盘保存接入学习状态转换。
- 提供自动导出契约、类型负向测试、边界检查及真实数据库回归。

详细模块职责、调用关系、API、状态图、已实现范围及后续迁移门槛见 `docs/protocol/architecture-api-state-machines.md`。

新接口入口是 `src/protocol.ts`。旧页面仍使用 `src/api.ts`，旧入口尚未关闭。六个保留 API 明确返回不可用，没有冒充功能已完成。当前适配器使用既有 v0.5.1 评分和策略规则，不把设计报告的未来规则自动混入。

```sh
npm ci
npm run check:protocol
npm test
npm run build
```

本轮 Linux 验证为 146 项测试通过，其中 125 项基线测试、21 项新增协议测试；类型、协议边界、JSON Schema 导出和编译构建通过。见 `validation-results/protocol`。

安装依赖时的 Electron 下载需要可访问官方分发源。构建输出仍有大于 500KB 的已有前端分包提示。Windows 打包脚本已加入 Zod 运行时依赖，但本轮未生成或运行 Windows 成品。

完整源码、锁文件、Zod 许可证及新增文件清单包含在此包中。为避免误认历史校验清单，包内 `SHA256SUMS.txt` 是本次重新生成的文件哈希清单。

## 统一图片节点（schema605，恢复分支扩展）
`content.question.save`、`content.memory.save` 的 images 使用稳定实例 id、role 和可选 layout。layout 保存 widthPx(64—2400)、alignment、fit，以及可选 edit：crop为原图归一化矩形、rotation为0/90/180/270、flipX/flipY、最多20条纯文字批注（每条120字符，位置相对最终画面）。原图字节不变。已有实例可通过 replacementId 绑定当前卡片集/用途的新草稿；保存后实例和布局保持，旧历史仍引用旧文件，素材变更更新内容版本。未使用的可选字段须省略，不能发送undefined。
内容交换保持 `ganksoft.content` 2.0；每张卡片最多40张图，包最多1000张。图片支持question/analysis及question卡的option-A—D；记忆卡仅question/analysis。JSON图片包含mime/base64、可选layout/sha256；导出总是带完整布局和原图SHA-256。ZIP用独立二进制替代base64，保留其余元数据并校验manifest；禁止任意路径/多余字段。旧包缺省布局按360px左对齐contain处理；显式允许更新导入时，同位置/角色/哈希复用实例，布局更新不重置学习。
完整备份仍可保存故障现场；恢复安装前在隔离staging严格检查业务数据库、当前/记忆/草稿/两类历史图片、布局、引用与受管原图哈希。失败保留当前数据，拒绝替换。缩略图为可重建缓存，不是备份内容。引用解除不即时删除原图；外层事务未提交时回收站返回待清理数，独立维护在写锁下重查所有引用后回收。Win10/11人工验收需另行签核。
