# P0 测试

基线c2548f84ed2afe55f4157c71b821ab34dae599a3加P0工作树；Linux / Node24.22.1 / Electron44.9.1。

- npm ci --no-audit --no-fund：PASS exit0，381包，锁文件未改。
- npm run build：PASS exit0。
- node --experimental-strip-types tools/validation/ui-v076.ts P0：PASS exit0；正式主进程空白606，1500/1366/900三宽，无横向溢出、68px导航、8px按钮、无页面错误。
- Linux截图仅辅助，环境无中文字体，不作为中文视觉证据。Windows中文、Win10/11人工：NOT_RUN。


## 2026-10-27 完整复刻纠偏

本轮 Linux / Node24.22.1 / Electron44.9.1：npm test 509/509 PASS（补近期卡片摘要前）；随后18项关联含原失败S1.b PASS；check:protocol 21项/147方法 PASS；build PASS；生产UI P2 12场景 PASS，21张实际1500/1366/900 PNG已验证尺寸；原型12张三宽截图PASS。旧workspace回归最终回执见下次补记，不把部分场景冒称整套通过。Windows正式视觉/Win10/11人工 NOT_RUN。
