# GankSoft CI/CD v4.0 分阶段验收及故障注入清单

**规则：** 测试结果只由实际执行证据得出。以下全部默认 `NOT_RUN`，是给 Codex 的预期测试计划，不代表已经通过。每条记录需附被测 SHA、命令、运行环境、GitHub run/job 链接、PASS/FAIL/BLOCKED/NOT_RUN 与原因。

## P0：基础设施隔离与迁移

| ID | 测试操作 | 期望 |
|---|---|---|
| P0-01 | 检查真实 HEAD、status、远程和 PR #2/#3 | 审计记录与实际一致 |
| P0-02 | 新建基础设施分支 | 来源 develop，图片业务代码不混入 |
| P0-03 | 对比现存 workflow 触发条件 | 列出全部旧监听器和退役计划 |
| P0-04 | 无权限读取 Branch Protection / Environment | NEEDS_USER_ACTION，不虚构配置 |
| P0-05 | 检查真实 npm 脚本和 Node>=24 | 测试命令可执行 |

## P1：版本号治理

| ID | 测试操作 | 期望 |
|---|---|---|
| V-01 | 修改业务代码但 version 未变 | PR Gate FAIL |
| V-02 | 修改业务代码只改 package.json 不改 lock | FAIL |
| V-03 | 从 0.7.3 升为 0.7.4-rc.1 | 通过 SemVer 和 lock 一致性验证（前提是版本尚未被使用） |
| V-04 | 同版本号对应不同源码 SHA | FAIL，禁止覆盖 tag/release |
| V-05 | 两个并行 PR 使用相同下一版本 | 第二个 PR 在刷新 develop 后 FAIL，要求重新 bump |
| V-06 | 仅 README 改动无版本变更 | 文档门禁通过，合并后不自动发 RC |
| V-07 | 非法 SemVer、版本回退、重用 withdrawn Tag | FAIL |
| V-08 | 发布包内部版本、Inno Setup 元数据与 Release Tag 不同 | FAIL |
| V-09 | Work 任务提交前调用版本 bump 工具 | 正确更新 package.json 与 package-lock.json |

## P2：PR 唯一 CI 与风险分类

| ID | 测试操作 | 期望 |
|---|---|---|
| CI-01 | feature Push，无 PR | 不自动触发重型旧 CI |
| CI-02 | feature Push，PR 已打开 | 只出现一套 `pr-quality`，无额外 Push full CI |
| CI-03 | 连续提交 A/B/C | 旧 PR 质量检查可取消，新 Commit 必需门禁完整运行 |
| CI-04 | 两个 PR 同时更新 | 不互相取消 |
| CI-05 | PR 测试失败 | `pr-gate` 失败；不能合并 |
| CI-06 | PR Job 被取消或没运行 | `pr-gate` 不会误报成功 |
| CI-07 | 纯文档 PR | 几秒至数分钟级轻检查（不保证 GitHub 排队时间），无 Windows Package |
| CI-08 | UI 变更 | 类型/构建/UI 受影响测试通过 |
| CI-09 | 协议、SQLite、备份修改 | 执行领域完整回归，不能只跑静态检查 |
| CI-10 | 图片和原生依赖修改 | 原图、缩略图、备份、导入导出、安全、隔离回归 |
| CI-11 | 分类器读取 diff 失败/未知文件 | 保守全面检查，不绕过质量 |
| CI-12 | 旧 quality.yml 与新 workflow 共存时触发同 Commit | 测到并消除重复；验收前不允许发布 |
| CI-13 | 外部 Fork PR 使用只读 Token | 无 Secrets、无发布权限、不能直接发布 |

## P3：Develop 自动构建与 RC

