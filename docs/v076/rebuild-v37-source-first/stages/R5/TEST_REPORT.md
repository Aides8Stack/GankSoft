# R5.a 测试（C2）

基线9ab6806a474498c1bfb71c806805260782cc5a3f + C2工作树。Linux、Node24.22.1、Electron44.9.1、MindElixir6.0.0-next.4。依赖复用，无安装/锁文件更改。

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| npm run build | PASS | 最终C2编译/生产构建成功，保留原chunk体积提示；首次TS2448声明顺序错误已修复 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-knowledge-v075.test.ts tests/knowledge-layers-v075.test.ts tests/knowledge-markdown-store-v075.test.ts | PASS | 21/21；evidence/domain.txt |
| R5_SEED_CACHE=<existing synthetic cache> node --experimental-strip-types tools/validation/r5/interaction.ts | PASS | 11组；evidence/interaction.json，真实正式606 UI/IPC/数据库/新Electron进程 |
| 三宽截图/DOM/CSS与冻结原型 | NOT_RUN | C3下一检查点 |
| Windows10/11、物理剪贴板、中文IME、全应用严格视觉/便携ZIP | NOT_RUN | R7/R8负责 |
| R5.b/c/d | NOT_RUN | 后续Work，本轮不实施 |

11组包括：12节点多根森林/展示容器不入库；真实路径/关联1/1/0；视口/展开不改树；搜索定位后节点拖动前后几何严格一致；新增下级/同级/重命名；明确父子变更/排除自身与后代；原生同级排序；真实CAS冲突不覆盖、草稿可恢复；页面确认+子树回收/预览/恢复；正常关闭释放租约、新Electron精确树/所有原正文读回和SQLite606完整性。

早期FAIL保留attempt1（测试误用catalog.save返回的name）、attempt2（搜索定位/原生选择自动居中未完成时就比较位置）。保留recovery.json：native confirm阻塞headless，旧试验合成目录已另存，现有不可变缓存恢复一次。业务确认改页面dialog，不改数据库租约保护；未通过系统弹窗注入冒充用户确认。正式功能回归最终全PASS。测试原始调试端点/数据库不提交。
