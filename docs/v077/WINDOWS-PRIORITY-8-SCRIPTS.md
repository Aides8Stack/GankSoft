# GankSoft v0.7.7 — 91条优先验收：最后8条真实Windows脚本

> **状态：SCRIPT_IMPLEMENTED_NOT_EXECUTED（2026-10-30）。** 250条总账本未修改，当前仍为 **72 PASS / 3 FAIL / 3 BLOCKED / 172 NOT_RUN**；91条优先验收中的结果仍为 **67 PASS / 3 FAIL / 3 BLOCKED / 18 NOT_RUN**。这里完成的是8个原CASE的脚本编写和GitHub静态核验，不是实际Windows验收。

## 1. 脚本覆盖与内容

| 用例 | 历史状态 | 专属处理器 | 实际验收操作 / 反馈 |
| --- | --- | --- | --- |
| `NEW-13` | BLOCKED | `scenarios/win-ime.mjs` | 真正的微软拼音候选尚未结束时物理Ctrl+S；记录可信compositionstart/end与按键顺序，全文、草稿、PID重启无丢字 |
| `CLIP-03` | BLOCKED | `scenarios/win-clipboard.mjs` | 真正Word/WPS打开独立RTF合成文件并复制，系统剪贴板有RTF/HTML格式，物理Ctrl+V、GUI及持久化读回 |
| `CLIP-09` | BLOCKED | `scenarios/win-clipboard.mjs` | 真实Win+Shift+S截图工具→Windows剪贴板→物理Ctrl+V→图片可渲染、asset/placement持久化和重启读回 |
| `WIN-04` | NOT_RUN | `scenarios/win-ime.mjs` | 微软拼音+另外一种**真实已安装**输入法，两轮候选输入、物理复制/粘贴、精确文本数量与重启 |
| `WIN-05` | NOT_RUN | `scenarios/win-clipboard.mjs` | 真实浏览器、Word/WPS、记事本各自产生剪贴板内容，真实Ctrl+V与每一来源的持久化验证 |
| `WIN-06` | NOT_RUN | `scenarios/win-clipboard.mjs` | 真实截图工具图像、内存剪贴板格式、图片加载、媒体关联和重启后显示 |
| `WIN-07` | NOT_RUN | `scenarios/win-dialogs.mjs` | Windows原生文件对话框：另存为取消/确认、文件打开取消；真实ZIP验证及取消不写数据 |
| `WIN-09` | NOT_RUN | `scenarios/win-portable.mjs` + `win09-verify.mjs` | **Win10+Win11同一便携ZIP**的真实打包EXE：新卡→草稿→发布→复盘→重启，分机保存证据与同哈希比对 |

共享检测逻辑：`scenarios/win-native-support.mjs`。其门禁要求 `process.platform=win32`、Windows10/11 x64、人工解锁的Windows桌面、`GANKSOFT_WIN_SUPERVISED=1`，仅**被动**监测受信任输入法/粘贴事件并读系统剪贴板格式，**不调用clipboard.write模拟来源，不构造composition/paste DOM事件**。真实用户在Windows GUI依提示执行输入，按 **F8** 表示这一子操作已完成。未收到F8、没有原始来源或平台不对均是BLOCKED，不准冒充软件FAIL/PASS。

为保障窗口可见，测试框架在Windows监督模式中取消Linux专用headless Chromium选项；无监督、非Windows仍保留原启动规则。测试公共代码 `helpers.mjs` 识别 `WINDOWS_PHYSICAL_INPUT_REQUIRED` 并记为BLOCKED，退出码2；确凿GUI断言失败仍记录FAIL。原3条P0阻断不新增CASE、不计入9条M5。

**真实来源验证说明**：系统剪贴板格式、原软件进程及网页可信DOM事件与人工确认组合使用；无法从单个clipboard API绝对证明源应用身份，因此须保留真实操作过程的Windows截图/运行回执，不能只靠格式做自动PASS。脚本在独立的Schema606合成库上操作，不读取用户私人文档。

## 2. 执行步骤（用户提供真实 Windows 10/11 桌面）

在 **Windows PowerShell** 的已解锁交互桌面中，从真实 `feature/v077` 当前源码运行：

