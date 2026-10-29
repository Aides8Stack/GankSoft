# B4 集成验收 — DONE；R5.b DONE

基线3a65527e35ae313802aa6c4cef1577585c254817（已保存核验B3）。本轮继续B4，B1/B2及R5.a未受影响证据继承。

| 必要门槛 | 结果 / 证据 |
| --- | --- |
| 图谱/文档大纲同一多根/9层/ID/路径 | PASS integration-final.json1，真实606节点及data-depth/完整路径逐项对照 |
| 原生编辑/保存/图谱大纲切换/既有图片 | PASS 第2组，exact nodeId/revision+1/asset身份，原生Crepe操作 |
| 实际文件导出→文件导入无损 | PASS 第3组，正式UI调用真实IPC文件读写，仅系统对话框选择路径用公开Electron adapter合成；16节点/9层、顺序、正文及图片sha256/宽度/标题精确规范化相等 |
| 重复路径默认keep及部分深树挂载 | PASS 第4–5组，IDs/revisions/图片文件不变，必要祖先空正文与所选子树正文精确恢复 |
| 取消/失败/冲突/未知结果安全 | PASS 第6组取消零写；B3正式7–9组真实混合事务回滚/并发预览失效/原请求核对继承，保存适配未变 |
| 新Electron进程精确持久化 | PASS 第7组，正常退出、PID变化；全源/目标树、Markdown/revision/层级/资产/关联逐项相等，发布/非空历史/调度及无关节点不变 |
| 受影响UI900/1366/1500 | PASS final-export/import六图及六DOM/CSS/真实CJK字体；对话框完整在viewport，宽度≥90%或1200、无横向溢出，逐张视觉审阅 |
| 最小可再生测试资源 | PASS tests/fixtures/ganksoft，固定命令自动检查版本/定义hash/实际ID/606/integrity，消费/丢失缓存新隔离生成 |
| Windows实机/IME/物理剪贴板/全应用严格视觉 | NOT_RUN，R7/R8后续门槛，不冒充本轮Linux局部验收 |

运行：`npm run build`（evidence/b4/build-final.txt）；`B4_REPORT=integration-final.json B4_CAPTURE_PREFIX=final- node --experimental-strip-types tools/validation/r5/b4-integration.ts`；结果7组/6图PASS。B3 service28、protocol21+边界/类型/148方法及Electron10见b3证据；CSS唯一产品增量，不使其服务结果失效。

原始失败：首次shell重定向目标目录未建立，进程未启动；建立输出目录后attempt0计数img包含Crepe原生占位，失败保留，使用B2已有data-gank-placement筛选。attempt1全部7组功能通过，但480px限宽在人工截图审阅中FAIL。修复knowledge.css中小弹窗规则对交换弹窗的影响后final同功能门槛及新增最小可用宽断言/六图PASS。旧截图和原失败均保留。未删除或降低断言，没有替换组件/Schema/FSRS。

局部视觉：真实字体Noto Sans CJK SC Regular，来源notofonts/noto-cjk官方仓库，字体SHA256 2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b；字体仅环境依赖，未上传。截图仅知识交换受影响界面，不宣称全应用与冻结原型零差异。900宽地图缩略预览可平移，节点列表和实际范围仍完整可选。

结论：B1/B2/B3/B4全部DONE，R5.b DONE；R5整体IN_PROGRESS。下一阶段R5.c未开始。本轮最终保存核验后主动结束，不进入c/d/R6、不等CI、不合并/发布。
