# R5.a 测试报告（C3安全检查点）

恢复基线2dffad3434105f04e7439527751a93edb22bbe8c；C1 9ab6806a474498c1bfb71c806805260782cc5a3f、C2 91d6e1ef93cd7c6165631bfe3aba3b1c1e439c80已读回。C3以C2加当前工作树执行；本检查点完整SHA从Git历史解析。Linux/Node24.22.1/Electron44.9.1/MindElixir6.0.0-next.4，复用依赖未安装。

| 项目 | 结果 | 证据及限制 |
| --- | --- | --- |
| npm run build（C2、C3） | PASS | C3最终生产构建evidence/build-c3.txt；仅原有体积提示 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-knowledge-v075.test.ts tests/knowledge-layers-v075.test.ts tests/knowledge-markdown-store-v075.test.ts | PASS 21/21 | evidence/domain.txt，树/层/MD存储相关回归，其他模块不无意义重跑 |
| R5_SEED_CACHE=<existing synthetic cache> node --experimental-strip-types tools/validation/r5/interaction.ts | PASS 11组 | evidence/interaction.json；正式UI→IPC→Schema606，实际拖动前后坐标完全相同；原生新增/改名/层级/排序、真实CAS冲突与回收恢复；关闭释放租约、精确树/初始正文及SQLite606完整性新进程读回 |
| node --experimental-strip-types tools/validation/r5/visual.ts | PASS 9组几何+2组视图/导航 | evidence/visual.json，三宽各展开详情/收起详情/纯画布；18PNG、18DOM/computed CSS、字体、哈希；12业务节点/收起2根，无节点越界/重叠、工具栏/侧栏不遮挡画布；所有布局操作树hash及dirty不变 |
| R5.a与原型完整视觉Gate | FAIL（未关闭差异） | VISUAL-DIFFERENCES.md：主题/选中态、详情Crepe留白；几何PASS不代表最终视觉通过 |
| 保留变更节点/层级的新进程读回 | NOT_RUN | C2先删除测试节点再重启，不能冒充此项；下轮先保留变更再重启核验 |
| Unified关联卡片按钮精确筛选 | NOT_RUN | 静态仍经legacy cardFilterPreset，需核验/最小适配，不能宣称端到端通过 |
| Windows10/11、物理剪贴板、中文IME、全应用严格视觉/便携ZIP | NOT_RUN | R7/R8，不将Linux当Windows |
| R5.b/c/d整体开发/验收 | NOT_RUN | 仅登记需求，未执行 |

目前无环境BLOCKED。原生confirm曾阻塞headless，保留evidence/recovery.json；当前业务确认用可访问页面dialog，未改变后端租约保护。早期测试FAIL保留interaction-attempt1（catalog.save不返回name）、attempt2（原生选择自动居中动画尚未结束）；调整夹具元数据、先搜索定位并等待真实动画完成后原断言通过。首次TS2448声明顺序失败已修复。未删测试、弱化断言或改为任意异常PASS。

复用已有R2不可变合成缓存，原阻塞试验副本另存，恢复一次；仅按目标功能补12节点两根/1合成卡。数据库/缓存/原始调试端点/凭据不提交。C3只变收起与全屏布局，C2其他11组按源码影响继承，未声称全重跑。R5.a保持IN_PROGRESS，先远端保存本安全检查点。
