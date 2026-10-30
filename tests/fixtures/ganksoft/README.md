# v0.7.7 合成最小用例存档

[新版本最小配方](./v077-minimal.json) 已随仓库保存：错题复盘、问答记忆、直接记忆三种完全合成内容及核心保存/发布/复盘合同；不会存储可复用的真实或活跃 SQLite。继续由既有 `b2.ts`/ `definition.json` 生成每轮独立 Schema606 库；环境可通过 `tools/validation/v077/environment.mjs` 复用正式编译产物，但不能复用测试写入过的数据库。完整说明见 `docs/v077/ENVIRONMENT-REUSE.md`。

---

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

R5.c最小资源定义及生成在media.ts（mediaVersion1、pixels11/22/33/44/55），复用exchange生成器及真实API，不访问用户库。固定`npm run test:media-library`与`npm run validate:media-library`自动生成、检查现有缓存；未知/失效租约不删除。

R5最终协作固定入口`npm run validate:r5`：build→媒体正式专项→九层/共享/文件交换/回收恢复/新进程集成→受影响原型三宽。B2/B3生成器与media最小定义继续复用，不手工重建数据。当前非当前发布版本保护新增一项，服务8项（含父例），原模块46项证据继承。

## R6 设置与数据安全

`settings.ts` 复用b2小库、真实API生成4张发布卡/4条学习历史/3知识点/1像素图片；过期与未来排期通过真实复盘时钟生成，不手改FSRS。每次破坏性专项创建新的合成根，不复用已消费的旧库、不删活动租约。备份/合并来源通过完整ZIP+stageBackup生成，ID有意相同以验证重映射。

固定入口 `npm run test:r6`（110个相关领域/协议/进程项）与 `npm run validate:r6`（build及各正式Electron专项）。不会访问用户库或全量242卡数据。`tools/validation/r6/storage-host.cjs`只在E2E/已知合成路径运行，丢回复发生于真实提交之后；正式主进程/preload/服务/606不替换，原生文件对话框只适配选择结果。Windows原生操作、物理剪贴板/IME仍另验。

每个runner按R6_ATTEMPT输出新报告，失败JSON/截图不得覆盖；设置截图可用R6_SETTINGS_OUT指定新证据目录。最终视觉对比含同空回收站/常规状态；真实调度/数据表单较原型演示内容长，精确记录滚动条宽度分配和业务差异，不把演示控件当实际设置。
