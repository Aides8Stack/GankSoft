# B2 可重复验证与证据边界

基线06ebccc3c59e78d6425dc4fe6eefa0bc4f12b8c4。当前B2 DONE，B3仍NOT_STARTED。依赖复用现有安装；无需全量测试、环境再调查或242卡夹具。

```bash
npm run build
node --experimental-strip-types tools/validation/r5/b2-lifecycle.ts --production-only
node --experimental-strip-types tools/validation/r5/b2-save-safety.ts
```

`b2-fixture.ts`检查`validation-results/r5-b2-2/fixture.json`及实际active/sqlite；原/tmp缓存失效时生成新的小型数据库，使用既有prepareFreshUnified/createFullRestoreSession、typed API取得真实ID，保存参数：3节点、2根/1子、1发布direct卡、1关联、1真实review事件、1个1×1合成PNG。检查schema606及integrity。完整242卡夹具不参与，数据库/租约不上传；可复制的代码/参数/检查和实际ID证据入库。已有活动租约交既有coordinator显式恢复检查，存活时拒绝，不直接删除。

B22重复运行只通过真实API重置这三个合成节点正文，保留其身份/层级/发布/历史；测试从当前revision取基线，不假设原始revision或跨次UUID相同。B23使用B22之后同一库，精确保护非目标内容。默认不再重跑已经通过的异步create/destroy门；需要定位该边界时可去掉`--production-only`，独立验证构建复用相同Crepe/实际Vue组件，不提供产品功能入口。

B23专用`b2-fault-host.cjs`只在E2E合成路径启动，包裹公开ipcMain.handle注册，载入最终生产main；实际preload/sender guard/protocol/service/DB不替换。两类故障：写前rejected；真实写成功后丢响应并暂时使receipt查询不可用。记录requestId/expectedRevision/合成Markdown及返回revision。CAS通过另一真实IPC保存推进revision，不伪造冲突。原请求重放只得原revision，不能产生第二个ID写入。

正常退出测试调用实际app.quit（Playwright close），不强制销毁；新进程PID不同，清理前与最后IPC payload和SQLite逐字节比正文、期望revision+1、nodeId和层级，保护其他节点、发布表行、非空历史、调度、关联、附件SHA。仅失败路径先写JSON/DOM，再显式销毁验证窗口避免beforeunload挡住失败报告；这不计为持久化PASS。最终8组全部走正常关闭。

当前最终结果：`evidence/b2-final/b22-final.json`两组；`b23-final.json`八组；`build-final.txt`生产构建。源码指纹/影响继承和所有早期失败见verification.json。B22正式运行在最终错误处理修复前，原生历史/选择/布局未改；最终B23覆盖正常保存/重挂载/关闭导航和错误路径，不冒称整套同SHA重跑。

`b23-cas-confirm-font-missing.png`为真实操作诊断图，当前Linux缺CJK字体，**不作视觉通过证据**。新确认只在CAS错误状态出现，正常布局不变；B2.1三宽视觉继承，全应用严格视觉/Windows/IME/物理剪贴板仍归R7/R8。没有静态截图替代功能验收。
