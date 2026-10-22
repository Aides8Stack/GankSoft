# 当前测试账本：S2最终验收工具与字体修复（2026-10-22，Asia/Shanghai）

受测326572b6e46982ac74223547874956ee7f967a28+本轮测试工具/独立构建工作树，Linux Node24.19.0/Electron44.7.2；格式化后仅空白变更，node --check通过。小结及hash见docs/v075/S2-ACCEPTANCE-CHECKPOINT.json，不重复生成大证据包。

| 项目 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 当前基线远端 | PASS质量；可信FAIL | Run39776290661 Ubuntu119816032219、Windows119816032326、pr-gate119817726034和scope成功；pr-trust failure→39776475352，真实owner exact SHA review required |
| 当前环境 | Linux；Windows NOT_RUN | 无pwsh/wine/powershell.exe/cmd.exe；不能执行Windows、真实系统IME/剪贴板/拖拽验收 |
| npm run build / build:editor-spike | PASS | TypeScript/Vue/Electron及独立页面构建，源码/依赖协议不改 |
| 初次人工工具自检 | FAIL（保留原因） | 非焦点h1 locator.press未把Ctrl+S送入编辑区域；修正为ProseMirror.focus再键盘，未改保存代码。日志同时揭露CSP阻止内联data:font |
| 字体修复 | PASS Linux资源范围 | 仅独立vite assetsInlineLimit:0，40本地字体，CSS内data:font为0；CSP不变，自检4次capture failedFonts均[]、browserErrors[] |
| node tools/editor-spike/manual-acceptance.mjs --verify-launcher | PASS | 原页面真实Electron，隔离目录；快照/注入保存失败原文保留/重试/关闭进程再开全文一致；pageerror/browserErrors/external[]。输入是合成自检，不是人工验收 |
| node tools/editor-spike/check-table-interactions.mjs | PASS57/57 | 本轮因字体/布局产物变化重新跑固定3×19，errors[]，没有删除/放宽断言 |
| node tools/smoke-editor-v075.mjs | PASS | 本轮16记录=15PASS+原生颜色限制探针、errors/external[]，已有媒体30/80/重开/公式/保存失败与安全断言保留；失败HTML路径使用专用dir以兼容Windows |
| 业务273/协议21/默认Electron4+5/全pipeline | NOT_RUN本轮，继承有效基线 | 上轮精确基线CI已通过；只改测试工具/构建资源输出，没有重复全套或冒充本轮运行 |
| Windows57及完整editor smoke | NOT_RUN | Linux结果不代替；原Windowsquality不包含这两个编辑器专项 |
| 真实IME/系统剪贴板/拖拽/Windows脱网/ASAR | NOT_RUN | 清单见S2-WINDOWS-ACCEPTANCE；Win10/11分别记录；Base64交换S6仍待做 |
| 新提交CI | 提交内NOT_RUN | 只收集一次精确新SHA初始状态写原PR回执，不等待 |

结论：S2/T05–T08总Gate BLOCKED，已提供可运行人工入口，未进入S3。不改业务编辑器、不换技术方案、不改可信/发布/保护规则。

---

历史账本（当前状态以上节为准）：

# 当前测试账本：S2/T05表格当前意图扩展（2026-10-22）

父SHA 4aebc2682c9e8b46c57bf311e9479432e9d3004a+本轮6份实现/验证工作树，Linux x64/Node24.19.0/npm11.9.0/Electron44.7.2。指纹e1b078dc5a5a4c52ecf6577f22b55ed29e39cdc5a55f3a393011a1f3cd0c777b；UI测试后仅补MIT声明，最终类型/Node6重验，逻辑未变。完整记录docs/v075/evidence/S2-TABLE-CURRENT-STATE，不以旧/未运行结果冒充本轮。

