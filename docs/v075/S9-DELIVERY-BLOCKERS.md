# S9 最终便携交付阻断与最小后续方案

已验证源码：`a16b11bdc6b59e16323cf89b9c07bb6d2e09d40b`；CI `40320844672` 四项门禁通过。S8.d 开发自动化验收 DONE，S8.b 保持 CANCELLED_BY_OWNER 且生产完全断开。S9 总体 BLOCKED，不存在可下载的本版本 Windows 便携软件。

## 已获得的验收

双平台业务504、流水线182、协议21/146方法；Linux ASAR13套/107项；Windows回收5、迁移7、整库恢复7、复盘6、工作区17及编辑/草稿等自动场景通过。实际Windows回收站720/1366中文截图已逐图查看。详细来源/Artifact校验值在S9-VERIFICATION.json。测试宿主验证不等于最终便携EXE验收。

## B1：没有现成的本PR exact-SHA 只构建入口

- `.github/workflows/pr-quality.yml`：只安装、测试、构建JS和上传validation-results，没有Windows EXE/便携ZIP打包。
- `.github/workflows/develop-rc.yml`：push只监听develop；dispatch没有source_sha或package_only输入；checkout绑定触发SHA，完整流程含质量/安全/打包/校验以及owner环境后的发布。
- `tools/ci/portable-only.mjs:42`：Actions的GITHUB_REF非refs/heads/develop时明确拒绝。不能因workflow_dispatch可选择分支就声称feature包可成功生成。
- `.github/workflows/stable-candidate.yml` / `tools/pipeline/stable.mjs`：只接受受信任main及正式版本，不能拿本feature/RC SHA冒充main候选。
- 当前执行环境为Linux；没有通过现有流程可用的本SHA Windows打包作业。已有报告Artifact不包含GankSoft.exe或目标便携ZIP。

未通过修改守卫、伪造/清除Actions环境、跳过质量/安全/版本检查、启动旧develop构建或自动merge/release解决。本轮未修改工作流或申请更广权限。

## B2：生产统一模型接入尚未准入

`electron/main.ts:137–145`仍打开默认604活动数据库；`electron/infrastructure/database.ts:28`不接受606。普通生产main未接入openUnifiedOwner/createFullRestoreSession；新的统一界面只在查询得到unified模型时加载（src/main.ts），目前受控606的完整流验证由开发宿主提供。

所以即使立即将现有产物打成ZIP，也不能宣称最终EXE已包含可直接使用的已激活v0.7.5统一工作区。保留现有“生产604不自动迁移/真实用户库不触碰”的边界，没有静默初始化空库、增加首次启动向导或私自激活606。本项必须在可审阅的生产接入方案及相应验收中闭环；不是用文档将开发宿主验收改名为生产验收。

## B3：正式版本与最终同包证据缺失

package.json为0.7.5-rc.1；正式0.7.5版本资源、`GankSoft-v0.7.5-win64-portable.zip`尚未生成。不能只改文件名掩盖版本。目标ZIP顶层必须GankSoft/；ZIP完整性/SHA256、80/100字符目标目录解压、最终EXE图片/中文路径/关闭重开/数据保存，以及同包Win10/11真实人工均NOT_RUN。

## 最小后续方案（未实施，不构成自动合并或发布授权）

1. 先针对B2完成生产所有者/默认数据模型及版本准入的明确方案与必要验证；保留真实604的保护和现有快照/租约/唯一活动指针，S8.b始终关闭。不重新设计学习功能。
2. 若所有者选择正常集成：在其显式审核/合并授权后复用既有develop质量/安全/打包流程，并在Release审批前获取通过验收的便携Artifact。本轮不执行合并或发布。
3. 若必须合并前试用：单独批准在现有受信任构建机制上增加最小exact-source-SHA、artifact-only候选模式；验证源码身份/当前PR与有效CI，保留现有安全、EXE smoke、版本和两深度ZIP校验，且发布job必须不可达。不能直接删除develop守卫；本轮不实现该策略变更。
4. 包装时记录实际版本/源码SHA、锁文件SHA、Run/attempt、完整文件清单及ZIP SHA256；只上传通过全部必要检查的候选包。保持GankSoft/顶层及便携ZIP独立交付。
5. 最终同一ZIP在真实Win10/11上解压、启动、关闭、保存/重启与人工操作签核；未完成仍NOT_RUN。正式release:verify继续使用真实同包证据，不自动填写。

## 本轮交付结果

- Windows便携ZIP：未生成。
- 便携构建使用的源码SHA、ZIP SHA256、下载地址：null（没有构建，不能编造）。
- 可追溯的已验证应用源码：a16b11bdc6b59e16323cf89b9c07bb6d2e09d40b。
- 是否可作为v0.7.5便携成品交所有者试用：否；可审阅源码、自动化报告和截图。
- PR13保持Draft/open；不新建分支/PR、不强推、不自动trust审批、不合并、不发布。
