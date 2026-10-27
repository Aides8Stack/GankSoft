# P1 测试记录

被测：P0本地f506a8b231bfd744db523182da4755f82fb1b549（远端等树b529d4b07317302eb3cb5fd2dd4752898ad4ba0f）加P1工作树；Linux/Node24.22.1/Electron44.9.1。

- node --experimental-strip-types --test tests/dashboard-v076.test.ts tests/unified-workspace-v075.test.ts：PASS exit0，8/8；真实606全局/文件夹/单集隔离、时区、未评分、只读排期不变、分页界限、删除和重开。初次夹具因未完成会话阻止删除、依赖宿主时区而FAIL；修正为完成真实会话及显式学习时区，未改业务保护。
- npm run check:protocol：PASS exit0，21协议、边界/类型、147方法导出。
- npm run build：PASS exit0。
- node --experimental-strip-types tools/validation/ui-v076.ts P1：PASS exit0，正式production main，空白/合成非空各1500/1366/900截图，无溢出，真实继续复盘，7场景。首次测试退出因复盘beforeunload等待，改为先正常返回总览再退出；不是业务失败。
- 本地另安装中文字体仅用于测试机，不写产品依赖，不增加首次启动下载。已实看1366空白截图，布局结构与原型源布局一致；Linux截图仅辅助。
- 原型独立headless截图：FAIL timeout，不能以输出的1px图声称通过；保留捕获脚本供修复。Windows正式中文视觉、Win10/11人工：NOT_RUN。


## 2026-10-27 完整复刻纠偏

本轮 Linux / Node24.22.1 / Electron44.9.1：npm test 509/509 PASS（补近期卡片摘要前）；随后18项关联含原失败S1.b PASS；check:protocol 21项/147方法 PASS；build PASS；生产UI P2 12场景 PASS，21张实际1500/1366/900 PNG已验证尺寸；原型12张三宽截图PASS。旧workspace回归最终回执见下次补记，不把部分场景冒称整套通过。Windows正式视觉/Win10/11人工 NOT_RUN。