| 验证 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 恢复基线真实CI | PASS质量；可信FAIL | 精确4aebc268… Run39763577036 Ubuntu/Windows/pr-gate/scope success；latest pr-trust failure→39763767234；合并门禁未全通过，用户授权局部S2修复 |
| Windows冷启动收尾 | PASS，故障DONE | 真D:\a\_temp源码外安装13962.7299ms，normal-install.status PASS且该Windows quality成功；不重复C/D，不改已验证测试 |
| npm stable查询/环境 | PASS | crepe与kit latest均7.22.3，版本/lock未改；npm rebuild electron恢复本地测试二进制，无新增依赖 |
| 原生最小复现 | FAIL（真实控制） | node tools/editor-spike/reproduce-table-race.mjs exit1，Applying a mismatched transaction；仅原生Crepe默认配置，无新扩展，原复现/旧失败文件不改 |
| 新表格公开扩展专项 | PASS57/57 | node tools/editor-spike/check-table-interactions.mjs；19固定用例x3，各轮都必须通过。输入/新选择同步发生在click之后、回调之前，非等待后输入；errors[]。RAF/CellSelection原20ms、header、最新点击、删除/替换/销毁、行列/对齐/完整JSON重建 |
| T05自动化范围 | PASS；整体BLOCKED | 标题/列表/表格合成中文长文undo/redo、Tab/ShiftTab真实键盘目标通过；真实OS IME/光标/Win编辑器NOT_RUN，不能记T05整体PASS |
| T06本轮组件路径 | PASS（限定） | 同asset独立placement30/80，平台clipboard.read边界注入，真实media.stage IPC/解码/落盘、保存/销毁重建/进程重启PASS；系统剪贴板/Base64 NOT_RUN |
| T07本轮组件路径 | PASS（限定） | 数学编辑/颜色/格式/图片编码、表格Markdown及重建完整JSON一致，失败保存/显式重试PASS；正式Draft/ContentVersion接线未实现，不冒充S3 |
| T08本轮组件路径 | PASS Linux受测范围 | 多实例/销毁、六类恶意Markdown拒绝、errors[]/external[]；Win脱网/ASAR编辑器资源NOT_RUN |
| 完整editor smoke | PASS（16记录） | node tools/smoke-editor-v075.mjs exit0；15 PASS+1原生颜色限制探针，不把原生无color mark标为支持；保留全部pageerror断言，新增Tab目标断言 |
| Node editor6 | PASS6/6 | node --test --experimental-strip-types tests/editor-v075.test.ts，保存串行/冲突/非法正文/组合输入保护和媒体编码；含于273 |
| npm run ci:quality | PASS | 业务273/协议21/基础设施5/UnicodeZIP1/边界/类型/78定义导出/Vue-Electron-Vite构建；最终vue-tsc --noEmit亦通过 |
| 原默认Electron | PASS4+5 | node tools/smoke-v060.mjs和smoke-system-v060.mjs，完成标记及数量有效；均隔离临时数据目录 |
| 新夹具开发失败 | FAIL记录保留，原因已更正 | pointerdown-only非实际鼠标绑定；setAlign正文单格不是列头对齐；selectRow/Col已dispatch却Boolean(void)=false；跨schema Node.eq身份不等但JSON无差异。现核真实事件/选择状态/完整JSON，未弱化旧测试 |
| 流水线与全ASAR本地重跑 | NOT_RUN（本轮） | 源码仅隔离编辑器，工具/工作流/依赖没变，继承父精确SHA双平台pipeline182/原LinuxASAR成功；本轮没有冒称重跑 |
| Windows编辑器/实机/真实IME/系统剪贴板/Base64/真实拖拽 | NOT_RUN | 原拖拽柄和行列命令存在，不等于拖拽手势验收。Runner质量绿不是Win10/11人工验收 |
| 新SHA CI | NOT_RUN（提交内） | 保存后一次即时Run/check/status写原PR描述和最终回执；不等CI；当前workflow不自动跑新57或editor spike，不能外推 |

结论：带公开NodeView扩展的候选消除了本轮自动化交错中的旧事务/旧选择覆盖，未修改上游或提高延时，没有禁用表格。继续候选验证，暂不安装备选。**S2/T05仍BLOCKED，S3不进入**，FAST/FULL分级实施暂缓，媒体/保存/协议/生产数据库保护不变。

---

历史测试账本，以本节为准。

# 当前测试账本：独立D盘冷启动修复（2026-10-22，Asia/Shanghai）

被测a8b4d61ea43093d86f38a28659351ef16568fffc+本轮4份工具/测试工作树；Linux x64/Node24.19.0/npm11.9.0。实现指纹7da3fc0da72851510d259df66be902d796fd7c9204c7e1aa6c62f74e95ced9c9，逐文件hash、完整输出/原Windows Artifact见docs/v075/evidence/S2-COLD-ROOT-FIX。FAST/FULL本轮仅设计，没有实施分级。

| 验证 | 真实结果 | 证据与限制 |
| --- | --- | --- |
| 原HEAD/CI/status真实核对 | FAIL（继承） | 精确a8b4d61…；Run39759121731 Ubuntu success、Windows119758723844 test:pipeline failure、pr-gate failure；latest pr-trust failure→39759353663；用户授权继续修复 |
| 原Windows Artifact12417536862 | PASS（读证据）；原安装FAIL | 同Job C120045.7208ms ETIMEDOUT/null/SIGTERM、118802.5741ms成功；D10420.721/10469.988ms成功，env/hash/cache一致；旧D位于源码子树，不作为隔离证明；原ZIP无损base64+hash保留，不再重复四次调查 |
| 顶层npm ci预热 | PASS | include-dev/ignore-scripts本地准备381包约6秒，manifest/lock不变；生产正常npm ci未改ignore-scripts策略 |
| 隔离/诊断专项 | PASS20/20 | 新6项真实目录/清理/祖先NM/源码别名/ESM-CJS污染拒绝，加原14项process/comparison；Windows路径选择单测不是Windows实际安装 |
| 正常npm run test:pipeline | PASS182/182 | 捕获完整最终计数、无skip/cancel；保留原176全部检查语义并新增6；每日不执行重型4次实验，实验代码保留可显式运行 |
| 正常完整锁离线冷安装 | PASS（Linux） | 1次6001.938141ms；完整项目lock、原ci参数/120000ms/4MiB、严格error无/signal无/status0；中文/空格/物理无node_modules |
| 安装前真实隔离 | PASS（Linux） | /tmp源码外，祖先无node_modules；ESM ERR_MODULE_NOT_FOUND、CJS MODULE_NOT_FOUND，三种batch入口实际缺yaml非0，不仅检查existsSync；前置证明缺失时不执行正向安装 |
| 安装后完整校验 | PASS（Linux） | package/lock hash不变、yaml2.9.1、npm timing；ESM/CJS均落本fixture node_modules，quality/security/package空plan启动全部0；不冒充模式完整业务验收 |
| 原负向/独立worktree/失败阻断 | PASS（含于182） | 缺yaml、错误SHA/版本、Git detached worktree自己安装小yaml夹具、原历史身份/清理断言、坏lock EUSAGE非0不进入batch；不以小夹具替代正向全锁安装 |
| npm run ci:quality | PASS | 基础设施5/ZIP1/业务273/协议21，边界/类型/78方法导出、Vue/Electron/Vite build；quality.json全部step0 |
| 四次C/D安装专项 | NOT_RUN（本轮） | 已有针对证据足够，未重跑；显式入口experiments/directory-comparison.test.mjs仅语法检查及原调度合成单测，旧源码内B不是隔离入口 |
| 新Windows独立D路径及质量恢复 | NOT_RUN（本地） | 待新SHA的Windows CI，当前没有Windows环境。旧D10.4秒仅估算依据，不宣称新目录已测或整套CI已恢复 |
| Linux ASAR/Electron全套重新执行 | NOT_RUN（本轮） | 业务/构建未改，继承原Run Ubuntu package-check成功；本轮没有把旧证据写成重跑。正常冷启动测试不等于Electron功能验收 |
| FAST/FULL设计 | PASS（文档完整性核对） | CI-QUALITY-TIERS.md涵盖37业务文件/21每日pipeline文件、13/107 ASAR、Windows专项、完整SHA/唯一FULL gate/触发与授权；实施NOT_STARTED |
| 保护规则只读核对 | PASS（可见快照）；完整有效枚举BLOCKED | develop ruleset25463281有strict pr-gate/pr-trust source15368；main25463521未列required checks，classic branch checks为空；rules/branches接口HTTP400拒绝，未改规则，不冒称两分支配置相同 |
| 新SHA远端CI | NOT_RUN（提交内） | 保存后只读一次初始Run/check/status，实际SHA/Run/即时结果写原PR描述，不等CI |
| S2/T05及未验证项 | BLOCKED/FAIL（继承） | 原生Crepe竞态、最小复现/失败/pageerror未改，真实IME/系统剪贴板/Base64/Win编辑器实机NOT_RUN；不进入S3 |

