# 2026-10-30 最新计划修正：剩余 207 条必须分批执行（优先于下方 T2 最小补验建议）

用户要求 **207 条全部有具体分阶段执行安排**。唯一权威批次表：`docs/v077/REMAINING-207-PLAN.md`；已冻结每条未测CASE的所属批次、数量和模块。原计划仅做少量T2补验不能视为207条完整执行。

- T2-P0：3批 12+11+12=35；**下一轮从 T2-P0.1 开始**（NEW/OLD P0合计12），GPT-6.1 Sol / Medium。
- T2-P1：11批共141，按ENV/CAT、NEW/OLD、LIST、EDITOR、CLIP、PLAN、REVIEW、KNOW、MD、MEDIA/EX、BACK/TRASH/FAULT依次执行。
- T2-P2：2批13+9=22，HOME/AN与EDITOR/SET。
- T2-W：9条WIN（属于P1但单独统计）；平台专属P0的物理Windows后续验证在此交叉补证，不额外重复计数。
- **总数35+141+22+9=207，不删不漏不双计。** 41条已PASS和2条已FAIL不进入本计划的207个新测试计数。
- 仍然先收集问题，再I3统一分类、F4集中修复；受阻Windows真机不能虚报PASS，也不无限阻止修复已证实问题。每批保持准确SHA、最小报告和Token节约规则。
- 此处仅修改计划文档，**没有新增任何实测PASS或生产修复**。执行前始终读取远端实际HEAD和唯一结果账本，已通过的场景不无意义重跑。

---

# 2026-10-30 T1-C 当前检查点

T1-C DONE（指定Linux收集范围）：exchange 3PASS、settings 4PASS、storage 5PASS、reliability 3PASS+WIN-09 NOT_RUN；补充 KNOW-12 PASS。合计16条新增有效PASS，无新增业务BUG。累计实测待修2项（NEW-16、MEDIA-03）及4项USER_REPORTED保留；7条本轮测试失败观察归4类TEST_INFRA，均定向复验PASS。全账本41PASS/2FAIL/207NOT_RUN，未碰Windows层。

权威 docs/v077/T1-C-REPORT.md；永久摘要/回执/文件索引 evidence/T1-C-RESULTS.json。精确测试SHA分批见报告；最终定向脚本377c6c41d4bd3162a22cc911d19dc9be05388ff5。dependencies+410构建全复用，无安装/编译；框架12/12。未改src/electron/shared生产代码，不等CI、不合并发布，本轮结束。

I3初步归类条件具备，但全平台收集未完；下一仅T2最小补验：真实WIN-09+原Windows草稿反馈；WIN-05原复制源/GH-16；EDITOR-20/21窗口；BACK-09独立数据库合并；BACK-10中文空格迁移；WIN-07真实原生弹窗。不要重跑250条或重开已通过Linux项。KNOW-12不再遗留为未测；重名/缺父等变体没有冒称覆盖。

当前唯一分支feature/v077→develop；最终文档SHA查远端HEAD。本轮实际来源依次c9c38e4、c3bf0ed、7162b9a、377c6c4，完整SHA在报告。先environment status核验410输出/指纹；同输入缓存继续复用，禁止重复prepare/ci/build。Windows CI/实机均NOT_RUN；测试注入不等于物理Windows操作。

用户真实数据禁止访问。T1-C只收集、未进入修复；继续须遵循下一轮授权，不自动I3/F4。
