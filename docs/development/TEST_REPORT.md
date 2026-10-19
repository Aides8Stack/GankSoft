# 实际测试与验证账本

状态：PASS=实际通过；FAIL=实际失败；BLOCKED=环境/依赖阻塞；NOT_RUN=未执行。
本轮环境：Linux / Node24.19.0 / npm11.9.0；源码读取固定基线 a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
历史 docs/v0.7.3-validation.md 原样保留，未重新运行其 198 项及 Windows 包检查；不纳入本轮 PASS。
检查点 SHA 与被测代码 SHA 分开记录；初始化检查点 d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae 已远程确认；本回执提交按 Git 历史解析。

| ID | 阶段 | 命令/操作 | 环境、关联版本 | 结果 | 证据与限制 |
| --- | --- | --- | --- | --- | --- |
| T00 | M0 | git status --short --branch / remote -v / log -8 --oneline | 起始 scratch | BLOCKED | 无 Git checkout，均报 not a git repository；不等于项目代码故障 |
| T00b | M0 | git ls-remote https://github.com/Aides8Stack/GankSoft.git | 终端 HTTPS | BLOCKED | 无私有仓库终端认证，could not read Username；使用已授权连接器 |
| T00c | M0 | GitHub 读取 refs/heads、commits、递归 tree、目标源码 | 远程 a0fb65d89b7273c6f06beb763e66b3c4d1899a05 | PASS | 三分支均为基线；tree 未截断，323 blob；读取权限已实际可用 |
| T01 | M0 | node tools/protocol/check-boundaries.mjs | Linux；固定基线中完整 shared/protocol/、services 与原脚本的文本副本 | PASS | exit 0：Protocol and frontend boundaries passed；仅静态边界，不是完整 checkout 或业务测试 |
| T02 | M0 | python 内联校验六文件集合/阶段状态/恢复引用/代码围栏/秘密模式；逐文件 git diff --no-index --check /dev/null <文件> | Linux；本初始化工作树 | PASS | exit 0；六文件均通过，无空白错误，无匹配密钥模式；仅变更文本扫描，不是全仓秘密审计 |
| T03 | M0 | GitHub 递归 tree 对比、git/commits 读取、refs/heads 独立读回 | d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae | PASS | 329 blob，六文件新增，323 原文件 SHA 不变，无丢失；父链接基线；feature 指向本提交，main/develop 均仍为基线 |
| T04 | P1 | npm ci → npm run check | 当前无完整 checkout/依赖 | BLOCKED | 未调用 npm check；下一真实 checkout 任务必须补基线 |
| T05 | P1/P4/P6 | npm run smoke / smoke:v071 / build后 smoke-v073 / test:package | 当前环境 | NOT_RUN | 未安装并运行 Electron，不声称界面通过 |
| T06 | P6 | Windows10/11 W01—W40及新图片用例 | 两系统真机 | NOT_RUN | 未进行任何 Windows 实机验收 |
| T07 | M0 | 创建 PR | GitHub 连接 | NOT_RUN | 不需要集成 PR；未实测创建能力，不能保证工作流/分支保护允许 |

失败/阻塞必须保留原因和后续动作，不删去中间失败来“全部通过”。后续按阶段追加测试命令、被测 SHA/工作树、日期和日志证据。

## 检查点保存证据
- 初始化 commit：d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae；tree：7f6ff5ebe29a8438129575b0f66e529368802b6f；parent：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
- API 非强制 update_ref 返回 success=true；独立 refs/heads 与 git/commits 读回一致。
- 自动审批拒绝过一次缺参数的 ref 探测，未执行；明确目标、验证父链和 force=false 后的实际更新成功。拒绝不计作业务测试 FAIL。
- 本回执只更新三份执行文档；保存后应再次读取远程和差异，不把“已创建 commit 对象”误写成“已更新分支”。

## I0 本轮实测（2026-10-19）
被测源码基线：27d39307d9581334f906e02b2a62db85fe8f4cfc；Linux Node24.19.0/npm11.9.0。本地完整内容快照逐项校验 329 Git blob SHA，非 Git 检出。
| 操作 | 结果 | 证据/限制 |
| --- | --- | --- |
| 远程 refs/tree/文档/package/测试脚本审计 | PASS | feature 前序如上；develop=a0fb65d8；无现存 .github/Actions runs |
| npm ci --fetch-retries=0 --fetch-timeout=20000 --no-audit --no-fund | PASS | 安装 524 packages；未改依赖及锁文件 |
| npm run check | PASS | 198 全量、21 协议测试，协议边界/类型/导出及 Vue/TS/Vite 构建成功 |
| node --test tools/ci/core.test.mjs | PASS | 4 项：分支防碰撞、真实失败阻断后续构建、成功账本、任务归档与防重复/稳定分支拒绝；测试使用临时 Git fixture |
| node tools/validation/package-check.mjs | IN_PROGRESS | 不将部分 UI PASS 当作整套完成，待回填 |
| Windows CI/安装/启动/卸载 | NOT_RUN | 等实际 Actions，当前 Linux 不能代替 |
| Win10/11 人工签核 | NOT_RUN | 始终与 Windows Runner 分开 |
| 远程 CI 跨 job 失败阻断 | NOT_RUN | 本地子进程阻断实测通过，不代表 GitHub needs 实测 |