Windows原4次安装合计259.739秒；改成独立D正常1次若同旧D约10.5秒，安装部分预计减少约249秒，但新路径尚待WindowsCI实测，本地6.002秒不能代替。没有复制node_modules、删依赖、取消离线/超时、接受null、削弱断言或改workflow/保护/发布/业务。

---

历史账本，当前状态以上节为准。

# 当前测试账本：同机目录对照（2026-10-22，Asia/Shanghai）

被测e3051b0d95c418c348d3ac725c98e8c8ffacd9f2+本轮5份工具/测试工作树；Linux x64、Node24.19.0/npm11.9.0，非Windows Node24.21.0/npm11.19.0。实现指纹91675ee0bfc0a32ec5e8ade79066d9722be2f2d2a3be3ed6f04800f3a144fad2；逐文件hash/完整旧正向诊断/本地输出见docs/v075/evidence/S2-DIRECTORY-COMPARISON。

| 验证 | 真实结果 | 限制与证据 |
| --- | --- | --- |
| 原HEAD/质量/可信读取 | FAIL | 精确e3051b0…；质量39749260681/Windows119725473546失败，最新有效pr-trust failure→39749485110；本轮授权继续调查，不作为门禁通过 |
| 原Artifact正向诊断 | FAIL；根因BLOCKED | Artifact12413335363/child-t3NvEM；C临时目录120023.6397ms ETIMEDOUT/SIGTERM/null；最后reifyNode Crepe112667ms；保留4份原字节与hash，没有timing JSON，未把缺yaml/坏lock负向混淆 |
| 一次顶层npm ci预热 | PASS | npm11.9安装381包13秒；完整lock未变，仅本地准备 |
| 新专项 | PASS14/14 | 顺序/最多4次/失败仍B/反向失败不能抹除/阈值/实际根非C-D/环境hash一致与逐子进程日志保留；含原5项真实timeout、ENOBUFS、null拒绝与完整诊断测试。Windows路径是合成单测，不是真实Windows |
| npm run test:pipeline | PASS（退出0） | 两次本地执行，最终执行含当前14项专项；捕获的spec日志缺总计，未把预期176推算为实际观测。正向及负向子进程均有持久结果 |
| 其余pipeline文件明确TAP | PASS168/168 | 19文件（排除已实际执行的bootstrap.test.mjs）；无skip/cancel，退出0，不另触发完整锁安装 |
| 最终Linux真实A/B | PASS（仅Linux） | A4283.317817ms/B4195.231366ms，均status0/error无/signal无，实际根/与/，不是C-D；相同完整package/lock与环境hash/cache，physical no node_modules；两次安装无反向；全部manifest/lock/yaml2.9.1/timing/三模式PASS；完整表见LINUX-DIRECTORY-COMPARISON.md/json |
| 本地初始实现验证 | PASS（历史于本轮） | A5519.638ms/B5234.429ms；随后补packageCount和实际盘符解析单测后再验证最终代码，共两次各2安装，非无依据重跑Windows |
| npm run ci:quality | PASS | 业务273/协议21/基础设施5/ZIP1，边界/类型/78方法导出及Vue/Electron/Vite build，quality.json各step退出0；不含新编辑器专项 |
| 120秒/4MiB/完整断言及旧控制 | PASS（保留） | 完整锁ci离线include-dev/ignore-scripts；不复用node_modules、不删依赖、不装小yaml代替全锁；缺yaml、坏lock、独立worktree与全部模式保留；A失败继续B后统一失败 |
| Windows同Job目录对照 | NOT_RUN（本地） | 待新SHA现有Windows CI实际执行；不能用Linux或旧WindowsArtifact替代，慢的底层原因未确认，未调timeout/目录默认生产行为 |
| 新SHA远端CI | NOT_RUN（提交内） | 保存后仅取一次即时Run/status，原PR描述和最终回执记录真实状态，不等待/不轮询 |
| S2/T05及未验证编辑器项 | BLOCKED / NOT_RUN（继承） | 原生Crepe竞态FAIL、最小复现/失败日志/pageerror均不改；真实IME/系统剪贴板/Base64/Win实机未执行；不进入S3 |

