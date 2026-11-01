# W4 — AI 离线分析按卡 ZIP 导出与 Prompt 编辑（P1，纯导出阶段）

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / Medium，复杂一致性冲突局部升级 High。依赖 W1 与 W3 统计读模型。**
关联 [#35](https://github.com/Aides8Stack/GankSoft/issues/35)，设计源参考该 Issue 与之前提供的 Vue/HTML 预览（**该预览尚未整体入库，实施前需归档/核验正式原型**）。遵守 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)。

## 设计合同
- 「学习分析 → AI 调度调整」是子页面，内部提供「导出 ZIP」「导入解析」「解析记录」；此批**只实现导出 ZIP 和 Prompt 编辑**。Prompt 编辑也是二级子页面，有保存与取消/返回，不创建顶部主导航按钮。
- ZIP **恰好两类主要内容**：`data/` 学习数据和 `prompt/analysis-prompt.md`。`data/manifest.json` 记录 schema、exportId、snapshotId、dataEpoch/dataRevision、索引、哈希/尺寸；`deck.json`；`knowledge/nodes-XXXX.json` 与 `index/cards-XXXX.json` 分片；每张卡 `cards/<opaque-card-id>/card.json` 与 `reviews-0001.json` 等历史分片。**禁止只有一个巨型 study-data.json**。
- 事件文件每片上限约 40 条或软 128KiB、单 JSON 硬 256KiB；超长正文需要安全分片或明确拒绝，绝不默默截断。导出固定一致快照，不能在多文件之间混入新旧卡片或调度记录。大卡片集流式 SQLite→ZIP 临时文件；失败清理 temp。
- 可选图片附件默认不导出；包含关键图片但未勾选时标记「材料不完整」并阻止 AI 据此自动推断图像内容。用户明确选择导出图片时校验引用与大小、ZIP 路径。
- Prompt 是人为配置，可修改并显式保存；变更 Prompt 仅失效下一次导出文件，不触发卡片列表或调度全量刷新。AI 不是在线服务，本批不向任何外部接口上传数据。

## 最多三个检查点
1. **W4.1 冻结导出协议、Prompt 数据存取**：定义严格版本 DTO、manifest、快照、单卡及知识点索引；复用已有 settings/文件与写入安全约束，避免不必要新增表。
2. **W4.2 实现 Vue 子页面与流式导出**：Prompt 进入/保存/返回、日期选择与图片开关、导出进度/失败提示；本批严禁新增 AI 调度执行写入。
3. **W4.3 ZIP 与 GUI 定向测试，保存远端 SHA**：用离线合成数据/隔离库测试压缩结构和文件完整性。

## 新增测试矩阵
| CASE | 强制断言 |
|---|---|
| W4-01 | 1、10、225、5000张卡导出，每卡独立 JSON/manifest 索引；不存在单个全量 JSON |
| W4-02 | 单卡 0、40、111 条历史与极长单卡正文安全分片；硬尺寸阈值不被悄悄突破 |
| W4-03 | SHA256、文件字节数、ZIP CRC、文件路径和每个 cardId/eventId 对应完整性一致 |
| W4-04 | 导出中发生评分/调度变化：一致快照成立或明确失败；不得拼接跨修订文件 |
| W4-05 | Prompt 保存/取消与新 ZIP 内容一致，首次默认、版本不兼容、重启读取正确 |
| W4-06 | 图片开关、损坏引用/大文件、隐私提示；不导出图片时标记材料不完整 |
| W4-07 | 导出中途失败/空间不足/取消：无残留可误用 ZIP、临时文件被清理 |
| W4-08 | Vue 在 900/1366/1600px 可操作；不改原学习历史/FSRS；Windows 真机未测 NOT_RUN |

**验收门槛**：ZIP 真实生成/解包/哈希校验、包含全部选择范围且无丢卡与旧版本混合、Prompt 保存可靠、生产 DB 和 FSRS 零变化。本批**不实现**解析后的调度 apply。