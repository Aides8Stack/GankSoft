# 仓库审计与风险（2026-10-19）

## 核实边界
通过已连接 GitHub API 读取私有仓库 Aides8Stack/GankSoft，固定源码基线为 a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
本任务运行于 Linux / Node 24.19.0 / npm 11.9.0。起始目录无源码检出且不是 Git 工作区；因此“当前本地分支/HEAD/工作区干净”不适用，不能伪称已检查完整 clone。
git status --short --branch、git remote -v、git log -8 --oneline 均报 not a git repository；git ls-remote HTTPS 因缺私有仓库终端凭据失败。
后续使用 GitHub Git 对象 API 原位追加提交；本地 audit-snapshot 只是固定 SHA 的选定文本检查副本，不是重建的仓库。
远程读取确认 feature/unified-image、develop、main 初始均为 a0fb65d89b7273c6f06beb763e66b3c4d1899a05，与旧聊天中分支值不同。
最近历史：
- a0fb65d89b7273c6f06beb763e66b3c4d1899a05：docs: correct GankSoft README
- 516edc6d191a4be95a9fc1979fb1ce1afc2a6ff0：chore: merge GitHub initial repository
- 8ff98deff88f8295abd68ee06ca3c31649fb32ea：chore: initialize GankSoft v0.7.3 RC
- 3bb64b61422d535a633da5baeca82b5efb569e2b：Initial commit

递归 tree 未截断，含 323 个 blob。未发现 AGENTS.md、docs/development/ 或 .github/；存在 README.md、README-PROTOCOL.md、CHANGELOG.md、历史设计和测试报告。保留全部既有文档。
GitHub 元数据授予 push/admin；仅说明权限，不等于实际提交成功。初始无该 feature 的 open PR；PR 创建未实测。CLI push 不可用；API 保存结果见 HANDOFF / 后续检查点回执。

## 架构和证据入口
| 路径 | 已读取/确认的职责 |
| --- | --- |
| package.json | 0.7.3，Node>=24；Vue3/TypeScript/Vite/Electron，zod，ts-fsrs，@napi-rs/image，yauzl/yazl |
| src/services.ts → shared/protocol/client.ts、registry.ts | 类型化调用、输入整理、回执/未知结果恢复 |
| electron/preload.cts → electron/main.ts | gank.protocol → gank:protocol；文件/剪贴板 stage 与 app-media 读取 |
| electron/protocol/、electron/application.ts | 网关/SQLite 协调与领域分派；不是独立 HTTP 后端 |
| electron/infrastructure/database.ts、schema.ts | Node node:sqlite / DatabaseSync，assets 表目前无显示尺寸列 |
| src/store.ts、src/composables/ | 状态及会话入口（目录确认；细节继续 P1） |
| electron/infrastructure/backup.ts | 数据库及当前/历史图片备份依赖 |
| docs/v0.7.3-validation.md | 历史记录声称 198 项通过；本轮没有重跑，不能继承 PASS |

## 图片调用关系（初审，完整覆盖留给 P1）
- QuestionEditor.vue 使用 ImageAttachments.vue，保存时 images.map 只保留 id/role。
- ImageAttachments 的 EditableImage 仅 id/role/draft；单个 width=ref(360) 给所有 figure，尺寸不是每图模型字段且没有保存。
- services.media.stage → registry 的 media.stage → main.ts stageOperation → media/drafts.ts stageImage → images.ts validateImage / image-binding.ts 原生解码。
- content.question.save 的严格 images schema 仅 id/role；saveQuestionImages 接收同样引用；questions/service.ts addAsset 将六列写入 assets。
- app-media://asset、draft、history 分别读取当前附件、草稿、历史快照；资源标识不能混用。
- ReviewWorkspace.vue 直接 image-grid；ReviewRecordDetail.vue 单独渲染历史 response 图片；ImageViewer.vue 是临时查看缩放/旋转，不是卡片内持久显示尺寸。
- shared/protocol/data.ts 的 responseImages 当前是 ID 数组；media/drafts.ts responseImages 生成历史引用；sessions/events.ts 转发草稿图片。
- export.ts、imports/protocol.ts、backup.ts 为交换/恢复边界；修改模型必须覆盖它们。
- MemoryEditor.vue 未出现图片组件；不能凭“统一”一词擅自增加记忆卡图片业务能力。其他列表/学习入口必须在 P1 全文检索补齐。
- registry 另有 media.import/paste/remove；是否仍被调用及是否废除，需 P1 核实，不擅自宣布已统一。

## 测试与 CI
package.json 定义 npm test、check:protocol（协议测试/边界/类型/导出）、build；npm run check 串联全量。
已有 smoke、smoke:v071、test:package 和 node tools/smoke-v073.mjs。Windows 入口为 tools/validation/windows-test.ps1 及 release:verify。
本轮只运行不需依赖的边界检查和管理文档检查，实际结果见 TEST_REPORT.md。
目前无 CI。本次不部署未实跑的工作流；建议后续在具备完整 checkout 与依赖环境时验证：push feature/unified-image / PR 到 develop → checkout → setup-node 24/npm cache → npm ci → npm run check；permissions: contents: read，不上传用户数据库，不发布、不自动合并。
CI 为 Linux 自动检查，Windows 原生插件、DPI、剪贴板和中文输入需另行真机验收。需要 CI 时单独补辅助配置，不混入图片业务阶段。

## 风险清单
1. 高：UI/契约/SQLite/快照/交换多层尚无每图尺寸，单改滑块会丢失设置。P1→P2→P3 再接 UI。
2. 高：作答草稿和不可变历史须保存各自显示引用，不能修改共享原图或当前题目时污染历史。
3. 高：没有完整本地 checkout/依赖，本轮不能宣称全量构建、198 测试、Electron 或 Windows 通过。恢复任务须先补基线。
4. 中：完整备份、gank.json/zip、卡片集 ZIP、缺图和跨集隔离须分别验证；旧协议处理策略尚未设计。
5. 中：API 追加提交需要保留 base_tree 和父链并禁止 force；远程前移须重新核实。
6. 中：.gitignore 已覆盖依赖、产物、缓存、数据库、.env；忽略规则不能清除已跟踪秘密，也无法覆盖任意命名密钥。首次业务阶段仍需扫描实际 tracked 内容；本轮只审变更文本，未完成全仓秘密扫描。
7. 低：存在 .gitignore.copy，保留原文件，未擅自删除。必要的 examples ZIP/vendor DLL 必须继续跟踪。

## I0 复审（2026-10-19，覆盖当前状态）
feature HEAD=27d39307d9581334f906e02b2a62db85fe8f4cfc；develop=a0fb65d89b7273c6f06beb763e66b3c4d1899a05。329 blob 下载后按 Git 哈希验证；CLI 私有仓库认证仍不可用，通过授权 GitHub 连接器保存。
现有架构、版本与业务源码保持不变；现有 Windows 仅 portable，package-check 为 Linux 专用（显式 Linux 原生插件）；现有 Windows 人工脚本不可用于 windows-latest 冒充 win10/win11。
因此新增独立 Windows 自动化编排，复用已有支持 exe 参数且临时库隔离的 v060/system-v060/v072；不修改业务实现。
新增 quality workflow/脚本为已实现待远程验证；不再沿用上文“本次不配置 CI”的历史范围。
