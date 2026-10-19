# v0.7.1 卡片集 ZIP 与模块 API

复用`ganksoft.content` schemaVersion `2.0`及`ganksoft.content.container`容器version `1`，不另建一套不兼容格式。ZIP包括`manifest.json`、`content.json`和按内容寻址规则列出的附件；读取仍核对条目数、长度、SHA256、安全路径、图片编码、数量上限和知识点引用。

新增可选字段`collection: { name: string, kind: 'question' | 'memory' }`。整集导出和所选卡片导出均填写。旧包不带该字段时，可从单一卡片类型推导；空卡片集必须有类型信息。混合类型包不能作为一个卡片集导入。所选卡片必须全部存在于当前存活集，不允许跨集夹带；知识点仅携带其关联与必要祖先。

卡片库管理接口通过`src/composables/catalogManagement.ts`及`src/services.ts`调用公共协议：

- `exchange.open`：原生文件选择，返回暂存文件令牌；新集导入界面只接受ZIP。
- `exchange.collection.describe({fileToken})`：只读核验名称、类型、卡片数、知识点数；不创建空集。
- `exchange.collection.import({fileToken,name,folderId})`：先验证，再在同一数据库事务创建目标集、预览并提交导入；目标文件夹/同名校验沿用目录模块。可确认已回滚的拒绝不遗留“待核对”锁；提交或回滚状态未知仍保留可靠性防护。
- `exchange.deck.export({id,cardIds?})`：省略cardIds导出整集；提供时导出非空所选子集。原生保存对话框选择目录和文件名，取消不写文件。

导入新建本地ID，复用现有稳定来源映射及每集隔离；取消选择或关闭导入界面不创建集。新集采用原有默认复盘策略，导入后可直接学习。

内容交换包不包含逐次复盘历史、FSRS状态、当前草稿或AI密钥；这些学习数据迁移应使用完整备份/恢复。完整备份仍包含数据库及图片，schema601和既有v060/data路径保持兼容。

已移除`electron/modules/knowledge/archives.ts`及`knowledge.archive.publish`、`knowledge.archive.package`、`exchange.archive.export`。旧数据库中的knowledge_archives及内容包中的archives/来源版本字段仅为已有备份、来源去重和知识树传输保留，不再提供版本存档管理界面或发布服务。构建在编译前清理dist-electron，防止已删除模块残留在ASAR中。
