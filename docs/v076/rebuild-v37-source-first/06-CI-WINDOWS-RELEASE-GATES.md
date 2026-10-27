# 06 — CI、真实 Windows、可移植交付与安全 Gate

## 基线
仓库原流水线的真实状态与受保护分支规则以当轮 GitHub 读取为准。现行开发为 `0.7.6-rc.1`，`develop` / `main` 受保护，不修改工作流和测试门禁绕过失败。PR #15 保持 Draft；不得自动可信审批、合并、发布或建新分支。已取消 S8.b 外部数据库独立追加不能重新接入，Schema606继续正式生产。

## 自测：先关联、后整套
1. 代码修改前记录范围、真实协议签名、所有者、影响面及测试对应表；运行对应相关业务单元/契约、构建与真实 Electron smoke。
2. 前端关键操作至少一条 end-to-end UI → gank.protocol → SQLite/FSRS/service → 退出重启。单独运行协议单测不能代替它。
3. 任一公共壳/路由/Crepe/图谱修改，要重新执行其影响范围所有相关测试与长期 17 场景回归，不因测试夹具落后删掉断言；如为真实夹具过时，保留原强度修正 fixture。
4. R7 汇总执行正式门禁范围全量测试。已有未受改动且 SHA/环境有效的证据可继承，不能混成“本轮全量重新通过”。
5. 差异和误差收敛以 `03-VISUAL-FIXTURES-AND-ACCEPTANCE.md` 为基准；**合成视觉夹具不能代替真实业务夹具**。

## 截图与 Windows 验收
- 开发证据：Linux production Electron（标“Linux辅助”，不是Windows PASS）。
- CI Windows：必须把 `window.outerWidth`、实际 BrowserWindow 尺寸、`innerWidth`、截图 PNG 维度与 scaleFactor 分别取证；不通过“1484 改成1500”的简单放宽来解决16px偏差。真实失败找原生框/滚动条/截图环境的根因，保持正确断言。
- 正式 Windows Electron/ASAR/EXE：三宽下中文截图、滚动与焦点、输入法，缩放100%/125%/必要150%；宽窄窗口图谱/编辑器的可操作性，禁止用假窗口仅验证 HTML。
- Win10/Win11 同一个便携 ZIP 的人工清单独立运行和签核；未跑一直为 NOT_RUN。实际解压、启动、重启、数据保存、图片加载、知识树、备份恢复、长中文路径均需实测。
- 产物只要求 Windows 便携 ZIP，不擅自增加安装器/Release；ZIP 顶层 `GankSoft/`，文件名 `GankSoft-v{version}-win64-portable.zip`，保留源 SHA、Run ID、SHA256SUMS、元数据身份与完整解压校验。

## 真实通过门槛
```
VISUAL               PASS|FAIL|BLOCKED|NOT_RUN
UI_INTERACTION       PASS|FAIL|BLOCKED|NOT_RUN
IPC_API              PASS|FAIL|BLOCKED|NOT_RUN
BACKEND_INTEGRATION  PASS|FAIL|BLOCKED|NOT_RUN
PERSISTENCE_RESTART  PASS|FAIL|BLOCKED|NOT_RUN
NEGATIVE_SECURITY    PASS|FAIL|BLOCKED|NOT_RUN
REGRESSION           PASS|FAIL|BLOCKED|NOT_RUN
WINDOWS_REAL         PASS|FAIL|BLOCKED|NOT_RUN
PORTABLE_PACKAGE     PASS|FAIL|BLOCKED|NOT_RUN
```
输出必须包含实际测试命令、退出码、通过/失败数、被测 HEAD/工作树、环境、截图/测试manifest SHA及失败项目；不能把无效测试、Linux截图、旧PR的产物当本轮证据。各类 Gate 对应阶段不同，在 R0 前只需要基线确认，R8 须满足最终 Windows 证据。

## 安全边界
所有生成数据为合成私有临时库，不能提交用户真实学习数据、图片、私人路径、Secret、token、完整敏感日志。GitHub git API 保存须以真实 head 的 tree 为基、commit parent=head、更新引用 force=false + expected_sha；如 concurrent push，先比较差异再补提交，绝不丢其他 Work 成果。质量门禁不降低。不能自动合并PR#15或发布正式版。