本轮完成的是有界对照实现和Linux实现验证；未宣称Windows恢复、未确定目录相关性，更未宣称物理磁盘/AV/平台原因。S1有效基线继承，S2/T05继续BLOCKED。

---

以下历史账本状态以上节为准。

# 当前测试账本：Windows bootstrap CI定向调查（2026-10-22，Asia/Shanghai）

被测为46e404a8a7224946854ae7be3c8a18fa062d82d1 + 本轮3份工具/测试工作树，Linux x64/Node24.19.0。3文件指纹 **8b5d6ec7b62e257dd7f32422377a20502f274ed2342784798b5175c0ae7532ad**；逐文件hash、npm日志及输出见evidence/S2-WINDOWS-BOOTSTRAP-TEST-OUTPUT.txt。原Windows为Node24.21.0/npm11.19.0，不能混称本地相同环境。

| 验证 | 真实结果 | 证据/限制 |
| --- | --- | --- |
| 原PR/Run/Job真实读取 | FAIL（已确认） | 精确SHA46e404a8a7224946854ae7be3c8a18fa062d82d1；Run39745482071 Ubuntu success、Windows119712802877 test:pipeline失败、pr-gate失败；pr-trust最新failure→39745800696 |
| 原Windows失败定位 | FAIL；底层BLOCKED | 顶层npm ci25秒成功，嵌套全锁offline ci120015.5683ms、status=null；旧error/signal/完整输出/npm日志缺失，不能直接判定缓存或超时预算。原日志保存于ORIGINAL-JOB.txt |
| 本地初始离线缓存不足对照 | FAIL（预热前） | Linux npm11.9与11.19均<1秒ENOTCACHED，无子进程error/signal，退出1；不是Windows原故障复现 |
| 单次npm11.19在线ci预热 | PASS | 381包约12秒；仅本地测试准备，不改项目依赖/lock，不触发旧CI重跑 |
| npm11.19隔离真实offline ci | PASS | 同--include=dev/--ignore-scripts/--offline/--no-audit/--no-fund、生产/omit-dev默认、Unicode/空格路径；4737.976ms，status0/error无/signal无；保留npm timing/debug，未复用node_modules |
| npm11.19全量npm run test:pipeline | PASS167/167 | 原162+新增5，无skip/cancel；包含真实冷安装4906.314ms、锁hash/yaml版本不变、三模式启动、独立worktree、缺yaml/损坏lock拒绝；缺yaml和EUSAGE不是此故障 |
| 新诊断专项5项（含于167） | PASS5/5 | stdout/stderr/日志不随源清理消失、不序列化环境、非0拒绝；真实ETIMEDOUT保留null/error/signal、真实ENOBUFS区分、预算不允许取消/扩大、证据独立；均不接受null成功 |
| npm run ci:quality | PASS | 业务273/273、协议21/21、基础设施5/5、UnicodeZIP1/1、边界/类型/78定义导出、Vue/Electron/Vite build |
| 原120000ms与4MiB及全部断言 | PASS（保留/加强） | 无workflow/依赖/审批/发布变更；冷启动依旧物理无node_modules，仍安装完整项目锁，不换小fixture；正向多检查无error/无signal/status0 |
| 本轮新Windows诊断/恢复结论 | NOT_RUN/BLOCKED | 当前Linux不能替代Windows；原始error/signal缺失，**Windows底层根因仍未知，仅修复诊断丢失**。没有证据调整超时，也没有宣称WindowsCI已恢复 |
| S2/T05及其它未验证项 | FAIL / NOT_RUN（继承） | Crepe原生竞态、最小复现、失败日志/pageerror断言均未改；真实IME/剪贴板/Base64/Win编辑器实机保持未验证，不重跑也不顺带标PASS |
| 新SHA远端CI | NOT_RUN（提交内） | 保存后只读一次即时Run/status，实际SHA/状态写原PR描述和最终回执；不等待、不轮询 |

调试：最初独立探针使用不存在的npm路径，属于探针配置错误、未作故障原因证据；按原封装的CLI定位后执行上述真实对照。缓存缺失与预热成功都保存真实退出/耗时/npm日志。诊断测试中ETIMEDOUT/ENOBUFS是主动故障注入，不能冒充原Windows已观测error代码。bootstrap.test仅恢复了无关格式差异，原功能/断言未变。

阶段结论：本地诊断工具与回归通过；原Windows根因及恢复仍BLOCKED，需要下一提交的Windows证据。S1有效基线继承；S2/T05继续BLOCKED/FAIL，不能进入S3。以下为历史账本。

---

# 当前测试账本：S2（2026-10-22，Asia/Shanghai）

