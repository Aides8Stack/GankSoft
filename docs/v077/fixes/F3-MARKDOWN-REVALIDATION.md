# F3 Markdown 当前源码专项 — 2026-10-30

结论：当前源码仍可自然复现 EDITOR-10 字符错位并进入SQLite。MD-02原驱动本次一次PASS，但同一延迟选区根因在知识正文中经受控时序确定复现；不能据此关闭历史BUG。EDITOR-10/MD-02按一个BUG管理，重复记录保留。

## 身份与覆盖

生产保存SHA `0af1ec0c610b0666aa84431e22017f9f6d4f0f2f`，构建源码 `e5d043da50e5adaa3ae3a5aea798788e1f2aa5c4`；原生操作链测试SHA `f1c09b310c2a59d1938843dd412b260154dfba07`，根因卡片诊断SHA `3fadb48b1b77a9e9e53bbdd1e9cccdcf7b2c4b5e`、知识诊断SHA `bf401fd36d9408b7f266330e624af69892ae7e78`。生产指纹 `4ca93ae90f48b0b37df4d3d8da9656b4e0cd04176cd581e908a81626fe5aa9d6`；414输出逐哈希有效复用。F3没有生产修改、安装或重建。

真实Electron/Playwright键盘覆盖标题/列表快捷语法、Enter后紧接中文/英文、代码块、方向键/选区/换行/插入、GUI保存、新PID重开和SQLite只读核对。键盘首轮扩展链两编辑器未观察到历史缺字，仅作为范围内未复现；不是完整CASE晋升。随后未改动的原始驱动：EDITOR-10 FAIL，SQLite草稿为“表条目”、“de one”，移出的“列/co”等落至后部；MD-02 PASS。原始FAIL界面、正文和SQLite原始记录完整保留。

## 已验证原因

锁定 @milkdown/components 7.22.3 的 `src/list-item-block/view.ts`：onMount在约98–110行捕获anchor/head；scheduleRestore在约27–54行通过RAF于下一帧在当前文档上恢复旧绝对位置，只检查位置不越界，没有输入/选区代际保护和事务映射。当前Crepe公开ListItem config仅图标，无选区恢复策略开关。

受控实验仅在测试页暂存原来的这个RAF回调，在真实键盘输入“列”后释放原回调；没有通过编辑器API设置内容/光标。回调前光标offset1，回调后offset0，后续键入“表条目”得到“表条目列”。卡片和知识正文均经GUI保存入SQLite，重启后字节相同。诊断PASS表示成功复现，绝不晋升产品CASE PASS。回调函数原文、前后选区、完整Markdown见F3-RESULTS.json；包源码SHA256 `ca6a0ae49f16c5eb3805df072d90424cfdd1eb6a9c8ee9c3798cb584c443f012`。自然复现证明这不是仅诊断注入产生的虚构问题；受控实验定位的是实际原有回调。

## 下轮最小方案

只针对列表NodeView的延迟恢复路径：利用公开 `editor.remove(listItemBlockView)` 和 `$view` 插件替换点，加入文档/选区代际、焦点、节点存活保护，必要时映射捕获位置；用户输入/移动后不得恢复旧选区。保留当前列表视觉、任务复选框和原生输入规则。先验证安全替换能力或上游修复可用性；不得改node_modules、全局RAF或加入固定等待。用本轮受控实验和两原始自然操作链验收。本轮没有实现此修复。

## 账本和边界

在精确f1c09b3只读生产检出中运行现有promote dry-run/actual，只刷新EDITOR-10当前FAIL证据；回主工作树只按该CASE字段合并。MD-02单次自然PASS不晋升；其他249CASE/Windows字段不动。历史B2 28PASS/2FAIL没有批量晋升。当前250总账209PASS/2FAIL/3BLOCKED/36NOT_RUN；2FAIL属于同一个间歇性Markdown BUG。

Linux/合成键盘不是Windows真实IME验收。Windows10/11 NOT_RUN。未修Markdown生产源码，未合并develop/发布/等待CI。精简原始包回执见EVIDENCE-ARCHIVE.json。


## 最终同树复验补记（优先于前述历史指纹）

最后补齐CAT-03空名称原生invalid事件的固定中文提示，仍是原缺陷范围。最终生产/测试SHA `fcccda97c6cddc3fcbcfb65383995c12b694c0e0`，最终生产指纹 `17f676829abae98e51962d442505b5b5a9721d1a5379786f3fd36d1fb05652f4`，456输出逐哈希封存，完整类型/构建PASS。F1三宽真实点击、目录空名中文/空白/重名/未知请求/重启、F2完整三新PID链全部重验PASS。Markdown卡片和知识正文原RAF受控复现均成功；最后原驱动自然EDITOR-10 PASS、MD-02 FAIL，证实对时序敏感，与前一轮自然EDITOR-10 FAIL共同保留。任何一次自然PASS不关闭共享BUG。

严格promote在精确本SHA上只更新三修复PASS及MD-02当前FAIL；不晋升诊断PASS，不改其他CASE/Windows字段。最终209PASS/2FAIL/3BLOCKED/36NOT_RUN。F3没有改Markdown生产实现；最终CAT中文提示补齐使旧指纹不能冒充最终同树结果，因此新增了本段可追溯复验。详情FINAL-REVALIDATION.json。
