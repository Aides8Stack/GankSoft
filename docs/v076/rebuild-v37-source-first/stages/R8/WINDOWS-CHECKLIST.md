# Win10 / Win11 同包验收（全部 NOT_RUN）

只使用隔离的合成数据，不操作唯一真实库。每台填写：验收人/日期、OS版本和构建号、x64、100%/125%缩放、ZIP SHA256、source.sha、lockSha256、runId/attempt。两台ZIP SHA256必须一致；同一候选失败即停止放行并留日志，不自行换包混签。

PowerShell：`Get-FileHash -Algorithm SHA256 .\GankSoft-v0.7.6-win64-portable.zip`，与SHA256SUMS.txt一致；解压后只运行GankSoft\GankSoft.exe。

| 项目 | 操作及通过条件 | Win10 | Win11 |
| --- | --- | --- | --- |
| 包身份 | 比对ZIP哈希、source.json与TEST_REPORT.json；仅GankSoft/顶层，无安装器；记录上述身份字段 | NOT_RUN | NOT_RUN |
| 解压/重启 | 短路径、中文带空格路径运行；新建卡片，正常退出再开仍存在；80/100字符深度继承本包Windows解压报告，缺报告不算通过 | NOT_RUN | NOT_RUN |
| 卡片/FSRS | 新建并编辑错题与记忆卡→保存草稿→发布→复盘评分；客观答错强制Again，分数与FSRS计划可读回；重启不丢失 | NOT_RUN | NOT_RUN |
| 中文IME/图片 | 真正中文输入法组合输入、不重复丢字；从系统剪贴板粘贴真实PNG→保存发布→关闭重开图片仍正确 | NOT_RUN | NOT_RUN |
| 表格/图谱 | 鼠标选中表格即输入、拖拽及撤销重做；打开知识图谱/节点编辑/返回，关联正确且操作可达 | NOT_RUN | NOT_RUN |
| 回收/备份/迁移 | 设置内回收卡片/知识子树后恢复原ID与关联；导出备份、隔离库恢复并重启；迁移至中文目录后重开卡片/图片完整 | NOT_RUN | NOT_RUN |
| 原生恢复B02 | 恢复前记录合成数据/附件快照；原生确认框真实可见，用鼠标取消，无恢复持久写入；再确认恢复、返回列表并新进程读回。数据库按静止语义快照比较，排除正常打开产生的WAL/租约变化；无法证明零写保持NOT_RUN | NOT_RUN | NOT_RUN |
| 缩放/窗口 | 100%与125%各打开六页并完成主要点击/弹窗/滚动；最大化/还原后入口可达、无遮挡。只验可用性，不逐像素对照 | NOT_RUN | NOT_RUN |

每行记录PASS/FAIL及最少截图/日志路径。失败记录触发步骤、实际/预期、包SHA256；缺物理设备或证据保持NOT_RUN。两个系统全部通过前不签正式发布。
