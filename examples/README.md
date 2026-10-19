# 内容包示例

软件的“批量导入与导出”页面选择 `.gank.json` 或 `.gank.zip` 文件。选择错题卡片集导入 fresh-review-12.gank.zip，选择记忆卡片集导入 fresh-memory-6.gank.zip。示例均为演示数据。

同名 `.gank.json` 可直接导入，也可用于编写内容。JSON与ZIP均按 ganksoft.content / 2.0 校验；ZIP将图片独立存放，JSON的图片使用base64。编辑后如需ZIP，可在源码开发环境重新封装：

```bash
node --experimental-strip-types tools/build/content-package.ts examples/question-template.gank.json examples/question-template.gank.zip
```

内部业务格式为 ganksoft.content / 2.0，容器包含清单、内容 JSON 及二进制附件。目标卡片集由导入页面选择，便携来源标识不会直接接管数据库 ID。混合卡类型的 sample 文件用于描述结构，实际导入须按卡片类型拆分。
