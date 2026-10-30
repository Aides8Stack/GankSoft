# v0.7.7 — 卡片集目录管理（Vue 3 交互预览）

- **[CatalogManagementPreview.vue](./CatalogManagementPreview.vue)**：可以挂载到 Vue3 + Vite 开发环境的独立组件。它以模拟卡片集/文件夹数据展示 213px 紧凑目录、`+` 下拉、逐行 `⋯`/右键菜单、模拟新建/重命名/移动、非级联删除与单卡片集 ZIP 导入/导出入口。**没有 SQL、业务调用或真实 ZIP 输出**。
- **后续正式实现规划（尚未开发）**：未来可以新增 `src/unified/UnifiedCatalogContextMenu.vue`，并按需求对既有 `UnifiedCatalogBranch.vue`、`UnifiedWorkspace.vue`、`UnifiedCatalogEditor.vue` 做受控接入。**本轮没有这些生产改动，也不需要文件夹导出。**
- **需求合同**：[CATALOG-MANAGEMENT.md](../../requirements/CATALOG-MANAGEMENT.md)，GitHub [#29](https://github.com/Aides8Stack/GankSoft/issues/29)。
- **运行方式**：根目录执行 `npm ci`（已有依赖无需重装）后，运行 `npx vite --config docs/v077/prototypes/vite.config.ts`；打开预览页面选择“卡片集管理”。仓库中实际保留的是 Vue 3 原型，不是单独 HTML 的完整功能实现。

## 交互及数据约束

1. 根 `+`：新建卡片集、新建文件夹、导入卡片集ZIP。
2. 文件夹：展开/打开、新建子目录/本目录卡片集、导入卡片集 ZIP、改名、移动、删除（默认仅删文件夹本身，子项上移），**没有文件夹导出**。
3. 卡片集：打开、改名、移动、导出卡片集 ZIP、移入回收站。恢复在系统设置。
4. 任一管理入口的实际写入都由统一服务端 API 提交，前端只维护暂存表单；未知回执不重复创建或删除。
5. **606 ZIP 导出当前仅为 1–500 已发布卡片内容包**，含关联知识点和图片，**不包含未发布草稿、学习历史和 FSRS 排期**；不允许退回旧 `exchange.deck.export` 偷偷导出空/不完整数据。空/超限/发布卡与目录数不一致时阻止，并解释原因；后续要完整单集备份需扩协议。
6. **本轮只交付 Vue 交互预览和需求文档**，不新增/执行业务测试，不修改正式组件。后续真正实施需新增定向测试，并把 Electron GUI/Win10/11 实机验收分别记录。

## 运行 Vue 预览的方式

组件使用 Vue 3 `<script setup lang="ts">`，统一挂载在 `docs/v077/prototypes/` 的独立 Vite 预览入口。**不修改正式软件路由，不访问用户数据库，不进行真实导入导出。**
