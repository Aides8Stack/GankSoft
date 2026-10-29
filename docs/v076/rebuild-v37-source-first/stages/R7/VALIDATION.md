# R7.1–R7.2 重复验证入口

Node24+ / npm ci / Electron44.9.1。先一次 `npm run build`。仅旧17场景另需一次 `npm run build:editor-spike`。不需要历史Work缓存，不执行task:init，不访问用户数据库。

| 入口 | 范围 |
| --- | --- |
| `node --experimental-strip-types tools/validation/r7/shell.ts` | 正式主壳、九入口、设置返回/跨集状态、编辑与复盘离页、新PID |
| `node --experimental-strip-types tools/validation/r7/integration.ts` | 同一个隔离606正式main/preload/typed IPC全链路8组；完整备份恢复、丢回复原ID+epoch核对、独立合并、新PID逐表/字节读回 |
| `node --experimental-strip-types tools/validation/r7/layout.ts` | 图谱占满可用内容区、画布止于footer、1366/900/1500/720几何 |
| `node --experimental-strip-types tools/validation/r7/recycle-return.ts` | 卡片恢复返回列表重读，查询保留/失效选择清空，发布/历史/FSRS/图片保护 |
| `node --experimental-strip-types tools/workspace-spike/smoke.ts` | 原长期17场景，真实服务/606辅助spike；不把它算作正式main或正常退出证据 |

R7脚本默认以时间戳区分本次报告，可用环境变量R7_ATTEMPT指定新的标识；勿复用final覆盖已保存证据。tests/fixtures/ganksoft/{b2,exchange,media}.ts构造合成数据，metadata在validation-results；缺缓存按现有服务重建，小型数据，不重建242卡。

host.cjs只为独立合成根设置Electron userData，再加载现有R6 transport故障适配器和生产dist-electron/electron/main.js。对话框只适配选择/取消结果；故障在真实持久化后丢回复；Vue、preload、typed IPC、事务、回执、Schema606均为真实实现，没有mock IPC或静态HTML。未知期间不重建请求ID，不换expectedEpoch。

正常退出/新PID以integration和shell的app.close+writer.lock释放+逐字段读回为准；旧spike强制销毁保留其原语义，不冒充正常退出。strictVisual始终NOT_RUN；几何回归不能替代R7.3逐页三宽像素/DOM/CSS验收，Windows留R8。
