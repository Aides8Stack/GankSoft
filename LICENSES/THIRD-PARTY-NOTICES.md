# 第三方组件

应用继续使用 v0.5.1 的技术栈。各组件原始许可证保留在本目录，Electron/Chromium 的许可证随运行时一起分发。项目自身的权利不因这些第三方许可证而改变。

主要组件：Vue（MIT）、ts-fsrs（MIT）、Zod（MIT）、@napi-rs/image（MIT）、Cytoscape（MIT）、MindElixir（MIT）、yauzl（MIT）、yazl（MIT）、pend（MIT）、buffer-crc32（MIT）。精确版本由 package-lock.json 固定。

Windows 包额外分发 Microsoft Visual C++ 运行库 vcruntime140.dll 和 vcruntime140_1.dll。来源为微软官方 VC Redistributable，版本/哈希见 vendor/windows-x64/provenance.json，原始条款见 MSVC-Redistributable-License.rtf。它们不属于上述 MIT 组件。

PickQ 仅作为架构设计参考，固定提交 31753c5f106f76b5ae556c8511521777bf23898a；本交付没有复制 PickQ 代码或资产，也不包含其运行时。参考项目：https://github.com/Nauv357/pickq

DOMPurify 3.4.17，Copyright Cure53 and other contributors，来自 https://github.com/cure53/DOMPurify/tree/3.4.17 。上游许可证表达式为 `(MPL-2.0 OR Apache-2.0)`；本软件选择 Apache-2.0，全文见 dompurify-LICENSE.txt。未修改上游源码；本声明保留上游版权归属。npm 发布包没有独立 NOTICE 文件。本目录由现有 Windows 打包流程复制到便携包。
