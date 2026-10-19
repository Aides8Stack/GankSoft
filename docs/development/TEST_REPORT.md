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
