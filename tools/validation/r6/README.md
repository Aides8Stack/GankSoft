# R6 可重复验收

使用 Node24+、Electron44.9.1 和锁文件依赖；生产构建与 Noto Sans CJK SC 字体可用后执行。

- `npm run test:r6`：110个与本轮相关的领域/协议/进程测试；初次开发分六组运行，真实输出在R6/evidence/checks。
- `npm run validate:r6`：生产build，再依次运行settings/schedule/recycle/backup-merge/relocation/global/visual。可单独运行其中一个runner，不需要重跑R0–R5或无关全量测试。
- `npm run check:protocol`：协议21项/边界/类型/157方法导出。

运行使用tests/fixtures/ganksoft/settings.ts与b2.ts的小型隔离Schema606资源。数据库、active指针、租约不提交；每次危险专项新建合成目录。所有操作使用生产主进程/preload/typed IPC/实际服务；文件对话框适配选择结果，丢回复仅测试bootstrap在真实提交之后注入。原操作ID/expectedEpoch不能替换。保护对象包括非空历史、FSRS、发布版本、关联和图片字节。

用`R6_ATTEMPT=新编号`保存新报告，`R6_SETTINGS_OUT=新目录`保存设置重跑图；不要覆盖原始FAIL。视觉脚本同一原型不改源码，只将状态设为空回收站等可比状态；真实长表单与演示内容的区别见VISUAL-DIFFERENCES.md。`reload-probe.ts`是故障定位工具，最终`R6_PROBE=after-verified`要求同可信URL刷新成功且外链阻断。

Windows10/11、真实中文IME、物理剪贴板/跨卷及便携同包由R8；此处Linux不能代替。全应用严格视觉、R1遗留和全量集成归R7。
