# R1 正式主壳检查点 — IN_PROGRESS

R0已保存并读回bc57e265a8c517e9138ab7910314dc2bf509d940（tree 002a252f5246a8e06df57ae98d923ea732d05c83）。本阶段直接解析冻结原型DOM/CSS/SVG，非看图重设计。

实现：213px完整文字目录、品牌、原型顶部路径、8项原序导航（概览/所有卡片/筛选学习/开始复盘/知识图谱/学习分析/导入导出/调度设置）、content-scroller/content-container层次；既有目录分页、选择、草稿保护与图谱专用画布保留。原型空subnav也实际占51px，已按computed行为保留。tokens/shell/components/responsive拆出独立来源；未迁移页面规则保留于pages/pending.css，后续各阶段接管。

回收站：主导航独立入口与独立page分支移除；设置分类直接加载UnifiedRecycle及卡片/卡片集/知识点子功能。系统设置close串接回收站busy/unknown保护，切换分类也走close。原服务/事务/恢复确认不删除。R6仍负责设置完整分类布局、恢复/异常/重启/后端全验收，不宣称已完成R6。

实际验证：npm run build退出0；正式production606 Electron的4组场景PASS：目录和8页签切换；设置→内嵌3类回收站→返回，保留列表查询/选择；复盘→设置→回收站→返回，保留思路并允许续写；UI新建文件夹和嵌套集，新Electron进程读回并进入。12张双版本三宽PNG、DOM/CSS快照见evidence-v2，manifest记录入口、环境和hash。第一轮发现旧全局brand/topbar/button覆盖（62px等），已修正；首轮证据保留为历史，不冒充当前版本。

三宽实测目录均213×900、topbar均56高，deck content边界与原型一致。overview仍因旧首页6条recent/文件夹行产生滚动与宽度差，交R2；目录顺序来自真实服务，原型固定演示顺序/数量与总数不同；颜色、SVG及细微差异见diff.json，不将单一尺寸/截图采集当严格视觉PASS。R1保持IN_PROGRESS，Windows/最终视觉/所有跨页回归NOT_RUN；不阻塞R2独立迁移。下一步R2 overview/deckHome源码迁移、三宽、真实数据/空态/续学验证。