```powershell
$env:GANKSOFT_WIN_SUPERVISED = "1"
# 若要跑 WIN-04，请实际安装并切换第二种中文输入法，如搜狗拼音：
$env:GANKSOFT_WIN_SECOND_IME_LABEL = "搜狗拼音"
node tools/validation/v077/environment.mjs status
node --experimental-strip-types --test tests/v077-windows-priority-8.test.ts
```

环境指纹无效才执行 `environment.mjs prepare`，不要盲目重复安装/构建。建议GPT-6.1 Sol Medium；独立保存源码SHA与真实物理Windows来源证据。

**先补验3条历史BLOCKED（支持从原M5计划直接启动）：**

```powershell
node tools/validation/v077/phase.mjs run T2-M5 --retry-blocked --checkpoint M5-P0-FOLLOWUP
```

或单条使用 `node tools/validation/v077/run.mjs run --ids NEW-13` 等。当前 `phase.mjs` 已让 `--retry-blocked` **优先选3条P0补验**，不必等其他4条M5脚本写好。

**再跑优先91集合中的5条Windows：**

```powershell
node tools/validation/v077/run.mjs run --ids WIN-04,WIN-05,WIN-06,WIN-07
```

每个实际子操作在GankSoft GUI中显示说明。启动时务必可见真实桌面；从原始Word/WPS、浏览器、记事本、Snipping Tool复制实际合成样例，不准用测试代码写入Windows剪贴板。操作后在GankSoft窗口物理按F8，脚本自动核验真实应用事件、剪贴板格式、草稿/资源、数据库和PID重启。未安装Word/WPS或第二种中文输入法的对应CASE仍为BLOCKED并记录缺失条件。

**WIN-09需在Win10、Win11两台分别操作同一ZIP**，指定实际GitHub Actions发布制品与解压可执行文件路径：

```powershell
$env:GANKSOFT_WIN_SUPERVISED = "1"
$env:GANKSOFT_WIN_PORTABLE_ZIP = "D:\artifacts\GankSoft-v0.7.7-win64-portable.zip"
$env:GANKSOFT_WIN_PORTABLE_EXE = "D:\artifacts\GankSoft\GankSoft.exe"
# 将上面两项换成真实存在的路径，不能凭空填写。
node tools/validation/v077/run.mjs run --ids WIN-09
```

单台本地实机GUI成功也只写 `WIN-09-win10-host-proof.json` 或 `WIN-09-win11-host-proof.json`，**总CASE继续BLOCKED**。在两台跑完后将两份真实报告传到同一工作树，用下列命令离线比较原始ZIP、解压EXE、生产源码版本和两端操作链：

```powershell
node tools/validation/v077/win09-verify.mjs "win10-host-proof.json" "win11-host-proof.json" "WIN-09-paired-review.json"
```

只有结果 `READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS`、原始Windows截图/运行日志通过人工复核且两平台源包哈希严格一致，才允许按原项目流程审核更新`win10Real`/`win11Real`及最终CASE状态。该离线校验工具**不会自动修改250条账本**，防止只用一台机器冒充双系统PASS。

## 3. 脚本实际测试与反馈归档

当前唯一账本仍：**72PASS / 3FAIL / 3BLOCKED / 172NOT_RUN**，不擅自晋升。每一条在相同源码SHA上使用真实 `run.mjs` 生成 `summary.json`、`case.json`、GUI截图、自动读回诊断。通过 `collect.mjs` 先dry-run后write，`promote.mjs` 按真实来源和平台审查。原3个BLOCKED只有取得真实Windows签核结果方可改为PASS/FAIL；Linux无法运行时继续BLOCKED，既不是永久性BUG，也不能删掉用例。

独立覆盖守卫：`tests/v077-windows-priority-8.test.ts`，检查91/91优先CASE已注册、8个目标映射、物理来源门禁、FXML/Office/截图要求、单机WIN09不自动PASS，以及双端ZIP不同哈希必须拒绝。**本次仅进行了远端静态校验**，未在完整Node24/正式Electron/Win10/11上执行这些新脚本，首次真机运行可能需要最小修正选择器或本机环境条件。真实修测试工具先提交后复验，业务源码继续冻结。

此外，完整250条中未有专属脚本的用例现还剩 **44条**：M4的40条、M5原计划中WIN-01/02/03/08四条。以后可继续按既定计划补齐，不影响此轮91条优先验收脚本准备完成。

**权限边界**：只修改测试场景、测试框架、测试文件和文档；不改生产业务代码；不合并develop、不发布、不等待CI、不清空历史测试结果。