环境Linux x64 / Node24.19.0 / npm11.9.0 / Electron44.7.2；npm ci实际安装381包，随后将同版本两个候选移至devDependencies（版本不变）。被测为19ab62dfe806174060478ffdb05fe955bea223bd + 本轮工作树；不是宣称未来提交SHA预先已测。14份实现/依赖/测试文件指纹 **f0b8f3bf2d272e72b9eb18a9034084f0831828375fa9950d82de9bac9f25d4bb**；逐文件hash及输出见S2-TEST-OUTPUT.txt。

| 检查 | 真实结果 | 范围/限制 |
| --- | --- | --- |
| S1.c精确SHA前置门禁 | PASS | quality39726201464 Ubuntu/Windows/pr-gate/scope成功，最新有效pr-trust success→39730661706。S1自动化DONE；真实旧RC/断电/Win实机仍未验收 |
| 最终npm run ci:quality | PASS | 273/273（新增6+旧267），协议21/21，基础设施5/5、UnicodeZIP1/1、边界/类型/78定义导出、Vue/Electron/Vite构建 |
| Node S2六项（含于273） | PASS6/6 | placement双宽度/独立SQLite JSON、非法引用/缺资源、并发保存响应顺序、失败/冲突/销毁、无效文档阻断旧保存、组合输入暂停保存 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron默认604原有启动/集/错题/记忆复盘，完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 原有文件图片/内容交换/604备份恢复/回收站/取消；不能替代新编辑器606草稿或单MD验证 |
| T05 | FAIL / NOT_RUN | 合成composition在标题/列表/表格长文逐字及undo/redo断言通过；但表格点击后即时输入触发原生库异步事务异常。真实中文OS IME/光标与Win10/11均NOT_RUN，不能称T05通过 |
| T06 | PASS（限定路径） | 平台clipboard.read边界注入合法PNG；真实media.stage IPC/解码/文件与settings持久化；同asset不同placement经宽度UI30/80保存→销毁重建→进程重启一致、图片可读。系统剪贴板NOT_RUN；单.md Base64往返NOT_RUN |
| T07 | PASS（编码/fixture范围） | 标题/列表/表格/粗斜体、inline math原生tooltip编辑、block math CodeMirror编辑、颜色mark与安全链接、图片Markdown往返；隔离SQLite JSON测试。正式ContentVersion/Draft写API及单.md Base64往返NOT_RUN，不能等同S3发布 |
| T08 | PASS（Linux受测范围） / NOT_RUN | 无外部HTTP请求；本地KaTeX字体、受控app-media读取；六种恶意HTML/URL粘贴明确拒绝且正文不变；实例/销毁通过。Win10/11离线便携/ASAR编辑器入口NOT_RUN |
| 完整node tools/smoke-editor-v075.mjs | FAIL | 有一次完整成功及多次失败；失败保留pageerror断言，mismatched transaction，强化表格测试暴露；不能选择绿结果宣称通过 |
| 原生最小复现reproduce-table-race.mjs | FAIL（诊断exit1） | 默认Crepe、无GankSoft editor adapter；表格mousedown→下一帧前insertText→旧事务dispatch报错。稳定复现证实非仅本项目adapter问题，stack见S2-NATIVE-TABLE-RACE.json |
| 工具栏/增长/保存边界 | PASS（隔离） | focus内外显隐；编辑高度581.33→821.33px；500ms/显式Ctrl+S、失败保留/重试、单实例销毁与双实例隔离。未实现正式Draft持久恢复 |
| npm run build:editor-spike | PASS | 正常App bundle无编辑器；仅独立入口按需加载。1.1MB大chunk警告保留；不冒充S7性能验收 |
| 候选对照 | BLOCKED / NOT_RUN | 原生颜色不成mark，已受限适配；原生表格竞态未解。Vditor/Cherry仅官方资料对照，未安装/实测，不宣布最终选型 |
| 新完整SHA远端CI | NOT_RUN（提交内） | 保存后只取即时状态，真实SHA/Run写原PR描述/最终回执；不等、不轮询 |
| S1保留未验证项 | NOT_RUN/BLOCKED | 真实旧RC、Win10/11、真实断电/磁盘耗尽/ACL、Windows目录fsync/未知恢复锁；不自动操作真实库 |

调试记录：原始测试误计Crepe表格辅助空table（实际正文table.children一张），改查实际正文/两行；GFM长单元格会重排表格填充，改逐字DOM及完整undo/redo而非仅比较Markdown字符增量。旧测试未改。首次PNG fixture不能解码，被真实host拒绝，随后用@napi-rs/image生成合法PNG；Vue深ref导致structuredClone拒绝，验证页改shallowRef。真实无桌面剪贴板写后read无图，明确保留NOT_RUN并只在平台读取边界注入。表格异步竞态未修复，没有用等待、skip或吞错制造通过。

阶段结论：S1自动化DONE；S2 BLOCKED（明确FAIL存在），不具备S3准入。不对真实用户数据库做升级或新写入。以下历史账本不是本轮重跑。

---

# 当前测试账本：S1.c（2026-10-22，Asia/Shanghai）

环境Linux x64 / Node24.19.0 / npm11.9.0；同环境锁依赖不变。被测为f24c6b05e10e925a52a7ff57c62f300a40597d25加本轮12份实现/测试工作树，指纹 **8bab4d7db5666b02cbf6d091f0efacbe7bd68938e0958394a1faa34ddaa953f6**。逐文件SHA256和最终输出见docs/v075/evidence/S1C-TEST-OUTPUT.txt；不是声称提前测试未来提交SHA。

