# GankSoft v0.7.4-rc.1 — Pipeline v4

本分支实施流水线v4，应用版本以package.json为唯一来源。分阶段审计/迁移/人工配置/发布与恢复见[docs/ci/ARCHITECTURE.md](docs/ci/ARCHITECTURE.md)、[MANUAL_CONFIGURATION.md](docs/ci/MANUAL_CONFIGURATION.md)、[RELEASE_OPERATIONS.md](docs/ci/RELEASE_OPERATIONS.md)。当前未合并，GitHub/Windows/Release验收不得从文件存在推断成功。

以下v0.7.3业务说明与历史验收保留供追溯，不代表本次流水线已通过远程验收。

# GankSoft v0.7.3 RC

GankSoft 是面向公务员考试的本地 PC 学习软件，提供错题复盘、记忆积累、知识点树、逐次学习记录和完整备份恢复。

本版基于 v0.7.2 RC 增量开发，新增题目与知识点联合复习、分级参数配置、安全的现有计划提前机制和配置界面。应用版本 **0.7.3**，数据库 **schema604**，数据目录继续使用 **v060/data**，内容交换协议保持 **ganksoft.content 2.0**。

**当前为 RC 候选版，Win10/Win11 实机验收尚未完成。Linux 自动化和 Windows 包静态校验不能替代实机通过。**

## 本版功能

- 卡片集默认策略与单卡独立策略统一解析，显示有效值和来源；单卡独立最大间隔可大于集默认值。
- 每日到期额度按不同卡片 ID 计数，同日重学与额外专项分别计预算。
- 卡片集级 FSRS 目标保持率、推荐预设与权重、知识点专项偏好和高级证据参数。
- 当前内容版本的全部适用历史参与诊断，采用时间衰减、同题同日去重、跨题跨日可信度和明确错误归因；诊断指标不是掌握概率。
- 联合队列先判断合法到期资格，再进行逾期保障和推荐排序；额外专项明确作为练习，不推进 FSRS。
- 保存策略默认只影响下一次有效复盘；提前现有过长任务必须先预览、再确认，只提前、不延后，并支持条件撤销。
- 保留原有卡片管理、知识点学习工作台、多页复盘、题目与作答图片、历史记录、筛选、导入导出和完整备份功能。

## Windows 使用

完整解压 Windows x64 包，双击 `GankSoft.exe`。保留全部 DLL、`resources/` 和 `locales/` 文件，不要单独复制 EXE。普通运行无需安装 Node.js 或 npm。

### 升级与备份

升级前先在旧版导出**完整备份**并退出软件。

本版沿用 `v060/data`，数据库从 schema601 依次增量升级至 602、603、604；schema600 先升级至601。保留既有卡片、策略和学习历史，不重新创建用户数据空间。完整备份支持 schema600—604 的恢复升级。

**旧版程序不能直接打开升级后的数据库；回退须使用升级前的完整备份。**

内容交换支持 `.gank.json` 和 `.gank.zip`；内容交换包不包含完整复盘历史，不能代替完整备份。AI 为可选功能，不是基础学习的前置条件。

## 开发与构建

需要 Node.js **24 或更新版本**和 npm。

```bash
npm ci
npm run build
npm start
```

也可以在安装依赖后使用 `npm run dev`，该命令会先构建再启动 Electron。

### 检查与测试

```bash
npm run check
npm run smoke
npm run smoke:v071
npm run test:package
```

`npm run check` 包含业务测试、协议测试、边界检查、契约类型检查、JSON Schema 导出和生产构建。

本版专项界面测试脚本：

```bash
npm run build
node tools/smoke-v073.mjs
```

历史测试文件名中的 v060、v066、v070 等是测试族名称，不代表当前应用版本。

## Windows x64 打包

在 Windows x64 开发环境执行：

```powershell
npm ci
npm run package:portable:win
```

打包依赖与 `@napi-rs/image` 版本一致的 Windows x64 原生插件，以及 `vendor/windows-x64/` 中的运行库和来源记录；这些 vendor 文件应保留在源码仓库。

跨平台打包时，先完成构建，再显式传入对应的官方 Windows 原生包目录：

```bash
npm run build
node tools/package-windows.mjs /path/to/image-win32-x64-msvc-package
```

打包后必须检查实际最终 ZIP，不能只检查压缩前目录。工具见 `tools/build/zip-windows.py` 和 `tools/validation/verify_delivery.py`。

## 验证状态

本版交付时的实际记录：

- 最终自动化测试 **198 项通过**；另有 21 项协议重跑。
- 类型、边界、**75 项公开方法**契约导出与生产构建通过。
- Linux Electron ASAR 回归通过，包括既有图片、导入、备份恢复和本版配置流程。
- Windows 包 EXE、产品和 ASAR 版本均为0.7.3；87个构建文件一致、运行库结构及最终 ZIP CRC/完整清单校验通过。
- **Win10、Win11 实机均为 `not_run`，未正式放行。**

这些是交付时的测试记录，后续修改代码后应按影响重新验证，不能沿用旧结果。

实机脚本示例：

```powershell
powershell -File tools/validation/windows-test.ps1 -ExePath C:\GankSoft\GankSoft.exe -ExpectedOs win11 -ZipPath C:\GankSoft-v0.7.3-RC-Windows-x64.zip
```

Win10 改为 `-ExpectedOs win10`。测试工具需要源码依赖，普通运行不需要。两系统须使用同一交付包，重新完成 **W01—W40** 自动化与人工签核后，才执行 `npm run release:verify`。

## 源码结构

- `src/`：Vue 界面、会话和类型化服务调用。
- `shared/`：公共契约、证据模型、预算和队列纯函数。
- `electron/modules/`：复盘、配置、到期资格、诊断、内容和知识点领域服务。
- `electron/protocol/`：协议适配、回执和事务协调。
- `electron/infrastructure/`：数据库迁移、备份恢复、图片和容器校验。
- `tests/`、`tools/`：自动化测试、构建、打包和验证脚本。
- `assets/`、`public/`、`examples/`、`LICENSES/`、`vendor/`：构建资源、测试样例、许可及必要运行库。

`node_modules/` 通过 `npm ci` 恢复；`dist/`、`dist-electron/` 和 `out/` 是生成产物，不需要提交到源码仓库。保留 `package-lock.json`、示例 ZIP 和 `vendor/windows-x64/` 中的 DLL。

## 当前文档

- [实施与设计对照](docs/v0.7.3-implementation.md)
- [实际验证报告及边界](docs/v0.7.3-validation.md)
- [使用说明](docs/v0.7.3-user-guide.md)
- [Windows W01—W40 验收](docs/v0.7.3-windows-acceptance.md)
- [公共 API 索引](docs/protocol/API-INDEX.md)
- [运行时契约导出](docs/protocol/contracts-v2.json)

原始需求位于 `docs/v0.7.3-input/`。其中的“待实现”是需求编写时状态，实际实现与验证以本版实施、验证文档为准。其他版本文档和 `docs/archive/` 用于追溯历史。
