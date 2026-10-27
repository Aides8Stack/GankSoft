# R0 CSS 层叠初查（IN_PROGRESS）

`src/unified/ui-v076.css` 第22行定义 `.unified-content` padding，第43行再次设为 `29px max(37px,calc((100% - 1176px)/2)) 70px`；第27/28行媒体规则之后又有第49/50/51行媒体规则。`.metric` 第29行初设 min-height 113px/padding 17px 18px，第32行改为 88px/15px 18px；第30行在窄宽下调整 padding。具体胜出值须按同一 DOM、viewport、完整样式表和 specificity 通过浏览器 computed style 实测，以上不是 computed style 结果。

第68行 max-width 850px 将侧栏缩成62px，展开仍为213px；第69行 max-width 610px 未展开时隐藏。1500/1366/900 三宽是否符合原型仍需采样，不能只凭源代码认定。迁移前采集原型及正式生产 computed styles、匹配规则和 CSS 来源，再逐组迁移并回归，当前未修改 CSS。
