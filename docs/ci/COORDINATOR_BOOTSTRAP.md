# RC / Stable candidate 协调器冷启动修复

基线：`5ffcd1a9b975b7e192c7e18727773448eb7a205e`。
实现检查点：`83b4347fd52ca34202aae49e68d7032c95a5977c`。

`batch.mjs` 顶层导入 `security.mjs`，其静态依赖 `yaml`。yaml 是锁文件固定为2.9.1的 devDependency。六个 Job 原来直接运行 batch；batch 内的工作树 `npm ci` 发生在模块加载之后，无法修复协调器自身缺失依赖。

最小修复：在 develop-rc、stable-candidate 的 quality、security、windows-package 各入口紧邻 batch 前加入 `npm ci --include=dev`。默认成功条件保留，安装失败即终止该 Job；后续质量／安全／打包／制品核验／发布的 needs 图不变。没有改 batch、锁文件、权限或发布授权。

专项测试 `tools/pipeline/bootstrap.test.mjs`：

- 真正复制协调器源码、package/lock到无 node_modules 的临时目录；三种模式都复现真实 `ERR_MODULE_NOT_FOUND: yaml`。
- 用真正的锁定 npm ci，在 production／omit-dev 默认值下显式 include-dev，验证 yaml 安装版本与锁一致、锁内容未变。三种空队列模式可启动；该项是启动探针，不是质量／安全／Windows 打包实测。
- 冷启动探针使用 `--offline --ignore-scripts`，隔离网络和无关生命周期脚本；生产六个 Job 使用普通 `npm ci --include=dev`，未跳过生命周期脚本。
- 对六入口执行 YAML 结构校验，覆盖 LF/CRLF；48种缺失、后置、非锁定安装、排除dev、条件跳过和忽略失败变体必须拒绝。新增其它 batch 入口没有安装步骤同样无法通过。
- 真实临时 Git 源码夹具检查错误SHA／版本拒绝、detached工作树独立npm ci、依赖与当前SHA实际核验、报告保存和工作树清理；此为编排夹具，不冒充应用测试。
- 真正损坏临时锁文件，确认 npm ci 非零，success-only执行序列不进入batch。结构断言另确认真实工作流没有 always()/continue-on-error 绕过。
- Linux中文／空格路径实际执行；Windows盘符路径形态检查。相同测试加入 test:pipeline，Windows实际行为由新PR CI核验，不能把Linux结果写成Windows通过。

最终本地：专项8/8、流水线89/89、业务202/202、协议／类型／构建、带完整性门禁的ASAR13组107项均通过。源码、锁和原始日志哈希，以及实际冷启动/安装/工作树证据见 `evidence/coordinator-bootstrap/validation.json`。第一次流式pipeline日志缺少最终统计，保留为INCOMPLETE，未按退出码0放行；独立完整捕获的重跑确认89项全部通过。

新SHA的CI、增量安全复审和G2平台配置／真实阻断尚未完成；未运行真实RC／Stable发布、撤回或Tag操作。提交后仅确认远程检查点和Actions触发，不等待CI。
