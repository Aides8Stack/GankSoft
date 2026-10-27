# P0 测试

基线c2548f84ed2afe55f4157c71b821ab34dae599a3加P0工作树；Linux / Node24.22.1 / Electron44.9.1。

- npm ci --no-audit --no-fund：PASS exit0，381包，锁文件未改。
- npm run build：PASS exit0。
- node --experimental-strip-types tools/validation/ui-v076.ts P0：PASS exit0；正式主进程空白606，1500/1366/900三宽，无横向溢出、68px导航、8px按钮、无页面错误。
- Linux截图仅辅助，环境无中文字体，不作为中文视觉证据。Windows中文、Win10/11人工：NOT_RUN。