| 检查/命令 | 结果 | 实际范围与限制 |
| --- | --- | --- |
| 前序精确SHA门禁 | PASS | f24c6b05e10e925a52a7ff57c62f300a40597d25；quality39721268828 Ubuntu/Windows/scope/pr-gate成功；pr-trust success，target39723537044 |
| 最终npm run ci:quality | PASS | 267/267（新增30+全部旧237），协议21/21，基础设施5/5，UnicodeZIP1/1，边界/类型/78合同导出及Vue/Electron/Vite构建exit0，无skip/cancel |
| T02 no-op/指纹/来源 | PASS（合成Linux） | 604→606、两次no-op逻辑全表/媒体digest不变，独立副本同ID/版本/cycle/event；缺历史unknown/partial和原0–4/9.3/null不改；源库不被修复 |
| T02 同事务adapter/重开 | PASS | 原question.save/memory.submit与projection/watermark/receipt同commit，重放只一次；起始及逐卡投影中途故障均回滚旧写、新版本、回执和revision；旧事件原文逐条保留；重开/606再备份恢复/新epoch通过 |
| T03 新混合集 | PASS（合成Linux） | 一个全新deck保留旧kind元数据且三模式共存，原question/memory deck映射不变；编辑Draft/新版本独有图片30%字段无损606备份恢复并受控激活/协议读取。不是S2编辑器交互验收 |
| T04 模型回滚 | PASS8项 | DDL/逐卡/逐事件/commit前各一次异常及一次子进程exit43，WAL重开仍604原指纹，之后重跑606/no-op成功 |
| T04 协调中断 | PASS9项 | frozen/source-backed-up/model:card/event/before-commit/model-ready/prepared/pointer/committed各一次子进程exit47，恢复源或目标准确且再次恢复/重开一致；无两个合法活动写者 |
| T04 备份/闭包 | PASS | 604与606都实测还原；606当前/历史/作答/暂存/版本独有缺图（重算合法manifest后）拒绝；清单错schema、不可变约束缺失拒绝；已有目录文件保留 |
| T04 写屏障/路径错误 | PASS | 原协议/旧句柄冻结、外部SQLite写被reserved lock阻断、同进程/子进程争租约及活PID不可回收；epoch篡改拒绝；真实目标EEXIST、注入ENOSPC、提交后响应丢失、已提交目标丢失不回旧路径 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动/API、deck UI、错题揭示提交、记忆复盘，完成标记有效；默认604路径 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片/对话框、二进制内容交换、604备份恢复/epoch、回收站/取消/操作日志；606证据另由专项提供 |
| 旧测试/协议/依赖/流水线保留 | PASS | 旧测试源码、registry/共享合同/前端、依赖/lock、.github/tools均无改动；未删/skip/弱化；仅新增S1.c专项 |
| 当前新提交远端CI | PENDING_NOT_OBSERVED（提交内） | 保存后只即时读取一次，真实SHA/Run/状态写原PR描述和最终回执，不等待/轮询 |
| 当前新SHA Windows/Ubuntu Runner/ASAR | NOT_RUN | 本地Linux不代替Runner；进入S2前按新完整SHA核实 |
| 本轮pipeline162项/完整本地ASAR | NOT_RUN | 流水线未改，继承S1.a pipeline证据及S1.b远端门禁；本轮基础设施5项实际重跑 |
| Win10/11实机、真实旧RC样本 | NOT_RUN | 没有用户私人DB；合成和隔离目录不可冒充实机或真实RC迁移 |
| 真实断电/磁盘耗尽/ACL、Windows目录fsync、恢复进程再崩溃 | NOT_RUN/BLOCKED | ENOSPC是注入，process.exit不是断电；未知recovery.lock保守阻断，不自动删锁。电源/目录迁移扩大验收归S8 |
| 生产真实库自动激活 | NOT_RUN（未接入） | 仅显式受控后端路径端到端验证；默认604，未自动迁移；整个S1未放行S2 |

调试：最初tsc指出3处nullable路径未缩窄，修正never函数声明后通过；新增30项最终全部PASS，旧237项保持PASS。未通过删测试、降低解码/审批门禁制造成功。604旧备份继续保留opaque附件字节的原语义；迁移604和606图片预检严格解码，所有604/606完整备份补齐引用闭包校验。

阶段结论：S1.c本地实现/验证DONE；T02–T04上述自动化范围PASS。当前完整SHA远端质量/可信仍待核，因此S1整体IN_PROGRESS，本轮不进入S2，也不宣称生产升级/全部存储故障场景已验收。以下为历史证据。

---

# 当前测试账本：S1.b（2026-10-22，Asia/Shanghai）

环境：Linux x64 / Node24.19.0 / npm11.9.0；依赖沿用S0同环境锁安装，package/lock自S1.a无变化。被测为d334d91a26478c2ea4e899126f172138da91ebfe + 本轮实现工作树；实现13文件规范JSON(path/sha256)指纹 **9ded731c398b2027f069801b3a5f6de5c0d2a319e053b1524b97676da8483006**，见S1B-TEST-OUTPUT.txt。不能把quality.json的基线SHA误当未来提交已测。

