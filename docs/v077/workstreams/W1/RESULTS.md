# W1 — 执行结果与交接

**W1.1 DONE / W1.2 DONE / W1.3 DONE（Linux 定向验收）。**

W1-01～W1-08：**8 PASS / 0 FAIL / 0 BLOCKED**。Windows CI、Windows10、Windows11、真实125%DPI分别NOT_RUN；本轮未构建新Windows包。B1–B5及旧250账本保持原状态；未执行W2–W5、合并、Release或等待CI。

## 身份与保存

| 项目 | 完整身份 |
|---|---|
| 起点远端 | `2f7cf4858b530b3a7c1ee1c8d743f0c9016b7e4f` |
| W1.1远端 | `9acc3d5d26e5c65f71405db7e02f0f212c94ba08` |
| 最终GUI实际运行源码SHA | `ce4d42a1531f40594a024e36c9a0a988fe45f9a9` |
| 最终GUI实际运行测试脚本提交SHA | `ce4d42a1531f40594a024e36c9a0a988fe45f9a9` |
| 上述完整tree | `323c3e69886bedfb938051ccabb06f15b24ff4cf` |
| GUI脚本Git blob | `9f10526c4603702a899f0ab4de4816180fa11e18` |
| W1领域脚本Git blob | `097d5d2b092f37a7e74a76c3a7ff8cc4160ea48c` |
| 最终文档保存SHA | 从本路径Git历史及Issues #30/#31最终回执解析；不在提交中虚构自身SHA |

最终GUI是在已fetch并检出上述**远端冻结提交**后运行；后续仅文档/证据，无生产或测试脚本修改。独立PID **40 → 112**，0 renderer error，Schema606完整性和外键检查PASS。源码及脚本的SHA-256见[源码身份](./evidence/SOURCE-IDENTITY.json)，GUI额外记录324个生产输入文件的字节哈希。

CLI普通push只尝试一次，因无用户名/写凭据失败。连接器按小文件逐个校验，以真实parent/base tree、expected_sha、force=false追加；源码远端tree与本地e46f715完整tree一致。保存后独立读取远端ref并fetch核对文件集合/每个blob，不覆盖他人结果。

## 真实根因（正式 Linux Electron）

- 自动保存持有请求期间，评分区域 fieldset 被 locked 禁用；真实鼠标点击保存没有产生 learning.review.submit。submit 本身亦因 busy 提前返回，不排队。证据 baseline.json disabledDuringAutosave=true、afterFirstClick 无 submit。
- 再点保存后 SQLite 三表均正确：学习事件、相同 eventId 调度事件、最新 FSRS reps=1。返回所有卡片却仍显示原来的0次和未记录，确认属于已提交但 UI 陈旧。
- UnifiedWorkspace.lastLists 保存/恢复 rows，cards/back 未强制重新读取；client 丢弃信封修订，分析/概览缺少统一失效订阅。概览两路读没有修订对齐。
- 正式仅练习入口及后端 practice 分支可绕过 advanceSchedule；老版本/周期/排期冲突仍可保存不调度事件，不满足新合同。
- learning.review.submit 是同步 host handler。现有 host.atomic 包含领域事务、bumpRevision 和 durable receipt；不是异步 platform 的二段提交，无须新增网关事务或第二套调度。

证据 [baseline.json](./evidence/baseline.json)，脚本 tools/validation/v077/w1-reproduce.mjs。首轮仅因旧按钮定位错误失败，原样保留 baseline-infra-attempt.json；修正为实际卡片集导航后一次补验 REPRODUCED。没有计入新合同 PASS。

此为W1.1基线证据；最终新合同结果见下表。


## 正式修复

- 草稿自动保存与评分提交串行；保存按钮移出被锁fieldset，途中一次点击/连点保留提交意图。暂停后可正式保存，保持已有计时语义，未接入W2控制器。
- 新open/change/submit拒绝practice:true，专项选题使用同一正式提交。成功只允许三表原子调度；版本/周期/排期冲突整体拒绝并保留作答。旧practice事件及结果codec只读保留；待答旧practice会话明确提示，用户显式CAS保存时才转换。
- 现有同步host.atomic已包含领域写、修订提升及回执。保留原eventId/requestId幂等；未知回执使用原请求核对。保存成功但读回失败单独提示并提供重新读取，不能重复作答或伪成功。
- client业务返回形状保持原样，通过WeakMap提供已验证信封metadata；epoch/修订单调上界、失效订阅和原回执复用同一路径。services仅发布轻量失效信号，过滤草稿/Prompt等非统计写入；无持久缓存、第二套Store/数据库/FSRS/统计引擎或新IPC。
- lastLists只存搜索/类型/排序/选择ID/页数/滚动；返回重新读SQLite。列表、详情、概览、学习总览、分析、知识掌握、队列按需刷新；同屏聚合校验同epoch/revision，最多一次重读。请求序号、筛选身份、修订及分页游标共同阻止旧响应和混页。恢复/激活重读；旧epoch引用不能重绑新库写入。未提交表单不被统计刷新覆盖。

