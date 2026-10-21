# G3 PR #9 Inno文本资源校验续修

状态：IMPLEMENTED_PENDING_CI。分支fix/g3-inno-version → develop；前序fe0b50b55818d0a5e05dec00763bf228d47eb4c4；版本仍0.7.4-rc.4。

Run39526054475/Windows Job118980892470日志证实ISCC6.7.1成功编译正式版GankSoft-v0.7.4-win64-setup.exe，随后旧原始字符串等式断言失败。旧日志未输出四字段值、旧artifact只包含失败JSON且未保存EXE，不能宣称已直接读取该失败文件。固定6.7.1源码证明FileVersion20、ProductVersion50字符占位，UpdateStringValue保留尾部空格；官方6.7.1安装器实际资源只读解析也证实该行为。具体证据、已观测值与推导值分开记录在docs/ci/evidence/g3-inno-resource-diagnosis.json。

实现：共享versionResourceEvidence/requireVersionResources，精确比较两项数字资源和所有语言表两项文本资源。Inno文本必须等于完整SemVer右侧填满20/50字符ASCII空格，应用文本仍须精确等于SemVer。没有通用trim/包含比较；异常填充、错误RC、非空格字符、额外语言表篡改、数字错误和文本容量溢出均拒绝。生产PowerShell保留.NET数字检查，文本改用同一原始PE校验；报告记录actual/expected/mismatches。真实编译测试仍覆盖正式版、rc.1、rc.3、rc.4，断言前打印/保存资源实值、期望、PE哈希和已编译EXE，失败也保留该case证据。

保留：历史source/coordinator工具身份及逐文件hash、历史RC队列，短下载名GankSoft-v{version}-win64-setup.exe / -portable.zip、ZIP顶层GankSoft/、Windows80/100字符目标实解压、全部SHA/manifest/安装启动卸载/审批与发布门禁。未改installer.iss生成逻辑、业务代码、工作流权限、Ruleset或Environment。无G2重审，无合并/Release/Tag操作。

本轮工作树本地PASS（Linux Node24.19.0/npm11.9.0）：
- node --test tools/pipeline/inno-resources.test.mjs tools/pipeline/windows-version.test.mjs tools/pipeline/delivery.test.mjs tools/pipeline/owner-rc.test.mjs：36/36，零skip；新增3项，原33项保留。
- npm run test:pipeline：156/156，零skip；原153项保留。
- CRLF独立副本相同专项：36/36。
- python tools/ci/test_zip_manifest.py：1/1，保留中文/非UTF8默认编码回归；Linux未执行Windows分支。
- version:check相对origin/develop：0.7.4-rc.4 PASS；Node语法、diff及source/workflow guard PASS。
NOT_RUN：修复后的远程真实Inno四版本/Windows实际解压、完整GankSoft安装器安装启动卸载、历史RC完整打包、Win10/11人工。本地Wine再次被socket Operation not permitted阻断，不能声称本地真实编译成功。旧Run正式版真实编译成功不等于资源验收或G3成功。G2/业务/ASAR有效历史验证继承，未重跑。

下一步：核实同PR准确新SHA的CI（尤其ACTUAL_INNO_RESOURCES、inno-compile.json及inno-binaries中的四版本原始PE，随后Windows实解压）；如失败只修具体字段/运行问题。所有者完成pr-trust独立授权后决定合并；新的develop协调Run才会使用修复工具，原全门禁通过后才进入rc-publish-owner。远程完整SHA/tree/parent、新Run首次触发回执写在PR描述和最终交接；核实即退出，不等待或轮询CI。
