# R0 CSS 静态与运行时审计

PostCSS 输出 `css-rules.json`：原型+ui-v076 共1300条规则，186个同文件重复selector组（含不同媒体条件，不能全部算冲突）。保留选择器、条件、source行和有序声明。CDP `CSS.getMatchedStylesForNode` + `CSS.getComputedStyleForNode` 采集六页×三宽×两版的实际匹配规则、样式表URL/范围、最终计算值与元素边界。原始结果为 `evidence/matched-v1/*.json.gz`，`region-summary.json` 可直接读；容器无直接文本时 platformFonts 为空，不作为缺字判据。

## 已定位重复覆盖

| 正式选择器 | 源位置（src/unified/ui-v076.css） | 处理责任 |
|---|---|---|
| `.unified-shell .unified-content` | 22、27(@1000)、28(@760)、43、49(@1130)、50(@850)、51(@610) | R1，按同DOM/媒体条件逐组迁移 |
| `.unified-shell .catalog-grid` | 24 grid → 32 flex → 44 flex | R1/R2，不再尾部追加覆盖 |
| `.unified-shell .metric` | 29 min-height113/padding17 → 30(@1000) → 32 min-height88/padding15 | R1/R2，保留最终实测与原型结构 |
| `.metric-number` / label / small | 29、32、44 | R2，字体/行高/结构共同影响高度 |

## overview 实测摘录

| 视口 | 两版侧栏宽 | 原型内容 split 宽 | 正式 split 宽 | 原型 / 正式首个 metric 宽 |
|---|---|---|---|---|
| 1500×900 | 213px | 1176px | 1161px | 285.75 / 282px |
| 1366×900 | 213px | 1079px | 1064px | 261.5 / 257.75px |
| 900×900 | 213px | 624px | 624px | 306.5 / 306.5px |

两版 metric 的最终 min-height=88px、padding=15px 18px；实际高度原型101px、正式102px。900px split 列为原型278.969/329.016、正式354.656/253.328，不能仅看相同grid模板就判一致；内容内在尺寸与子结构也参与布局。

1500/1366的15px差异来自不同滚动容器/可用内容宽度的强线索；截图像素和CSS innerWidth均已经严格相等，不得裁切/拉伸/放宽尺寸断言。需R1在实际容器与scrollbar占位上归因。当前未修改生产CSS。

## 迁移顺序

1. R1：tokens→shell（侧栏滚动、顶部、二级导航、内容边界）→公共button/card/modal→responsive；每组以本报告实际computed与DOM作前后对照。
2. R2：overview/catalog/metric和deckHome；R3表格与详情；R4编辑/复盘/分析；R5图谱与大纲；R6设置/弹窗。
3. 新源接管后才删除旧规则。Crepe/Mind Elixir外壳与公开主题可适配，保留原生编辑/图谱，不接管内部算法。

此次是差异底盘，不是视觉通过或CSS迁移完成证明。hover/focus/disabled与更多动态状态的生产样式仍NOT_VERIFIED，见SCENARIOS.md。
