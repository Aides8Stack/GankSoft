# S2 Windows 人工验收（待执行）

当前S2/T05–T08总Gate **BLOCKED**。此清单不是通过证明；填真实结果后再评估。当前编辑器仍是独立验证组件，未接正式页面/草稿/发布；不进入S3。

## 启动（Windows 10/11，Node24+）

在原仓库的干净源码副本打开PowerShell，确认分支为`feature/v075-unified-learning-workspace`、完整HEAD等于PR13最新检查点。保留本机现有用户库，不复制或指定用户数据目录。以下命令逐条执行，遇失败停止并保留日志；不要运行原生未适配竞态诊断来要求其转绿。

```powershell
git branch --show-current
git rev-parse HEAD
npm ci --include=dev
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'build failed' }
npm run build:editor-spike
if ($LASTEXITCODE -ne 0) { throw 'spike build failed' }
New-Item -ItemType Directory -Force validation-results | Out-Null
node tools/editor-spike/check-table-interactions.mjs 2>&1 | Tee-Object validation-results/windows-table.log
if ($LASTEXITCODE -ne 0) { throw 'table regression failed' }
node tools/smoke-editor-v075.mjs 2>&1 | Tee-Object validation-results/windows-editor.log
if ($LASTEXITCODE -ne 0) { throw 'editor smoke failed' }
node tools/editor-spike/manual-acceptance.mjs
```

自动化要求：`validation-results/s2-table-interactions.json`为57/57、errors为空；`editor-v075.json`全部断言通过、errors/external为空（原生颜色限制探针不算生产支持）。这是Windows自动化，不代表下面真实IME/剪贴板/拖拽通过。普通build会清除独立入口，因此必须先build再build:editor-spike。

人工工具显示真实Electron窗口，使用新建的`%TEMP%\gank S2 人工验收 *\data`，不读取真实用户库；不注入IME/剪贴板，不自动填写人工PASS。终端输入`capture`保留当前与最近成功保存的完整JSON、截图、状态和错误；`restart`关闭并重新启动Electron，核对最近成功保存的完整文档；`quit`记录后退出。**用终端restart/quit代替点窗口X**，否则无法可靠取得最后快照。目录及report.json路径启动时打印，工具不会清理它。

现有页面保存adapter是内存示例；工具将其最近成功结果保存为测试JSON并在进程重启后注入原页面，同一隔离资源库保留。它用于编辑器序列化/资源重开验收，**不证明正式Draft持久化或断电恢复**；未保存内容另留在capture文件，不自动覆盖成功快照。

## 最少人工操作

每行记录PASS/FAIL/NOT_RUN、OS版本、输入法和证据；有丢字、光标跳变、pageerror或内容差异即FAIL。Windows10和11分别记录；只测其中一个不能声称两个已验收。

| 项目 | 实际操作 | 预期结果 | 结果 |
| --- | --- | --- | --- |
| T05真实中文IME | 用本机中文输入法在标题、列表、表格各连续输入数段中文；组合期间移动选区/光标，完成后Ctrl+Z/Ctrl+Y；表格点格后立即输入 | 字不丢不重，光标/选区合理，撤销重做完整；组合期间Ctrl+S不提交半成文字 | NOT_RUN |
| T05表格操作 | 在真实UI新增/删除行列；Tab/Shift+Tab跳格；使用原生行列拖拽手柄实际拖动，再立即中文输入；capture | 目标格正确、行列内容与顺序正确，无事务错误；不能用命令调用代替拖拽 | NOT_RUN |
| T06系统图片 | 用截图工具复制图片，Ctrl+V粘贴同图两次；两处宽度设30%/80%，Ctrl+S，capture，再restart | 两处宽度独立，图片可见，完整JSON相同且资源仍可读，无丢图/尺寸串联 | NOT_RUN |
| T07长文与格式 | 连续输入约1000汉字，含列表、表格、行内/块级公式和颜色；Ctrl+S等“已保存”，capture，restart | 文字、公式、颜色、表格及图片完整，保存文档与重开JSON一致；restart只核最近成功保存值 | NOT_RUN |
| 保存失败恢复 | 勾“注入保存失败”，输入独特短句，Ctrl+S，capture；不要重启，取消勾选后Ctrl+S，capture，再restart | 明确失败反馈；原内容仍在，失败时saved不前移；重试成功后短句重开保留 | NOT_RUN |
| T08 Windows脱网 | 安装构建完成后断开Wi-Fi/网线，在终端restart；查看公式/图片、编辑并保存，再capture | 本地资源/字体/数学可用，无CSP/加载错误，report.errors/external为空；重新连网后正常quit | NOT_RUN |

脱网源构建通过不等于ASAR便携包已验收。当前PR不产出带此独立入口的Windows便携测试包，**Windows编辑器ASAR仍NOT_RUN**；本轮不新建打包/发布流水线。Base64交换依原计划在S6实施，当前NOT_RUN，不以图片JSON测试代替。

## 回传最小记录

回传：完整HEAD、Windows版本/build、输入法名称/版本、上述两份自动化JSON和日志、填写后的6行结果、人工工具目录内report.json及相关capture-*.json/png和错误日志。只使用合成文本/示例图片，不放个人学习内容。首次失败先capture，写清步骤和实际现象；不要反复重跑至绿后隐去失败。

本轮Linux仅验证启动工具本身（`--verify-launcher`是合成自检，永不填写上述结果）。由维护者核验真实证据和同SHA质量/pr-gate/pr-trust后评估S2 DONE；未经确认不自动进入S3、合并或发布。
