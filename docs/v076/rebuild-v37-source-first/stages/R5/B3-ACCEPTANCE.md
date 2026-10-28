# B3 验收 — DONE

基线 dfee4c7ae2fe3df14adb88fe10de597326b366c7。正式运行 `electron-attempt2.json` 全10组PASS，生产build与服务28项PASS。B3保存后按新用户授权直接B4，不提前结束；R5.b仍IN_PROGRESS。

| 项目 | 结果 / 证据 |
| --- | --- |
| 整树/局部/9层导出、搜索/全选/清空/明确范围 | PASS Electron1–2，精确节点及祖先正文语义，clipboard字节相等 |
| 整树新根导入、挂接指定节点 | PASS Electron3/6，真实UI→IPC→606，集内图片hash复用 |
| 完整路径/keep/replace/append、incoming与结果分开 | PASS Electron4–5，异支同名叶不变，取消零写 |
| 新图片/正文/节点混合事务回滚、并发冲突 | PASS Electron7–8，真实SQLite回执触发器故障后全量对照；并发写使预览失效 |
| 未知回执冻结/原requestId核对、不重复写 | PASS Electron9，单次节点/回执，无危险重复确认 |
| 新Electron进程精确读回、无关内容保护 | PASS Electron10，精确nodeId/Markdown/revision/层级/图片；发布表、非空历史、关联及旧文件hash不变 |
| v2 7/9/100层、非法深度/循环/重复拒绝 | PASS 新服务专项；旧v1显式拒绝>6保持，新增自动v2往返；不改变真实树 |
| 最小夹具规范化 | PASS tests/fixtures/ganksoft/；版本定义SHA、606/integrity/实际API ID；重复运行已验证旧缓存消费后新隔离目录 |

实际命令：`npm run build`，`npm run test:knowledge-exchange`，`B3_REPORT=electron-attempt2.json node --experimental-strip-types tools/validation/r5/b3-exchange.ts`。固定后续命令见夹具README。

失败原件：electron-attempt0因未展开既有更多菜单找不到按钮；attempt1误把目标集合法新增文件/回执算入源集零变更。修正测试先分别精确对照源集树/正文/关联/发布/旧图片，再建立包含目标写入的全局基线。没有删断言或改产品掩盖错误。parser-before-test-update为旧默认v1限制断言，更新为明确version:1并另加v2往返。

格式：`ganksoft:md:v1`浅树兼容；>6层自动v2，逐节点`<!-- ganksoft:depth:N -->`（1–100）紧接显示标题（最多6个#）。结构深度独立保存，父级缺失/跳跃/不符拒绝。正文封套、字面转义、AST保护继续复用；v1解析仍可用；旧版不认识v2应拒绝，不能静默读为浅树。最大100层与预览路径DTO合同一致，超过明确拒绝不输出截断文件。没有改变Schema606。

待导入正文按需最多200000字符，截断明确；图片binary不回传renderer，逐引用返回mime/bytes/hash/width/alt/title摘要，正文URL仅预览编号，确认始终用原source/plan。默认keep也可看incoming，但确认不写入保留图片。

Windows、物理剪贴板和IME仍R7/R8 NOT_RUN；仅受影响三宽在B4补验。无关B1/B2/R5.a有效结果继承。
