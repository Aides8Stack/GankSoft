# R2 — IN_PROGRESS

起点 c4ba11802b9fe8fc84ca0789fa11d673c093ae87，原分支 / Draft PR #15。仅执行R2，不进入R3。

首个版本：UnifiedHome / UnifiedDeckOverview / UnifiedWorkspace；overview.css直接迁移冻结原型相关规则，隔离于R2页面。总览递归读取既有catalog并展示嵌套卡片集和真实due；文件夹管理保留折叠入口。三项最近学习、真实会话续学及无会话时待学入口；本集四快捷、历史卡片、真实平均自评，空集不混入其他集卡片。未改Schema606/FSRS。

测试：npm run build PASS（本工作树）；业务专项、Electron及三宽视觉 NOT_RUN。未宣称视觉一致，R2未验收。下一步补专项、真实606/切集/续学/重启/空态错误和R1最小回归、同数据三宽截图及差异记录。

保存：本检查点待上传；实际SHA通过Git历史和远端独立读回确定。
