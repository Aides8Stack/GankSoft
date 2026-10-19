# GankSoft 数据协议与知识点版本设计

## 两类学习内容

政治理论、常识使用 `memory` 记忆卡：提示、积累内容、知识点、来源、自评历史和排期。其他七科使用 `question` 错题：题干、选项、答案、解析、知识点及作答历史。两个流程的数据和统计分别保存。

## 知识点身份与版本

每科有独立的当前图谱。知识点的本地 ID 稳定，题目多对多关联该 ID，修改名称不改变引用。

另外建立不可变知识点存档：`archiveId + version` 唯一确定一份节点、正文、层级及相关关系的快照。同一 archiveId 始终属于同一科目。不同版本使用同一个 node key 表示同一知识概念。

例：`data-analysis / v1.0 / base-value` 与 `data-analysis / v1.1 / base-value` 是同一个知识点的两个版本。名称可由“基期量”改为“基期量计算”，本地关联保持稳定；旧档案保留旧内容。

知识点版本与 Git 软件版本是两套独立机制。历史存档只读；日常增删改在当前图谱。导入旧版本是“合并应用”，并非整库回滚：未包含的节点、关系不删除，题目和复盘记录不清空。若要删除当前节点／关系，请在图谱明确操作。

当前图谱修改后不会自动改写某个已发布版本，需要用新版本名再次存档。源文件信息及原始知识点版本引用保存在导入记录中。

## 文件格式

UTF-8 JSON，建议扩展名 `.gank.json`。可参考 `examples/sample.gank.json` 和 JSON Schema。软件还执行 Schema 之外的语义检查，例如层级循环、跨科目引用、同层重名、映射冲突和版本覆盖。

```json
{
  "format": "ganksoft.exchange",
  "schemaVersion": "1.0",
  "packageId": "batch-20261015-001",
  "namespace": "my-note-files",
  "archives": [],
  "items": []
}
```

| 字段      | 规则                                                 |
| --------- | ---------------------------------------------------- |
| packageId | 每一批数据的唯一编号，修订包换新编号                 |
| namespace | 一组来源条目的稳定命名空间，后续批次保持相同         |
| archives  | 本包附带的知识点存档，可只包含存档、不包含题目       |
| items     | 逐题或逐条积累的数据，可引用本包或已导入的知识点存档 |

标识 archiveId、packageId、namespace、节点 key、条目 key 使用英文字母、数字及 `_ : . -`，不使用显示名称代替编号。

## 知识点存档

```json
{
  "archiveId": "data-analysis",
  "subject": "资料分析",
  "version": "v1.0",
  "note": "从第一批资料提取",
  "nodes": [
    { "key": "growth", "name": "增长相关", "parentKey": null },
    {
      "key": "base-value",
      "name": "基期量计算",
      "parentKey": "growth",
      "principle": "基期量 = 现期量 ÷ (1 + 增长率)",
      "conditions": "已知现期量和增长率",
      "method": "先识别已知量，再代入",
      "traps": "区分增长量和增长率"
    }
  ],
  "relations": [
    { "sourceKey": "growth", "targetKey": "base-value", "kind": "公式应用", "note": "关系说明" }
  ]
}
```

nodes 支持 aliases、principle、conditions、method、traps。父子关系使用 parentKey；同层或跨分支联系使用 relations。一个直属父节点，禁止循环；相关联系为无向关系，不能自连接或跨科目。

## 错题条目

```json
{
  "key": "source-a-q001",
  "kind": "question",
  "subject": "资料分析",
  "title": "基期量例题",
  "stem": "题干原文",
  "options": "A. …\nB. …\nC. …\nD. …",
  "answer": "B",
  "analysis": "原解析或处理后的建议解析",
  "analysisOrigin": "source",
  "needsReview": false,
  "thought": "仅在用户原文件有批注时填写个人错误思路",
  "source": { "file": "原始错题.pdf", "page": "12 / 第3题" },
  "knowledgeRefs": [{ "archiveId": "data-analysis", "version": "v1.0", "nodeKey": "base-value" }]
}
```

answer 为 A—D；未知时留空，不猜造。analysisOrigin：source（原资料）、assistant（新生成建议）、mixed（混合整理）。needsReview 标记 OCR 不确定、答案冲突等需核对内容。

assistant 解析、needsReview=true、缺答案或没有知识点的错题，均保留待整理，不直接加入正式复盘。只有明确答案、有效知识点，且没有核对标记的题才加入复盘。

material 可保存资料分析公共文字材料。题目和解析图片使用 images：每张包含 role=question/analysis、mime=image/png/jpeg/webp、base64=纯 Base64（不带 data: 前缀）。不使用本机绝对路径或联网 URL，便于跨电脑导入。先用系统截图裁剪，避免题图中暴露答案。MVP 同一导入包公共文字材料按题保存；手动编辑可引用现有材料。

## 记忆卡条目

```json
{
  "key": "source-b-memory001",
  "kind": "memory",
  "subject": "政治理论",
  "title": "某概念",
  "cue": "应回忆什么？",
  "content": "积累原文与整理后的要点",
  "source": { "file": "积累.docx", "page": "第二节" },
  "knowledgeRefs": []
}
```

记忆卡不需要选项或答案。导入当前支持文字内容，图片积累应先转写。可先保存再关联知识点。按0完全忘记、1零散、2部分、3基本完整、4准确且能解释自评，沿用间隔算法但与错题历史分开。同日巩固不提高参考分；正文或提示变化后重新验证。

## 导入流程与一致性

1. 校验格式、数量、图片内容、版本、关系和引用。
2. 优先使用 archiveId/nodeKey 已有绑定，其次匹配同科目、同父节点的精确名称；不做模糊自动归并。
3. 预览新增／复用／更新及错误；可为节点手动指定本学科现有知识点，可取消某些条目。
4. 默认保留当前知识卡、层级和已有连线说明，仅建立关联；更新既有知识卡和层级需启用“允许更新知识点”，策略变化后重新预览。
5. 确认时检查数据库是否发生变化；在一个事务中写入，失败回滚并清理新附件。
6. 保存导入报告、来源和知识点版本引用。

相同 packageId、相同内容再次导入只返回原报告。namespace/key 相同且内容一致的条目跳过，不覆盖本地编辑；相同 key 内容变更则报冲突，需要排除或分配新的修订条目 key。相似题干只提示疑似重复，由用户决定是否取消选中。

已发布的 archiveId/version 内容不允许改写；新增版本可保留 key 更新名称和内容。知识点合并时迁移导入编号绑定和学习条目关系，原存档快照不修改。多个入库节点不能静默对应同一节点；请先在来源存档中明确合并。已经通过软件合并、具有明确历史绑定的旧编号可以共同复用同一当前节点；来源中因此形成的自连接会跳过，原存档不改动。

限制：单包128 MB、最多30份存档、2000条学习内容、每份5000节点／20000关系、共1000张图片、每图20 MB。超过时按科目或来源拆包。

## 你的文件如何处理

先提供少量代表性文件。先提取各科知识点，统一命名、层级、同义关系并形成候选 v1 存档；核对后再按这些 key 逐题整理。后续文件优先复用已有 key，新增或调整知识时发布 v1.1 等新版本，避免每一批另建一套重复图谱。

提取时保留原文和出处，不从题目反推用户真实错误原因；缺失或不确定内容明确标记。原始 Word/PDF/截图的解析在软件外完成，软件负责导入标准化结果，当前没有一键解析任意原始文件的 OCR 引擎。
