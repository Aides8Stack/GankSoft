export const settingsPersistence: { flush?: () => Promise<boolean> } = {};
export const settingPages = [
  {id:"advanced-diagnosis",title:"高级诊断模型",description:"实验性证据参数；不修改 FSRS"},
  {
    id: "appearance",
    title: "外观与主题",
    description: "浅色、深色或跟随系统",
  },
  {
    id: "schedule",
    title: "复盘调度配置",
    description: "查看卡片集和独立卡片的配置入口",
  },
  {
    id: "backup",
    title: "完整备份与恢复",
    description: "备份学习数据和图片，恢复前核对完整性",
  },
  {
    id: "operations",
    title: "待核对的系统操作",
    description: "核对未确认的维护操作并解除锁定",
  },
  {
    id: "ai",
    title: "AI 模型连接",
    description: "配置可选服务，基础学习不依赖联网",
  },
  { id: "audit", title: "最近操作", description: "查看学习数据操作记录" },
  { id: "trash", title: "回收站", description: "恢复或永久清理已删除内容" },
];
