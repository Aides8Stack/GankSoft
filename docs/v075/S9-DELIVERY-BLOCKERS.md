# S9 当前交付条件（2026-10-27，所有者最新指令）

停止UI原型对照、视觉整改和非必要开发。六页已接入正式606；真实生产入口7页及新建/发布、编辑/发布、答错Again/保存、重新加载历史功能冒烟PASS，没有由本轮有效证据确认的P0/P1功能阻断。已有视觉差异不阻塞交付。

当前必须完成：

1. **新Windows CI复验**：Run40328357083因编辑器探针等待旧604标题失败；仅启动校验修复，本地57/57等通过，原断言/超时/门禁不变。保存后以新SHA的CI为准，未完成记PENDING。
2. **等待所有者审核与授权合并**：原PR #13仍Draft、未合并。独立pr-trust在基线SHA为FAIL；tools/tests/config变更需所有者对最终完整SHA审核，助手不自行放行。现有develop-rc.yml及portable-only仅接受develop；CI全部通过后可建议合并，未授权不执行、不改守卫、不伪造来源。
3. **实际ZIP与同包验证**：合并获准后用既有流程构建GankSoft-v0.7.5-rc.1-win64-portable.zip（当前实际版本）；一个ZIP、顶层GankSoft/、包含GankSoft.exe、不生成安装器。校验实际源码SHA/版本/SHA256、Windows解压、正式606 EXE核心操作/图片中文路径/保存重启。生成前SHA256/Artifact地址为空。Win10/11人工未执行保持NOT_RUN，不阻止RC候选构建、不冒称完成正式人工签核。

既有正式606/ASAR/FSRS/备份恢复/目录迁移/持久化有效结果继承，不重做数据库或迁移；604源码及隔离107项保留；S8.b已取消且生产完全断开。没有增加首次启动下载或缓存。Release仍需独立授权，不自动批准rc-publish-owner。

恢复入口：docs/development/RECOVERY-NEXT.md。新CI未完成时保存PENDING并交接，不能冒称通过或已生成便携包。
