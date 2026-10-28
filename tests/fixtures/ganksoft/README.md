# 最小 Schema606 测试资源

唯一小型生成器 `b2.ts` 复用 prepareFreshUnified / createFullRestoreSession / typed API。
B2 旧入口仅 re-export。`definition.json` 版本1定义3基础知识点、1发布卡、1真实学习事件、1关联、1像素图片；B3增加9层树、异支同名叶和挂载根，共16节点，不含242卡夹具。

固定命令：

```bash
npm run test:knowledge-exchange
npm run validate:knowledge-exchange
# 整个R5.b协作：B3正式专项 + B4集成/三宽/文件往返/新进程
npm run validate:knowledge-markdown
```

第二个命令先生产build，再自动准备小库并启动正式Electron；缺失缓存自动重建。缓存仅存validation-results，数据库为独立合成目录。版本/定义SHA256、606/integrity、真实API ID与基线正文/层级校验。B3缓存标记consumed后下次生成新目录；不删除旧库或活动租约。B2验证仍使用自己的缓存，显式重置仅限旧已知合成正文。

只提交定义、生成代码、断言及脱敏证据。SQLite、锁、active指针、生成媒体与大缓存不入Git。后续Work执行命令，无需重新设计数据。未知回执/写失败注入仅验证bootstrap，正式应用服务、sender guard、preload、606与事务不替换。
