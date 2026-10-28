# R7 原始失败与处置

| 范围 | 原始结果 / 根因 | 最终处置 |
| --- | --- | --- |
| 主壳专项 | 默认队列无到期卡；b2已有未完成result会话；direct无单选思路字段；图谱返回文案定位过时 | 仅修正测试流程/定位，完成旧会话后真实UI新开复盘；shell final5组PASS，首轮attempt-0保留 |
| 跨页初轮 | 发布后仍在编辑页；暂停会话需要明确继续；分析日期已改为select | 按正式UI实际生命周期调整，精确业务断言保留 |
| 未知整库恢复观测 | 独立观察client仍持有旧epoch，提交后读知识返回“数据代次已变化” | 未知期间只用只读磁盘快照；UI原ID+epoch核对成功并刷新后重新capabilities；不放宽epoch检查 |
| 多轮合成库隔离 | 真实main默认浏览器配置目录共享，前轮待核对localStorage让新合成库的备份被安全禁用 | 测试host仅为各合成根设置独立userData，复用R6故障适配器加载未改动的生产main；不清空待核对记录冒充恢复 |
| 混合勾选夹具 | 3/5勾选时全选框本来未勾，uncheck不触发事件；测试误删3卡但只恢复1卡，最终新PID严格getPublished断言捕获 | 使用实际“取消选择”再选direct；新PID仍精确核对三张已发布卡，不缩小保护集合 |
| 确认产品缺陷：图谱可用高度 | 原型迁移后的map容器父高度auto：正式1366×900图谱底605.484而非900；较大内容又可能超出底部。长期旧场景同样失败 | 只在map-fullscreen内容容器增加height100%/min-height0/flex/overflow约束；layout attempt-0.json及failure-0.png保留，final四宽严格边界PASS |
| 确认产品缺陷：回收后列表陈旧 | 回收恢复已持久化，但returnSystem直接切page，虽清lastLists却复用旧rows；原长期场景10项后FAIL | 系统数据changed标记，只在返回卡片页时重读列表/会话；保留查询与滚动，清除失效选择。原始original-workspace-fail.json及formal recycle-return final PASS保留；主壳5组和跨页8组受影响回归 |
| 旧长期17场景 | 演示构建缺失、首页目录移入disclosure、导航/筛选/回收确认/日期等定位过时 | 保留全部17行为场景及CAS/未知原ID/恢复/精确数量/内容断言，定位改为当前正式组件。图谱约束精确对应顶栏下内容区域/底部footer；旧强制销毁的spike不作为正常退出证据，后者由formal integration提供 |

重复环境/定位失败仅汇总，不反复上传截图/运行库。最终PASS报告与真实布局原始FAIL分别保留，不将未运行项写成PASS。原型、Schema606、FSRS、协议与存储引擎未修改。

## 中断续跑补记

旧长期场景第14项后，第三次Electron启动的目录summary点击在performing click阶段超时，既有日志未能确定更深根因。续跑只添加弹窗、URL和窗口失败诊断，未改产品、业务断言或等待阈值；一次完整复跑17/17、exit0，未复现此点击故障、没有原生弹窗/renderer错误或外链。该事件记为测试环境/输入回执的未复现超时，不列作已确认产品缺陷或声称已修复根因。17场景仍为辅助spike；正式main/正常退出证据来自独立integration/shell。