| 检查/命令 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 前序精确SHA GitHub质量/信任 | PASS | d334d91；39718272521的Windows/Linux/scope/pr-gate均success；pr-trust status=success，target39719132662 |
| 远端schema占用核对 | PASS | 全部已fetch origin分支仅图片恢复分支605，其余604；606未占用；生产未升级 |
| 最终npm run ci:quality | PASS | 237/237业务（旧227+新增10），协议21/21，基础设施5/5，UnicodeZIP1/1，协议边界/类型，78定义导出，Vue/Electron/Vite构建exit0 |
| 新增S1.b专项（含于237） | PASS10/10 | 原42表+sqlite_sequence逐行/媒体字节保留、3card/7version/5cycle/4event映射与unknown/raw9.3/空新分、pending/未知结构/源路径阻断、不可变/跨卡FK/事件唯一、单模式Draft CAS、混合同deck三类型与独立模式版本、旧token歧义/跨集隔离、DTO非法选项/分数拒绝、独立正误/0–100存储与索引、真实protocol只读/旧写路径回归、分页/revision/epoch/预算 |
| 摘要规模与预算 | PASS | 106卡，每卡3万字符正文；50条/页最大13497 bytes；没有正文/历史字段；遍历无重复/遗漏；606使用learning_cards_deck索引，不读版本document |
| 旧合同/门禁/依赖保留 | PASS | 原75个方法的全部JSON schema及envelope/semantics逐项相等；仅新增3个query。旧测试源码不改，无workflows/tools/pipeline/发布门禁/依赖改动 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动、deck UI、错题揭示提交、记忆复盘；完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片解码/对话框、二进制内容交换、完整604备份恢复/epoch、回收站、取消及操作日志；不是606备份验证 |
| 当前提交GitHub CI | PENDING_NOT_OBSERVED（提交内） | 保存后即时读取并记精确SHA/Run/状态到PR描述及最终回执，不等CI |
| 当前提交Windows/Linux远端完整quality/ASAR | NOT_RUN | 本地不能替代Runner；下次按精确HEAD核实 |
| 本轮npm run test:pipeline | NOT_RUN | 流水线未改，继承S1.a的162/162证据；本轮ci:quality基础设施5项实际重跑 |
| Win10/11人工、真实旧RC用户库 | NOT_RUN | 仅合成隔离库，无私人数据 |
| S1.c幂等/中断回滚/重开/606备份和激活 | NOT_RUN | 未实现完整恢复协调/启动升级，stage副本不能作活动库；T02–T04及整个S1未通过 |

调试：首次新增9项为8/9，失败是测试把client的本地Zod校验误认作host错误码；改为向真实gateway传非法limit并精确断言VALIDATION_ERROR，未放宽任何断言/协议或旧测试。随后补独立新事件/索引专项，最终10项及全量237全部PASS，无skip/cancel/fail。当前实现测试后未改；后续只有执行文档和证据。

旧评分0–4/原自评9.3/空值、旧实际rating、原fault/evidence/schedule留存；新scoreTenths/rating保持null。没有启用新评分行为或重算排期。已验证模型约束和一次隔离构建，不把它当作S1.c幂等/故障/恢复验收。

审阅：AUDIT.md为旧infra任务的0.7.3/a0fb65d记录，不能替代S0实测基线；只继承仍有效证据。当前最终SHA从远端PR/head解析，提交不能包含自身SHA。

以下为历史测试账本，不冒充本轮重跑。

---

# 当前测试账本：S1.a（2026-10-22，Asia/Shanghai）

环境延续S0：Linux x64 / Node24.19.0 / npm11.9.0。被测基线为acf8556bf5691ce49d380cac93842f9804c065ac加本轮7份实现/fixture/版本文件工作树；不是声称已测试未来提交SHA。实现文件指纹：e166e3f25d85a17b7b9740be69e36e0900590d13a399f48bbd75f058c737fffc（规范JSON(path/sha256)列表见证据文件）。

| 检查/命令 | 真实结果 | 范围 |
| --- | --- | --- |
| S0远程HEAD/CI/继承证据核对 | PASS | acf8556；39715355519/39715352908 success；无源码前移，不重复S0全审计 |
| 冻结fixture的schemaHash | PASS | 355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad，与S0一致；42用户表+sqlite_sequence；全合成 |
| 最终npm run ci:quality | PASS | 基础设施5/5、UnicodeZIP1/1、业务227/227（旧202+新增25）、协议21/21、边界/类型、75定义导出、Vue/Electron/Vite构建全部exit0 |
| 25项S1.a专项 | PASS（含于227） | schema/marker/缺表、元数据只读、WAL恢复/重复制作、所有表行和媒体hash、原始空自评/缺快照、AUTOINCREMENT/重复行/大整数/BLOB、ID碰撞/空ID、缺历史/未绑定/会话图片、跨集/循环、坏JSON/FK/图片、并发变化、3故障点/重试、不覆盖目标/错误源路径/未结束事务、ZIP损坏、独立子进程exit37 |
| npm run test:pipeline | PASS162/162 | 原审批/门禁/RC/版本/便携回归保持；无工作流改动 |
| npm run version:check -- origin/develop | PASS | 0.7.5-rc.1高于0.7.4-rc.6，Tag/Release未占用；只改根版本，不改依赖 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动、deck、错题复盘、记忆复盘；完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片对话框/解码、二进制内容交换、备份恢复/epoch、回收站、取消/操作日志；完成标记有效 |
| 最终diff/敏感信息/版本锁/原测试保留核验 | PASS | git diff --check、允许文件/敏感信息/锁版本/旧测试保留核验；不提交DB/图片/zip/构建产物 |
| 当前S1.a检查点GitHub CI | PENDING_NOT_OBSERVED（提交内） | 推进远端后即时查询，完整SHA/Run记最终回执和原PR描述；不等CI |
| Windows/Linux远程本轮完整quality/ASAR | NOT_RUN | 本地GUI不能替代Runner；后续按精确SHA核实 |
| Win10/Win11人工/真实旧RC用户库 | NOT_RUN | 无私人数据库；没有把合成fixture冒充真实RC样本 |
| S1.b/S1.c增量迁移、混合三模式模型/新typed API、迁移幂等/回滚 | NOT_RUN | 未实现；本轮只完成T02/T04前置，不宣称整个S1/T02–T04通过 |

