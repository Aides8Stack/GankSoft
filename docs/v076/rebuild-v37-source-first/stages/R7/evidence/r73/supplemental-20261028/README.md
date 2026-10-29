# R7.3 续验结构化证据（精简保存）

本目录提交差异摘要、夹具审计、运行失败记录、哈希索引及保存审计；不包含111张PNG或24份完整DOM/CSS gzip快照。manifest中的images/和snapshots/路径指向独立备份内的原始相对路径，不代表GitHub已保存原图。

原待提交159文件（16,433,120字节）已制作可验证检查点：GankSoft-R73-20261028-checkpoint.tar，16,803,840字节，含159文件及BACKUP-INVENTORY.json。独立取回并逐文件核验PASS；标识、SHA-256、完整文件清单及111图分类见export-audit.json。只需恢复备份GankSoft/前缀下的相应文件，不运行重新采集或打包。

49对/111图是历史本轮捕获量，不等于111张新增独立视觉证据：73张缺失状态、28张受影响重采、10张与旧manifest哈希重复；5张交叉归为仅诊断。旧33对/66图与45检查直接继承。R7.3/R1 IN_PROGRESS，严格视觉BLOCKED；原生恢复确认和永久删除入口缺项仍未结。

复查默认仅运行python tools/validation/r7/verify-supplement.py（摘要/阶段真值）；需原始哈希时先从备份恢复文件，再加--verify-raw。补采脚本要求显式R73_CASES和R73_SHOTS且复用已有封闭合成缓存；禁止无理由全量复跑。已停止历史PNG/DOM打包脚本，不提交该打包器。
