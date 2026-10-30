# v0.7.7 — 卡片集目录管理（Vue 3 交互预览）

- **[CatalogManagementPreview.vue](./CatalogManagementPreview.vue)**：可以挂载到 Vue3 + Vite 开发环境的独立组件。它以模拟卡片集/文件夹数据展示 213px 紧凑目录、`+` 下拉、逐行 `⋯`/右键菜单、模拟新建/重命名/移动、非级联删除与单卡片集 ZIP 导入/导出入口。**没有 SQL、业务调用或真实 ZIP 输出**。
- **正式可复用组件**：`src/unified/UnifiedCatalogContextMenu.vue` 和 `src/unified/UnifiedCatalogBranch.vue`；由 `src/unified/UnifiedWorkspace.vue` 路由到 `UnifiedCatalogEditor.vue` 及 Schema606 卡片内容交换。用户已明确**不需要文件夹导出**。
- **需求合同**：[CATALOG-MANAGEMENT.md](../../requirements/CATALOG-MANAGEMENT.md)，GitHub [#29](https://github.com/Aides8Stack/GankSoft/issues/29)。
- **独立离线 HTML 预览**：在当前 ChatGPT 对话中另有 `GankSoft-v077-catalog-management-preview.html` 下载件，可以不安装 Vue 直接打开体验菜单。此文件是演示性的 UI mock，非生产代码。**Vue 预览源和业务合同已入 GitHub，独立 HTML 文件若未由 GitHub 文件树证明存在，则不应声称已提交 GitHub**。

## 交互及数据约束

1. 根 `+`：新建卡片集、新建文件夹、导入卡片集ZIP。
2. 文件夹：展开/打开、新建子目录/本目录卡片集、导入卡片集 ZIP、改名、移动、删除（默认仅删文件夹本身，子项上移），**没有文件夹导出**。
3. 卡片集：打开、改名、移动、导出卡片集 ZIP、移入回收站。恢复在系统设置。
4. 任一管理入口的实际写入都由统一服务端 API 提交，前端只维护暂存表单；未知回执不重复创建或删除。
5. **606 ZIP 导出当前仅为 1–500 已发布卡片内容包**，含关联知识点和图片，**不包含未发布草稿、学习历史和 FSRS 排期**；不允许退回旧 `exchange.deck.export` 偷偷导出空/不完整数据。空/超限/发布卡与目录数不一致时阻止，并解释原因；后续要完整单集备份需扩协议。
6. 相关定向后端测试位于 `tests/catalog-management-v077.test.ts`。**只有成功执行测试时才能报告 PASS**；Electron GUI、Windows10/11 真机仍需单独验收。

## 运行 Vue 预览的方式

本组件使用 Vue3 `<script setup lang="ts">`，可在已有 GankSoft Vite 前端环境的一个**开发路由**中暂时 import 并挂载它。不应将 mock 预览组件直接挂载到生产主页面或提交真实用户数据库。
