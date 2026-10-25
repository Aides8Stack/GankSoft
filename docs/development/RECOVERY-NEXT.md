# 恢复入口：S7.f 大树与窗口验收

继续原仓库Aides8Stack/GankSoft、原分支feature/v075-unified-learning-workspace、Draft PR13→develop。S0–S7.e继承，不重新克隆/初始化/新建分支。生产schema604不自动启用606；只用合成隔离606数据。

## 已保存与CI

完整设置/历史证据/返回焦点检查点c1bcbc02d158697b12c5a216e0ccbc8f0435aad9，CI40173592122两平台与pr-gate真实PASS。Windows设置1366/720截图已查看，中文可读、布局不溢出。

原生窗口检查点207156d362834af3d2929743085854dcd3cec7cd已独立fetch核验。CI40199402638失败Job已读：Windows夹具680高低于720最小值；Ubuntu ASAR knowledge-filter点击被html拦截。窗口夹具改为支持尺寸，并将合成E2E窗口状态隔离到各自dataDir，排除跨测试继承（Ubuntu根因/效果待复验）。修复保存c35298b35a5cdb44df79b46a418580931de72c38，tree216883441a50b514405fc3edcfb9b7cc7c598c0b，本地7f371bd代码树相等。CI40200339283即时queued，没有等待/轮询。正常应用仍保存userData视图配置。

## 当前大树实现

新增只读knowledge.tree.layer/locate（135方法），大树初始只取50个roots，展开按父节点取children/翻页，搜索只取祖先路径。treeHash拒绝跨修订缓存；正文/媒体按需读取。复用锁定Mind Elixir的expanded、bus.expandNode、refresh和展开API，没有修改依赖或私有原型。视图加载标记不进入CAS；显式载入完整结构后才启用编辑，后台也拒绝不完整树删除。构树改为线性分组；大纲折叠同步。部分结构下正文只读，取得完整结构后编辑。搜索展开当前模型，不从旧持久化行重建，保留未保存改动。

已通过：大树4专项，受影响知识/Markdown业务合计27/27，协议21项/135方法，构建、边界/类型；大树Electron7、原知识Electron10。最后搜索保留未保存修改补丁已构建并通过专项，工作台17场景相关回归PASS。Linux无CJK字体；原生getNormalBounds为0且无窗口管理器，所以完整中文视觉/原生窗口不能在本机记PASS。新专项已接入原Windows质量流程，没有删测试/扩大超时。

## 首个未完成与连续推进

1. 完成当前搜索保留专项、工作台相关回归与必要ASAR验证；将真实结果更新TEST_REPORT/S7F-ACCEPTANCE。
2. 核实新CI的真实失败Job（若失败才读日志），查看Windows大树/完整宽窄截图并完成T33–T37剩余项，不将几何断言冒充完整视觉。窗口最大化/重启以Windows专项为准。
3. S7原Gate全部满足后连续S8→S9；当前S7 IN_PROGRESS，S8/S9 NOT_STARTED。Win10/11人工IME/物理图片操作/最终便携同包NOT_RUN，不自动发布或启用生产迁移。

每个独立功能及时保存全部源码、测试、配置及必要摘要，不等待CI；检查点不代表结束。只上传已检查非敏感内容。API保存基于最新远端tree/parent、expected_sha、force=false；本地/API父链可能不同但代码树已核验，不reset/强推。当前提交自身SHA由Git/原PR实时解析，不为回填自身SHA空转提交。失败保留所有成果；无法推送则完整Git bundle+源码备份并独立恢复验证。
