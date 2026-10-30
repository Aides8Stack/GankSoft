# P1 B4/B5 测试报告（2026-10-30）

唯一范围 B4/B5，feature/v077 → develop；未运行B3、B1/B2遗留、P0/P2。阶段：B4 IN_PROGRESS（4设施未闭环）；B5 BLOCKED。未改生产、未合并/发布、不等CI。

| 批次 | 唯一CASE尝试 | 进入Electron GUI | 总尝试 | PASS | PRODUCT_FAILURE | TEST_INFRA | BLOCKED | NOT_RUN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B4 | 32 | 31 | 44 | 27 | 1 | 4 | 0 | 4 |
| B5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |

B4的4 NOT_RUN就是4 TEST_INFRA，不重复计数；MEDIA-02两次停在夹具阶段，没有冒称GUI执行。32首轮+12条各一次补验；原PASS/FAIL及耗尽重试CASE未重复运行。B5阶段环境阻塞，但原五条CASE保持NOT_RUN，没有伪造BLOCKED运行回执。

## 被测身份与隔离

生产SHA `c1b5f426f460cf205ff91231cfc4e29ecc37ff95`，生产指纹`fa6aaa247a036934ec72886879ae93e1f6da8af64bbcefb83e74e5d6ead70096`，414产物逐文件校验PASS。首轮脚本SHA `c1b5f426f460cf205ff91231cfc4e29ecc37ff95`；补验脚本SHA `2469703eabbc2b4ab0ca6080af01eb0eee2086a5`。脚本完整SHA256在P1-B4-RESULTS.json的runs中。仅M4五个驱动修改；B3脚本/目录/结果未修改。独立目录`/workspace/scratch/f363a82d18fc/GankSoft`，独立依赖副本、dist、每CASE Schema606临时库/userData/文件/证据。依赖安装0次、编译0次。Node24/Linux headless Electron；中文字体方框不作为Windows视觉签核。

## 产品失败

FAULT-13 / AUTO-FAULT-13-545347fdc8e7：输入超过300字标题并保存，文本仍在输入框、状态仍“已保存”，15秒内无可见错误提示；SQLite没有新草稿、发布正文未改。两次GUI证据一致。路径为CardDraftForm.updateText→DraftController.change→DraftFields.parse，缺少可见错误处理。只收集，不修业务。证据：两轮FAULT-13的failure.png、failure-ui.txt、diagnostics.json。

## 设施问题（各两次，禁止第三次）

| CASE | 最后问题及实际边界 | 下轮入口 |
| --- | --- | --- |
| MEDIA-02 | fixture draft.save携带undefined title，尚未启动GUI | 从QA card summary读取title/revision，修fixture后另行授权 |
| EX-13 | 合并完成后界面回首页，驱动等待已卸载设置面板；诊断显示新增卡片集/卡片，完整历史与重启断言未完成 | 等首页重新加载，再刷新读回client epoch；不得仅凭新增行判PASS |
| BACK-09 | 同EX-13，成功导入与全链验收分开 | 同上，补齐图片/历史/FSRS/重启核验 |
| FAULT-11 | 返回列表后首卡仍选中，第二次变两卡，驱动等第二卡标题 | GUI取消旧选择后再选第二卡；不得更改业务 |

首轮其他设施归因与补验PASS：严格placementUrl参数、备份stage目录EEXIST、headless主/渲染剪贴板不同、取消导出本身可有ok回执、数据迁移后API epoch刷新、夹具已提交复盘会话须GUI完成、无效资源引用正确拒绝但draft为null。模拟文件选择和Linux confirm响应不等同Windows原生输入；EX-09最终读取真实renderer navigator.clipboard并等GUI“Prompt已复制”。

## B5 环境缺口

仅Linux，无Win10/11 Workstation桌面、同包双系统来源、实际缩放/原生弹窗证据。已执行list B5和Windows身份检查，未启动无效B5运行。WIN-01/02/03/08、BACK-14原NOT_RUN，Win10Real/Win11Real/WindowsCI字段均不动。后续真实客户端执行入口见P1-B5-RESULTS.json，Server代理不得晋升原生PASS。

## 审核、账本与保存

collect dry-run首轮0新增，补验1真实缺陷；collect write只新增该观察。未改collect/promote安全校验，strict promote分别审核20+8可信CASE。最终保存前按CASE合并远端，不以旧250条覆盖B3；如远端生产变化则本轮仅独立证据，不晋升。当前本地候选总账{'PASS': 145, 'FAIL': 3, 'BLOCKED': 3, 'NOT_RUN': 99}；其他222条及所有Windows字段逐对象不变。远端合并回执见P1-B4-B5-SAVE.json。

调度/注册/四Worker与M4/M5静态专项9/9 PASS，五驱动node --check与git diff --check PASS。二进制不入Git；原始合成截图、GUI/数据库读回、日志、identity及精确脚本bundle打包另存，回执见P1-B4-B5-SOURCE-IDENTITY.json。保存核验后结束，不进入修复或其他批次。

最终保存准入：重新读取远端仍为c1b5f426，账本blob与本地原基线一致；生产无并发变化。本轮28可信CASE晋升后145 PASS /3 FAIL /3 BLOCKED /99 NOT_RUN；其他222条及Windows字段不变。重试源码远端8713226f与本地2469703e完整tree相同，完整回执见SAVE.json。分支ref使用expected_sha且force=false，拒绝时必须重新合并，禁止覆盖B3。
