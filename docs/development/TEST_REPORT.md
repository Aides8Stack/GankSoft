# G3 Inno修复测试报告

基线605666c17d1b43a07f0cc1559741c3d6c53daf1b；fix/g3-inno-version → develop；版本0.7.4-rc.4。
被测对象：该基线加本PR工作树；Linux Node24.19.0/npm11.9.0。
PASS：npm ci --include=dev --ignore-scripts（本地pipeline依赖，不冒充Windows应用安装）。
PASS：node --test tools/pipeline/windows-version.test.mjs tools/pipeline/owner-rc.test.mjs，30/30。涵盖stable/rc.1/rc.3/rc.4、全部RC槽不碰撞/排序/溢出/非法与不支持格式拒绝、实际PE数值与文本、真实Git历史worktree元数据子进程、dirty/错coordinator、制品来源/版本/installer工具证据篡改和既有人工审批。
PASS：npm run test:pipeline，150/150（原144保留，新6项）；无删除/skip。
PASS：CRLF独立副本专项30/30（Linux模拟Windows文本换行，不等于Windows OS）。
PASS：version:check相对origin/develop、diff检查及源码/工作流守卫；精确源码摘要见docs/ci/evidence/g3-inno-validation.json。
BLOCKED（未获得成功证据）：本地Wine真实Inno尝试，wineserver socket Operation not permitted；官方6.7.1安装程序hash已核实，但编译器未成功运行，不能记编译PASS。PR Windows新增强制真实四版本ISCC编译与Setup PE检查，结果待新CI，缺compiler/失败均阻断。
NOT_RUN：完整Windows应用安装器成功、安装/启动/卸载/DisplayVersion、便携ZIP/历史RC完整重建；Win10/11人工；真实RC审批/发布。本轮未重跑业务/ASAR或G2全量审计。

原Run39522154104：preflight/security/双平台quality通过，windows-package118970526040失败，artifact-verify/release跳过。原始编译错误在历史rc.1 worktree的Inno ProductVersion字段；该失败不是新修复的验收证据。新CI仅记录首次触发，不等待。
