# P1 B1 并行实测报告 — 2026-10-30

状态：IN_PROGRESS（34条均已执行；两条设施问题未获得可信结论）。仅执行B1，不进入B2。

| 计划 | 唯一实际执行 | 尝试次数 | PASS | PRODUCT_FAILURE | TEST_INFRA | BLOCKED | 账本NOT_RUN |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 34 | 34 | 43 | 30 | 2 | 2 | 0 | 2 |

NOT_RUN的2条就是TEST_INFRA两条，并非额外2条。没有未启动CASE。所有原PASS/FAIL/BLOCKED零自动重跑；9条设施失败各重试一次，CAT-09首轮被熔断、随后首次执行。两条已确认产品失败没有重试。

## 来源与环境

- 固定生产源码：`4e2e0fe3e208c7134763332d9d872983538205bc`（包含F1/F2）。测试前后源码/输出指纹一致：`807a7b1bb302464f79a34f37eb9d840937a7ab41e70a2ec6e899e5ecf2844412`。
- 首轮完整测试源码：`c314ebbda54682fb30169c0c8cb0ad1f7a414968`；定向重试：`648be690963d0405683aa02222c76f18c98a8ff0`。这些为本地不可变Git提交，精确源码随证据包source-checkpoints.bundle保存；远端相同Git tree的检查点19c39b138fcebb6ad04f2deb15ddafb53da593d8/883ca98ae1e8bc946d838dd2f7495c4764d6199e映射见P1-B1-SOURCE-IDENTITY.json；不得把测试SHA改写成最终GitHub文档提交SHA。
- Node v24.22.1 / Linux x64 / Electron44.9.1 / Schema606；复制复用有效依赖，无npm安装；所有Worker前仅一次必要构建，411个输出。末次environment status验证输出有效。
- 默认4个异步spawn Worker，空闲即领取下一CASE。每CASE独立Node/Electron进程、mkdtemp Schema606库、r7-electron-profile和证据目录。仅源码/依赖/构建只读共享。沿用180s超时和executeCase清理，进程组清理防止残留子进程。
- CPU/内存检查可降至2–3；运行时启动/超时限制可降至2。本轮稳定使用4；Linux确认框仅注入返回值，真实GUI写入/SQLite与重启检查保留，不等于Windows物理签核。

## 实测结果

逐CASE、原始日志路径、步骤、检查值、脚本SHA256及精确测试SHA见 `evidence/P1-B1-RESULTS.json`，原始case/console/diagnostics/截图在独立证据ZIP。

- ENV：6 PASS / 1 FAIL。ENV-05：600px下展开侧栏后遮挡收起按钮，真实鼠标被侧栏brand-mark拦截；ENV-07注入真实查询失败、验证可见提示和重试后通过。
- CAT：5 PASS / 1 FAIL / 1 NOT_RUN。CAT-03：空格名提交显示Zod底层英文文本，并进入unknown锁定状态，取消按钮不可操作。数据库没有新增目录，但反馈与取消合同失败。
- NEW：6 PASS / 1 NOT_RUN。
- OLD：4 PASS。
- LIST：9 PASS。

两个新产品BUG已写入DEFECT-INBOX：AUTO-ENV-05-cdbcce7f0f37、AUTO-CAT-03-a9d636fd51be。只记录，不修改生产。

## TEST_INFRA与停止理由

- CAT-07：首次未打开折叠目录管理区域，修正后唯一一次重试实际分页58项，但脚本硬编码57（遗漏默认错题集），断言失败。未完成后续搜索/重新进入步骤，不能凭截图或数量晋升PASS。收尾已改为精确持久化目录名单比较，未再次执行；搜索控件是否具备仍待核查。
- NEW-08：首次公共材料位于折叠区，修正后唯一一次重试在重开草稿后未重新展开公共材料，innerText断言失败。重启前材料断言通过；不能据此宣称整个CASE PASS，也不能判材料丢失。收尾补齐重开后的展开操作，未再次执行。
- 两者均已达到每CASE最多一次设施重试，保持NOT_RUN；本轮不做第三次尝试。
- 其他设施修正：details空字符串open属性误判；目录管理折叠区；自动保存旧值读回竞态；Linux native confirm关闭进程；查询错误实际提示文本。全部保留原业务断言，没有用后端写入代替GUI。
- 首版按handler熔断过宽，CAT-09被暂停一次；后修正为handler+归一化错误/代码位置的同根因熔断。原暂停回执保留，不影响34条唯一CASE计数。

## 汇总、账本与并发保存

两轮分别运行collect dry-run及promote dry-run；首轮人工核对2项业务失败后collect write/promote，重试8 PASS经原promote晋升。未修改collect/promote安全校验。混合SHA的批次总表仅用于汇总，绝不直接promote。

测试期间远端前移到`c00119f54530f59b0a42529e1ccdb1cadc2bc2fb`，仅F3报告/五条旧缺陷结果变动，生产文件未变。本轮继续冻结构建，没有重测对方CASE。保存以远端tree为基础，仅合并本轮32条原NOT_RUN CASE及两个新增缺陷，保留对方全部F1–F3字段/记录。

合并后全250条：117 PASS / 3 FAIL / 3 BLOCKED / 127 NOT_RUN。剩余FAIL包括对方保留的FAULT-05合同争议；没有宣称全部BUG已修。所有Windows、unitApi层逐CASE保持原值。

调度设施自检4/4 PASS；最后两处未实测的驱动修正仅语法检查通过。生产src/shared/electron、锁文件、版本、CI门禁均无本轮修改。

## 下一Work

直接复用调度器：`node tools/validation/v077/p1-parallel.mjs run --batch B2 --workers 4`。先environment status，仅输入失效才统一prepare一次；B2前不得因本轮增加第六批，也不得自动重跑B1两条遗留。B3/B4/B5保持原计划，B5必须真正Windows实机。CASE结果未审核时由调度器保守标TEST_INFRA/NOT_RUN，必须按原日志/界面/业务数据独立归因后才晋升产品FAIL。

可用命令：`list`、`run`、`summarize --batch B1`；运行不写共享账本，汇总与promote在全部Worker结束后串行执行。使用max2本地尝试保护；跨Work恢复必须带回证据总表/尝试记录，禁止遗失重试计数。每次run先打印实际清单及固定SHA。

不等待CI，不合并，不发布。本轮完成保存后结束。
