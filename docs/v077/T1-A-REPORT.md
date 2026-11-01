# GankSoft v0.7.7 — T1-A 核心模块真实操作结果

**T1-A：DONE（本轮10条最低操作链已全部执行，收集结束；不代表软件无缺陷）。**

本轮：**PASS 9 / FAIL 1 / BLOCKED 0 / NOT_RUN 0**。app、catalog、cards、editor、learning 五模块；没有修改生产业务代码、Schema、依赖锁或发布流程。

## 失败摘要

- **NEW-16 / cards / VALIDATION_FEEDBACK**：完整填写标题、题干、解析和两个选项，不选正确答案后点击发布。预期中文说明缺少“正确答案”；实际 `Error: 请补齐标题及必填内容：correctOptionId`。两次独立场景均观察到内部字段名，最终准确提示断言失败。暂不推断生产根因，不修复。
- 数据断言通过：拒绝发布；正式列表无该cardId；唯一草稿可从草稿箱重开；退出并以新Electron PID启动后payload保持一致。未观察到数据损坏或丢失。
- 缺陷：`AUTO-NEW-16-e0ee13132997`；与GH-21建立观察关联，不代表复现了Windows“点击无反应”。原CASE优先级P0，缺陷严重性留I3复核。

## 通过范围与证据

PASS只统计9条，不逐条展开。覆盖启动/重启、新建卡片集、按钮保存与Ctrl+S、发布错题、旧错题关联草稿及正式版本/历史保护、发布后搜索/详情、网页HTML+文字原生剪贴板粘贴、错题复盘、直接记忆评分。写操作均有GUI重开、只读IPC/SQLite以及新PID持久化检查。

机器证据：[T1-A-RESULTS.json](./evidence/T1-A-RESULTS.json)。含每条CASE实际完整SHA、步骤、反馈轨迹摘要、新PID、原始证据文件大小与SHA-256。原始截图、日志及合成数据库快照仅在运行目录，未将SQLite/二进制截图提交Git；跨Work永久证据为此精简摘要与脚本，可确定性重现。

脚本全部先保存到GitHub，再按远端相同tree执行。为避免重跑已通过项，本轮有多个准确测试检查点，**不是全部在最终文档提交重跑**：

| 被测完整SHA | 结果用途 |
| --- | --- |
| c882ea3acac1c4ee76d6eecd8b61a543265f66ff | 首批未受工具修正影响的有效结果 |
| 9fc08d2796652b686dcbbab98dbac44f4493a44c | 发布/搜索/网页粘贴工具修正后结果 |
| 055d3d04fcfe6e34100757f7ee57a99b34902d03 | 明确提示断言和错题复盘结果 |
| 50ef476ba948ac458cbfb152e82ecfb51fabc247 | 直接记忆按真实评分合同补验 |

上述检查点的全部生产输入与恢复基线 `0d0c072117dfed45f6463789fb289e2153a18409` 一致；仅测试/文档不同。此前8条Linux历史PASS未重跑、不计本轮9条。唯一账本合计17 PASS、1 FAIL、232 NOT_RUN；unitApi/Windows CI/Win10/Win11逐CASE层均未新晋升。

## 测试工具问题（与生产失败分开）

详见 [T1-A-INFRA-ATTEMPTS.json](./evidence/T1-A-INFRA-ATTEMPTS.json)。修复了诊断循环引用、Markdown末尾换行断言、Electron ClipboardItem接口、评级大小写、重启后页面引用、直接记忆在途会话夹具及不存在的揭示步骤、有界清理和先写失败证据。原有有效断言保留；没有通过后台写入代替GUI。一次错误启动的预保存试跑不用于验收，首批部分run因旧清理挂起无完整summary，有效单CASE与后续受影响补验来源逐条列明。

自动收集器先dry-run、检查脱敏预览后write。REVIEW-05原脚本失败单独标TEST_INFRA，最后真实回归PASS；不冒充生产修复。新增收集器对workspace路径脱敏。没有关闭原Windows用户报告。

## 环境与复用

Linux x64 / Node24.22.1 / Electron44.9.1 / 隔离Schema606。package实际0.7.6，UI显示0.7.6-rc.1；v0.7.7为当前开发阶段，未擅改版本。

远端分支查询无Actions run，未找到合法同平台Artifact。首次依赖安装和构建完成，410文件校验；随后prepare为REUSED/REUSED_VERIFIED。**之后未再次npm ci/build**。构建builtFromSha为恢复基线，生产输入指纹相同，因此可复用。跨Work脚本与配方已保存；构建Artifact尚未生成，不能承诺新环境零构建。

框架最终12/12；模块映射审计12模块/20组/250CASE通过。环境/框架PASS不计功能PASS。

## 未测范围与恢复

所选10条脚本均实现、均实际执行，无环境阻断项；其它232条仍NOT_RUN，未注册场景需后续按模块补齐。CLIP-02是Linux原生剪贴板HTML+plain fixture和真实Ctrl+V，不是Windows物理浏览器选择复制。Windows原报告、WindowsCI和Win10/11实机均未验证。

下一入口 **T1-B / GPT-6.1 Sol · Medium**：按模块继续analytics、knowledge、media；随后exchange、settings、storage、reliability及核心模块未测链。只收集问题，I3统一分类后才F4修业务。读取恢复记录和当前模块，不重新构建或重复通过项。已将Token节约规则永久加入WORK-E2E-EXECUTION.md。

本轮保存并独立核实后结束，不等CI、不合并、不发布、不进入I3/F4。最终文档检查点从远端HEAD解析，避免文档自引用SHA。
