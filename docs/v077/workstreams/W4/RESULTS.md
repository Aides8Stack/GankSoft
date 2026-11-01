# W4 — AI 学习分析 ZIP 与 Prompt

W4.1 / W4.2 DONE（Linux领域与正式Electron初验）；W4.3 IN_PROGRESS（冻结源码最终验收与保存）。

起点 `4f1cadaa76c3ec4defdd65c27dfce68ae9ebc58b`。仅 W4，不进入 W5/Issue36。

W4.1 实现严格版本化协议、只读快照、多卡/跨卡历史分片、位置索引、SHA256/CRC/字节核验、临时文件与原子改名；Prompt 显式保存和CAS。W3/W4复用同一指标 reducer，W4统计逐卡扫描且不收集全部历史。

实际领域首次14项PASS：1/10/225/499/500/501/1000/5000/10000张卡且各有同数量事件，10000卡200主体分片；0/40/111历史、知识直接/子树去重、真实并发评分固定快照、Prompt重启/不兼容、取消/空间不足/中途失败/坏ZIP。另图片专项1项PASS（真实PNG、缺失/损坏/>20MiB、默认材料不完整）。W3受影响指标交界5与协议21 PASS（不是W1–W3全量重跑）。后续最终冻结源码统一记录。

早期设施错误保留：测试未先保存评分、Node strip不支持参数属性、图片工厂API名称；只读快照初次被写入owner栅栏拒绝，已新增经过当前owner授权的只读句柄（readOnly+query_only，禁止提交写入），没有放宽原写栅栏。

资源预算：普通JSON256KiB、目标128KiB、主体50条/片、事件40条/片；单异常记录明确拒绝而不截断；ZIP展开2GiB、10万条目、目录16MiB、统计scalar状态16MiB、图片20MiB/个及索引8MiB、磁盘余量16MiB。无固定卡片/事件总量限制。

Windows CI/Win10/Win11/真实125%DPI均NOT_RUN。正式GUI尚未验收。原始日志在后续W4.3保存；本提交SHA由Git历史解析，不虚构自身SHA。

## W4.2 实现检查点

W4.1远端 `4c62fdcbd3fc66c045303abfcdcc859d3d4e4af1`，tree `087e9fa0e59a376dbff9ea2dcea1c5c986526d95`，与本地1fe4b4e完整tree相同。普通push缺凭据，GitHub连接器创建逐项相同blob、真实parent/base_tree，expected_sha且force=false追加；无合并/强推。

正式入口学习分析→AI调度调整→导出/Prompt二级页面；日期只限定摘要，历史始终完整。导出query不提升dataRevision，不产生学习写入；Prompt独立command被统一失效机制排除，不重算全卡统计。进度仅在活动导出期间读取，独立取消API；同jobId重放不重写文件。未展示可执行的W5按钮。

首次正式Linux Electron 900/1366/1600交互、每宽真实ZIP、Prompt取消/保存/离开保护、原生选择取消/活动取消、真实路径失败、两个独立PID与SQL完整性均PASS，0 renderer error。中文字形缺失，字体视觉NOT_RUN。W4.2加入严格portable card/event/index/knowledge schema与源记录预分配大小检查后领域9项PASS，最终同源码整体验收在W4.3执行。

协议registry实际170方法；check:protocol通过。历史中央contracts-v2快照仍是旧163方法，与W1/W3既有存档策略一致；不混入历史大规模schema重排。本批5方法和ZIP记录严格合同分别保存evidence/contract-ai-api.json、contract-ai-records.json；运行时registry权威，npm run protocol:export可重建完整快照。
