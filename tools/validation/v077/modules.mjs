// Single source of truth for v0.7.7 module selection; CASE contracts remain in E2E-RESULTS.json.
// This is a PLAN, not a list of implemented or passed scenarios.
export const MODULES = Object.freeze([
  {
    "id": "app",
    "name": "启动与学习总览",
    "groups": [
      "ENV",
      "HOME"
    ],
    "baseline": [
      "ENV-01",
      "ENV-02",
      "HOME-01",
      "HOME-02"
    ],
    "negative": [
      "ENV-07",
      "HOME-08"
    ],
    "flow": "首次启动→首页空态→创建卡片集→退出重启",
    "feedback": "初始化/空态/读取失败提示",
    "persist": "数据目录、首页统计和新卡片集可读"
  },
  {
    "id": "catalog",
    "name": "文件夹与卡片集",
    "groups": [
      "CAT"
    ],
    "baseline": [
      "CAT-02",
      "CAT-04",
      "CAT-10",
      "CAT-11"
    ],
    "negative": [
      "CAT-03",
      "CAT-08"
    ],
    "flow": "新建卡片集→改名→返回→重启→移入回收站→恢复",
    "feedback": "成功/重名/取消/删除影响提示",
    "persist": "卡片集ID、名称、目录关系与计数一致"
  },
  {
    "id": "cards",
    "name": "卡片、草稿与列表",
    "groups": [
      "NEW",
      "OLD",
      "LIST"
    ],
    "baseline": [
      "NEW-01",
      "NEW-02",
      "NEW-03",
      "NEW-14",
      "NEW-16",
      "NEW-17",
      "OLD-01",
      "OLD-02",
      "OLD-03",
      "OLD-11",
      "LIST-01",
      "LIST-02"
    ],
    "negative": [
      "NEW-18",
      "OLD-14"
    ],
    "flow": "三类型建卡→自动/手动草稿→草稿箱→合法发布→列表→编辑旧卡→重启",
    "feedback": "保存中/草稿已保存/发布成功/缺少正确答案/保存冲突",
    "persist": "cardId与内容版本正确、草稿可找回、历史不变"
  },
  {
    "id": "editor",
    "name": "编辑器、选项与粘贴",
    "groups": [
      "EDITOR",
      "CLIP"
    ],
    "baseline": [
      "EDITOR-03",
      "EDITOR-06",
      "CLIP-01",
      "CLIP-02",
      "CLIP-04"
    ],
    "negative": [
      "CLIP-15",
      "EDITOR-20",
      "EDITOR-21"
    ],
    "flow": "输入选项→选择答案→Ctrl+V文本/网页→保存→重开",
    "feedback": "粘贴/格式降级/非法HTML拒绝/预览取消反馈",
    "persist": "选项顺序、光标编辑结果和正文准确"
  },
  {
    "id": "learning",
    "name": "筛选学习、复盘与调度",
    "groups": [
      "PLAN",
      "REVIEW"
    ],
    "baseline": [
      "PLAN-01",
      "PLAN-09",
      "REVIEW-01",
      "REVIEW-02",
      "REVIEW-04",
      "REVIEW-05"
    ],
    "negative": [
      "REVIEW-03"
    ],
    "flow": "筛选→生成学习队列→答题/揭晓→评分→保存→重启",
    "feedback": "筛选空态/答题提交/保存成功/任务完成提示",
    "persist": "评分、FSRS、下次日期与复盘历史对应"
  },
  {
    "id": "analytics",
    "name": "学习分析",
    "groups": [
      "AN"
    ],
    "baseline": [
      "AN-01",
      "AN-06"
    ],
    "negative": [
      "AN-07"
    ],
    "flow": "完成复盘→分析页→查看统计→进入历史详情",
    "feedback": "加载/空数据/统计完成/读取失败提示",
    "persist": "可见统计与复盘事件一致"
  },
  {
    "id": "knowledge",
    "name": "知识图谱与Markdown",
    "groups": [
      "KNOW",
      "MD"
    ],
    "baseline": [
      "KNOW-02",
      "KNOW-11",
      "MD-01"
    ],
    "negative": [
      "KNOW-12",
      "MD-07"
    ],
    "flow": "创建知识点→关联卡片→编辑Markdown→保存→重启",
    "feedback": "节点保存/正文保存/取消不写/关联错误提示",
    "persist": "节点关系、Markdown正文、知识关联精确"
  },
  {
    "id": "media",
    "name": "图片与资源库",
    "groups": [
      "MEDIA"
    ],
    "baseline": [
      "MEDIA-01",
      "MEDIA-03"
    ],
    "negative": [
      "MEDIA-07"
    ],
    "flow": "正文插图→资源库预览→设置图片大小→保存重启",
    "feedback": "上传进度/成功/资源不可用/安全拒绝提示",
    "persist": "资源哈希、assetId、placement与引用完整"
  },
  {
    "id": "exchange",
    "name": "内容导入导出",
    "groups": [
      "EX"
    ],
    "baseline": [
      "EX-02",
      "EX-03"
    ],
    "negative": [
      "EX-05"
    ],
    "flow": "选择卡片→导出内容包→隔离副本导入确认",
    "feedback": "预览影响/保存位置/完成/冲突拒绝提示",
    "persist": "内容、知识点、图片与数量一致"
  },
  {
    "id": "settings",
    "name": "系统设置、主题与数据目录",
    "groups": [
      "SET"
    ],
    "baseline": [
      "SET-01",
      "SET-02",
      "SET-04"
    ],
    "negative": [
      "SET-03"
    ],
    "flow": "进入设置九类→改主题→保存→重启→检查数据入口",
    "feedback": "已保存/保存失败可重试/不可操作项有原因",
    "persist": "设置值与原页面返回状态一致"
  },
  {
    "id": "storage",
    "name": "备份恢复与回收站",
    "groups": [
      "BACK",
      "TRASH"
    ],
    "baseline": [
      "BACK-01",
      "BACK-03",
      "TRASH-02"
    ],
    "negative": [
      "BACK-04",
      "TRASH-04"
    ],
    "flow": "备份→检查归档→隔离库恢复→删卡→回收站恢复",
    "feedback": "备份路径/风险预览/确认/取消/恢复完成提示",
    "persist": "SQLite/图片/卡ID/历史/调度一致、取消零写"
  },
  {
    "id": "reliability",
    "name": "故障恢复与Windows",
    "groups": [
      "FAULT",
      "WIN"
    ],
    "baseline": [
      "FAULT-02",
      "FAULT-03",
      "WIN-09"
    ],
    "negative": [
      "FAULT-08",
      "WIN-07"
    ],
    "flow": "重复点击/注入失败→保留输入→重试→Win10/11 ZIP重启",
    "feedback": "禁止重复提交/错误可见/未知结果待核对",
    "persist": "无重复记录、原数据完整、Win10/11独立证据"
  }
]);
export const MODULE_BY_ID = Object.freeze(Object.fromEntries(MODULES.map(m=>[m.id,m])));
export function moduleForCase(id) {
  const group=String(id).split('-')[0];
  return MODULES.find(m=>m.groups.includes(group))??null;
}
export function moduleCases(cases,moduleId,{baseline=false,includeNegative=false}={}) {
  const module=MODULE_BY_ID[moduleId];
  if (!module) throw Error('V077_UNKNOWN_MODULE: '+String(moduleId));
  const ids=baseline?new Set([...module.baseline,...(includeNegative?module.negative:[])]):null;
  return cases.filter(row=>module.groups.includes(row.id.split('-')[0])&&(!ids||ids.has(row.id)));
}
export function validateModules(cases) {
  const byId=new Map(cases.map(row=>[row.id,row]));
  if(byId.size!==cases.length)throw Error('V077_DUPLICATE_CASES');
  const seenGroups=new Set(),seenModules=new Set();
  for(const module of MODULES){
    if(seenModules.has(module.id))throw Error('V077_DUPLICATE_MODULE: '+module.id);
    seenModules.add(module.id);
    for(const group of module.groups){
      if(seenGroups.has(group))throw Error('V077_DUPLICATE_MODULE_GROUP: '+group);
      seenGroups.add(group);
    }
    for(const id of [...module.baseline,...module.negative]){
      if(!byId.has(id))throw Error('V077_MODULE_UNKNOWN_CASE: '+module.id+' / '+id);
      if(!module.groups.includes(id.split('-')[0]))throw Error('V077_MODULE_CASE_SCOPE: '+module.id+' / '+id);
    }
    if(module.baseline.length===0)throw Error('V077_EMPTY_BASELINE: '+module.id);
    if(new Set(module.baseline).size!==module.baseline.length)throw Error('V077_DUPLICATE_BASELINE: '+module.id);
  }
  for(const row of cases)if(!seenGroups.has(row.id.split('-')[0]))throw Error('V077_UNMAPPED_MODULE_CASE: '+row.id);
  return {modules:MODULES.length,groups:seenGroups.size,cases:cases.length};
}
