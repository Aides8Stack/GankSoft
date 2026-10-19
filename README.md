# GankSoft v0.7.2 RC

基于已核验的v0.7.1 RC2增量优化：导图工具栏和编号命名、知识关系编辑移除、知识点学习工作台、页面连续关闭与全部关闭、错题编辑图片和作答图片证据、剪贴板失败处理。程序/源码统一版本0.7.2，schema601、v060/data、内容协议2.0保持。

本版为RC候选版。Windows10/11真实验收尚未执行；Linux与静态验证不能代替Windows。最新设计、验证与实机清单见docs/v0.7.2-*；其他版本文档仅供追溯。

## 使用

Windows x64 用户完整解压可执行包，双击 `GankSoft.exe`。保留全部 DLL、resources、locales 文件；运行软件无需 Node.js。包内带有图片解码库和对应 VC 运行库。

v0.6.x 使用独立的 `v060/data` 数据目录，首次创建新数据库。本版将 v0.6.0—v0.6.4 的 schema600 会话数据在事务内升级为601，保留原有草稿和学习数据；完整备份支持600/601。升级前建议先导出完整备份；升级后的数据库不能交给旧版程序打开。v0.5.x数据库及旧内容协议仍不兼容。删除软件目录不会删除用户数据。

关联知识点时打开思维导图，支持多选已有节点、新增一级/子知识点和搜索定位。

支持错题卡、记忆卡、文件夹与卡片集、共享材料、图片、知识树、筛选和批量操作、到期/手动学习、草稿恢复、逐次历史与多维统计、独立调度配置、回收站和完整备份恢复。

内容交换支持 `.gank.json` 和 `.gank.zip`；完整备份使用 ZIP。两者格式不同，不能混用。AI 是可选功能：需自行配置，每次发送材料前确认，密钥不进入学习备份。

## 开发与验证

开发环境：Node.js 24+、npm、Windows x64 或 Linux x64。

```bash
npm ci
npm run check
npm run smoke
npm run test:package
```

`npm run check` 包含业务测试、协议测试、边界检查、契约类型检查、JSON Schema 导出和生产构建。Linux 打包测试使用无界面 Electron；`--no-sandbox` 仅用于测试容器，生产窗口启用 sandbox/contextIsolation 并关闭 nodeIntegration。

在 Windows x64 执行：

```powershell
npm ci
npm run package:portable:win
```

跨平台打包时，显式传入与 `@napi-rs/image` 同版本的官方 Windows x64 原生包目录：

```bash
node tools/package-windows.mjs /path/to/image-win32-x64-msvc-package
```

成品实机测试入口：

```powershell
powershell -File tools/validation/windows-test.ps1 -ExePath C:\GankSoft\GankSoft.exe -ExpectedOs win11 -ZipPath C:\GankSoft-v0.7.2-RC-Windows-x64.zip
```

Win10 机器使用 `-ExpectedOs win10`。测试工具需要 Node.js 和源码开发依赖；普通软件使用不需要。自动化通过后仍须完成`docs/v0.7.2-windows-acceptance.md`中的 30 项人工验收，再执行 `npm run release:verify`。

## 结构与文档

- `src/`：Vue 界面和类型化服务门面，不导入数据库或 Electron 后台模块。
- `shared/protocol/`：公共方法注册表、严格 Schema、UUID 内容版本、客户端和状态机。
- `electron/protocol/`：协议适配、回执、事务与系统操作协调。
- `electron/modules/`：复用并改造的领域服务；SQL 和文件访问留在后台。
- `electron/infrastructure/`：新数据库、图像验证、安全 ZIP 和恢复日志。
- `docs/IMPLEMENTATION-v0.6.0.md`：实现说明、边界和已知限制。
- `docs/v0.7.2-validation.md`：本版实际验证记录；`docs/v0.7.2-windows-acceptance.md`：Win10/11待验矩阵。
- `docs/protocol/contracts-v2.json`：从运行时 Schema 导出的 65 个方法契约。
- `docs/reuse-ledger.json`：对 v0.5.1 的逐文件复用记录。

`docs/archive/` 仅用于追溯历史设计，不是 v0.6.0 运行要求。

版本存档的发布/独立导出功能及模块已移除；导入协议中的archives结构仅用于知识树传输、来源映射与旧包兼容。卡片集ZIP是内容交换包，不是包含复盘历史的完整备份。详见`docs/collection-exchange-v071.md`。