## 最终定向验收

命令：`W1_EVIDENCE_DIR=validation-results/v077/w1-frozen node --experimental-strip-types tools/validation/v077/w1-review-sync.mjs`。

| CASE | 实际Linux Electron结果与证据 |
|---|---|
| W1-01 | PASS：直接记忆评分落三表，原列表立即1次/9.0/最新排期；搜索、排序、选择上下文保留 |
| W1-02 | PASS：问答、单选及直接记忆；单选答错且自评9.5，客观false、Again独立落库 |
| W1-03 | PASS：单卡指定学习、同日提前再学均调度；触发blur暂停后一次点击提交，未静默退出 |
| W1-04 | PASS：500ms自动保存回包被确定性挂起；真实连点保存，释放后只新增1事件/1调度 |
| W1-05 | PASS：不重启/不手动刷新，列表、概览、分析均5次，关联知识3卡5观察；DOM与DB一致 |
| W1-06 | PASS：SQLite回执写失败三表回滚，评分保留；成功后读回失败明确提示并安全重读；未知回执原requestId核对且无重复；版本冲突保留66分、0事件 |
| W1-07 | PASS：旧分析查询延迟至两次GUI提交后释放，不覆盖新9次结果；37卡两页读回；额外领域测试验证旧revision响应拒绝与cursor冲突 |
| W1-08 | PASS：实际完整备份GUI恢复生成新epoch，重返列表/窗口激活读取新库；跨学习日由既有可控时钟领域夹具验证，无写入也重算今日值 |

正式链：GUI操作→现有preload/services→gank:protocol→真实SQLite三表→页面返回→新Electron进程→备份恢复。文件对话框选择和确定性故障/blur为测试注入，非物理系统人工输入；跨学习日不是等待真实午夜。Windows/125%DPI不据此冒称通过。

[最终GUI原始结果](./evidence/gui-frozen.json) / [验证日志](./evidence/validation-logs.txt)。最终8个CASE全PASS；另有9条新增领域测试PASS，20条相关单元测试唯一结果PASS（19初次+修正夹具定向1），21条协议唯一结果PASS（20初次+epoch回归修复后定向1）。Vue/后端类型、renderer增量构建、协议边界/契约类型PASS，未重装依赖、未跑旧250完整测试。

协议导出命令PASS（163方法，无新增方法）。中央1MB静态JSON导出快照未作大JSON上传；W1涉及的两个const:false差异完整保存为[可复现导出补丁](./evidence/protocol-export.patch)，运行时Zod和领域验证为正式合同，不以静态JSON代替；后续按需运行`npm run protocol:export`即可重建。此文档快照不参与运行时、GUI或打包业务校验。

## 尝试记录与限制

保留首轮按钮定位失败、测试scope/字段/owner夹具误用、旧历史夹具触发不可变保护的原始失败。均修正测试构造而未降数据库保护、删除断言或改历史账本。client改造首次漏清epoch导致1条已有协议测试真实FAIL，已恢复握手失效语义，目标回归PASS。日志含原始FAIL，不能将其擦除或当作当前未解决产品故障。

- [原始首次领域失败](./evidence/domain-infra-attempt.txt)
- [后续夹具失败原文](./evidence/failure-attempts.txt)
- [预验工作树结果](./evidence/gui-preliminary.json)与冻结结果分别保存，不混用SHA。

无未解决的W1运行时阻断；真实Windows平台验收继续NOT_RUN。版本/周期/排期冲突时明确阻止成功并保留旧草稿，不能自动将旧作答套到新内容或补调度。**W2具备启动前提，但本Work未启动W2；后续新Work读取W1结果和最新有效RECOVERY段落即可，不重启B1–B5。**