调试记录：初次专项20/22，两个ID碰撞fixture同时破坏了旧回执引用，先被已有完整性检查拒绝。仅修正合成fixture的依赖引用以隔离碰撞缺陷，保留精确错误码断言；22/22通过。后续补源schema标签/空ID/会话媒体验证，最终新增25项并入227全部通过。最终源码无测试失败/跳过/取消；旧测试/断言未删除或放宽。

依赖沿用S0同环境的锁安装；本轮lock除两处根版本外与S0完全相同，不重新做无变化的安装/审计。前期check/quality结果只作调试过程；最后一次ci:quality对上面最终实现指纹完整执行。持久输出与各实现SHA256见docs/v075/evidence/S1A-TEST-OUTPUT.txt。

以下为S0历史测试记录，不冒充本轮重跑。

---

# TEST_REPORT

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

阶段 S0；日期2026-10-22（Asia/Shanghai）。被测应用源码/依赖为基线7970896c0306833e3b2f54a843f388d2e380618f；测试时工作树仅任务文档不同，不能声称提前测试了尚未产生的提交SHA。最终文档提交的应用tree/blob与此基线一致，提交前再核。

环境：Linux x64，Node24.19.0/npm11.9.0；锁定Vue3.5.44、Electron44.7.2、TypeScript5.9.3、Vite8.3.4、Mind Elixir6.0.0-next.4、ts-fsrs5.4.2、Zod4.6.7、@napi-rs/image1.15.0。只使用既有测试mkdtemp临时库和S0内存空库，无私人数据库。

| 命令/检查 | 实际结果 | 证据/边界 |
| --- | --- | --- |
| python 包内09-tooling/verify_package.py | PASS | required33、10阶段、manifest/SHA256一致；不是生产测试 |
| 新checkout/status/远端develop/分支/PR/CI核对 | PASS | baseline与来源一致；启动干净；无已有v075分支/PR；旧开放PR不改 |
| npm ci --include=dev | PASS，194包 | 未改lock，未ignore-scripts；Electron首次使用下载二进制后实际smoke成功 |
| npm test | PASS202、FAIL0、skip0、cancel0 | 当前全部tests/*.test.ts，含核心/SQLite/复盘/导入/图片/备份；非覆盖率百分比 |
| npm run check:protocol | PASS21、FAIL0、skip0 | 协议回归另跑21（已含在202中，不重复累计独立数）；边界/tsc/导出75定义均exit0 |
| npm run build | PASS | vue-tsc、Electron tsc、Vite229 modules；构建产物未提交 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron临时库：boot/API、deck UI、错题揭示/提交、记忆复盘；完成标记有效；不是Win/完整ASAR |
| S0 openDatabase(:memory:) + Application + createApplicationProtocol + PRAGMA | PASS | 42张表、integrity=ok、FK0行；SCHEMA604-INVENTORY含所有字段/外键/DDL和fingerprint。只读审计策略未实现迁移 |
| 本地Electron打开OPEN-ME-v3.7.html/审阅主要页DOM | PASS（限参考审阅） | 首页/deck/cards/editor/review/knowledge/settings，附MD大纲/交换DOM检查；无pageerror不代表生产功能通过 |
| 原型headless screenshot/outline物理点击 | BLOCKED | screenshot超时，outline按钮超出该headless视口；没有更改原型/生产代码来掩盖。DOM事件审阅和包内静态截图仅参考，不是鼠标/截图验收 |
| npm run test:ci | PASS5/5，FAIL0，skip0 | 既有基础设施自检，无门禁修改 |
| 新增文档范围/历史归档/决策原文/链接/git diff --check | PASS | 5份归档逐字节一致、3份权威原文一致、T01–T45保留、内部链接有效、git diff --check通过；无数据文件、依赖、测试、工作流变更 |
| 本分支实现检查点GitHub PR CI | PASS（8fa96a0，仅文档CI） | Run39715137420 completed/success；下方完整SHA绑定；最终回执提交是新head，CI保持PENDING待即时核实 |
| 全量ASAR/其余生产GUI smoke | NOT_RUN | S0无应用行为变化，本轮仅必要4项smoke；基线CI成功独立登记 |
| 新schema/新评分/三模式/Markdown POC/迁移回滚 | NOT_RUN | S1–S9未实施，T02–T45尚非通过 |
| Win10/Win11人工及本轮Windows便携验收 | NOT_RUN | Linux与GitHub Runner不能冒充实机签核 |

持久证据：docs/v075/evidence/BASELINE-TEST-OUTPUT.txt（命令输出）；schema清单fingerprint；本目录后续远程回执。原型首次脚本错误使用npm模块路径获取Electron API、后续截图/点击超时均只影响临时参考查看脚本；纠正require('electron')后页面实际可打开。最终应用测试无FAIL，不删/skip/降低现有测试。

文档检查记录：初次暂存检查发现原始DOM输出尾部空白，已在远程保存前规范化；最终相对develop的 git diff --check PASS。应用测试无变更，无重新运行必要。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