| ID | 测试操作 | 期望 |
|---|---|---|
| RC-01 | 用户未合并 PR，仅 Push 功能分支 | **不**自动生成 Release |
| RC-02 | 用户手动合并授权 PR 至 develop | 自动触发唯一 develop RC 流水线，无 Work 参与 |
| RC-03 | Linux 全量测试失败 | Windows 打包/Release 被阻断 |
| RC-04 | Windows 全量测试失败 | Windows 打包/Release 被阻断 |
| RC-05 | 安全审计发现高危密钥/恶意依赖 | Release 被阻断，证据脱敏 |
| RC-06 | SQLite、图片、IPC、复盘回归测试成功 | 流程保留完整证据 |
| RC-07 | Windows 原生依赖缺失 | 构建失败且不上传成功包 |
| RC-08 | 安装后真实 exe 启动或卸载失败 | 阻断 Release |
| RC-09 | ZIP/安装器字节被篡改 | SHA256 失败，阻断 Release |
| RC-10 | 成功固定 SHA | Release 产生新的唯一 Pre-release，安装器+便携ZIP+SHA256SUMS+来源报告均可下载 |
| RC-11 | 自动创建 Draft 后上传异常 | Draft 可恢复，未发布半成品 |
| RC-12 | 发布失败后重新执行同 SHA、同 Version | 安全幂等，不重复上传、不覆盖冲突 |
| RC-13 | Tag 已存在且指向不同 SHA | FAIL，拒绝覆盖 |
| RC-14 | 普通用户的外部 Fork PR 尝试发布 | 被权限/来源门禁拒绝 |
| RC-15 | 正式版本未做 Win10/11 人工签核 | 自动 RC 可以按 RC 策略发布，不能当 Stable |
| RC-16 | GitHub Token 创建 Tag 后其他 push workflow 不触发 | 单次可信 Release orchestration 不依赖该二次事件 |
| RC-17 | 连续合并 A/B/C，pending 运行被替换 | 对账找出全部漏发版本并按可信 SHA 补齐 |
| RC-18 | A 版构建失败，B 版随后合并 | A 被明确记录失败；B 发行策略有记录，不能默默跳过用户要求的版本 |
| RC-19 | 同一 RC 运行的 report/metadata | 真实运行编号、完整SHA、Lock哈希和 Release 一致 |
| RC-20 | main 上手动 Stable 发布 | 真实同包 Win10/11 人工验收+人工审批缺一即 FAIL |
| RC-21 | Release 撤回或更名 | 需人工授权，不改变已发布二进制溯源 |

## P4：Work 中断、费用和恢复

| ID | 测试操作 | 期望 |
|---|---|---|
| WK-01 | Work 本地必要测试 PASS，Push/远程读回 PASS | 立即输出交接并退出，不等 CI |
| WK-02 | CI queued 超过 30 分钟 | Work 不轮询，GitHub 独立继续 |
| WK-03 | Windows Package 长时间运行 | Work 不等待，不消耗持续对话执行额度 |
| WK-04 | Work 中断后新会话恢复 | 真实 HEAD、交接文件与有效阶段检查点可恢复 |
| WK-05 | 一项本地必要测试失败 | 不宣称实现完成；修复或保存 WIP/FAIL，不伪造 PASS |
| WK-06 | Windows10/11 人工未执行 | 保持 NOT_RUN，不能发行 Stable |
| WK-07 | GitHub API 连接失败 | 保存本地修改并标记 REMOTE_NOT_VERIFIED，不能假称 Push 成功 |

## P5：公开前安全与权限

| ID | 测试操作 | 期望 |
|---|---|---|
| SEC-01 | 历史 Commit/Tags 密钥扫描 | 高风险项阻断公开，脱敏报告 |
| SEC-02 | 数据库/照片/题目资料及版权检查 | 存在泄露或侵权风险时阻断公开 |
| SEC-03 | Actions logs/旧 artifacts/历史工作流写权限 | 可追溯审计记录 |
| SEC-04 | 普通外部账号对原仓库 Push | 无写入权限 |
| SEC-05 | 未授权用户尝试合并 develop/main | 受保护分支拒绝 |
| SEC-06 | 未授权 PR 尝试访问 Secrets、发布 Release | 禁止 |
| SEC-07 | 发布 Job 外其他 Job 获取 `contents:write` | 不允许 |
| SEC-08 | 所有者手动修改可见性前 | 检查全部公开前安全门禁和用户明确授权 |

## 验收结果账本模板

```text
CASE_ID:
SOURCE_SHA:
WORKFLOW_RUN_URL:
JOB_ID:
COMMAND:
PLATFORM:
EXPECTED:
ACTUAL:
STATUS: PASS | FAIL | BLOCKED | NOT_RUN
EVIDENCE_PATH:
NOTES:
```

P0~P5 的所有适用场景均有真实证据且未阻断、用户人工操作完成后才可认为完整上线；否则仅视为“已实现代码，尚待验收”，不能声称已生效。
