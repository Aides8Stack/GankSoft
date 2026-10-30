# T2-A 剩余P0操作链执行报告

状态：IN_PROGRESS（按所有者紧急收尾指令立即保存；不再追加测试或进入下阶段）。35条P0已完成实际执行或平台限制登记；存在1 FAIL和3 BLOCKED，不代表P0验收通过。

| 范围 | PASS | FAIL | BLOCKED | NOT_RUN |
|---|---:|---:|---:|---:|
| 本轮35条P0 | 31 | 1 | 3 | 0 |
| 全部250条账本 | 72 | 3 | 3 | 172 |

共46次实际执行/预检，覆盖35个不同CASE；额外次数是工具失败定向复验及OLD-06原图片引用补验。原41PASS、2FAIL逐CASE保持完全一致，未重跑。14项框架检查通过；停止指令前已完成。保存时为保留远端17批计划调整派生器/批次映射，最后这些工具对齐未再运行测试（NOT_RUN），下轮先核验；生产代码未改。

PASS：NEW-05, NEW-09, NEW-19, OLD-02, OLD-06, OLD-07, OLD-08, OLD-09, OLD-10, OLD-11, OLD-14, REVIEW-02, REVIEW-03, REVIEW-04, REVIEW-10, REVIEW-11, REVIEW-17, CLIP-14, CLIP-15, CLIP-16, BACK-05, BACK-06, BACK-07, BACK-10, BACK-11, BACK-13, TRASH-03, TRASH-08, TRASH-09, FAULT-04, FAULT-14。

FAIL：FAULT-05。

BLOCKED：NEW-13, CLIP-03, CLIP-09。缺少真实Windows中文IME、原始Word/WPS富文本和PNG物理剪贴板环境；预检未执行GUI，不能算已通过操作链。所有Windows CI/Win10/Win11层仍NOT_RUN。

新失败观察：异步图片粘贴经media.stage延迟，正文变化后被正确拒绝；没有过期插入或错误修改另一卡，但暂存PNG与media-draft元数据在新PID重启后仍存在。记录 `T2A-FAULT-05-STAGED-IMAGE`，待I3核对资源生命周期合同；图片受资源清单追踪，不冒称未追踪文件泄漏或跨卡数据丢失。未修生产代码。继承NEW-16、MEDIA-03实测FAIL及4项USER_REPORTED，均保留。

工具失败：10次失败/阻塞尝试完整保存在 `evidence/T2-A-INFRA-ATTEMPTS.json`，最终均经定向复验PASS；包括夹具修订号、严格定位器、自动保存读取时机、迁移后客户端epoch、单窗口安全校验、placement DTO和一次点击超时。OLD-06补验确认新图片进入草稿、原发布图片引用与字节保留；未要求应用删除仍受发布历史保护的旧引用。

被测生产源码基线：`e40c896a1876c9f6c4115c6267e96b16e2564e0a`。src/electron/shared/package/lock未改。新测试在该基线的工作树执行，不能称测试脚本已包含于基线提交；后期runner记录逐CASE脚本哈希，最终保存脚本指纹另列evidence。依赖REUSE、410构建文件哈希有效，构建来源`0d0c072117dfed45f6463789fb289e2153a18409`；无安装、无编译。

证据：`evidence/T2-A-RESULTS.json` 保存8轮实际结果、失败GUI文本、反馈摘要、SQLite/媒体摘要与原始文件哈希索引；FAULT-05保留完整文字诊断。原始PNG/日志在隔离的validation-results目录，未冒称已上传二进制；恢复复现由保存脚本和最小Schema606夹具完成。

剩余207计划已存在，按所有者停止指令原样保留，不再重新设计。保存前发现远端已更新17批计划，已原样保留该文件；逐项主批次35+141+22+9不变，平台专属P0仍交叉补证、不重复计数。未执行172条继续NOT_RUN。本轮两个首批命令分别17条和18条，随后只定向复验。

下一轮：先读本报告和RECOVERY-NEXT；environment.mjs status核验缓存；继续T2-P1.01的未执行项，先实现缺失处理器再运行；T2-C和T2-W从现有计划恢复。真实Windows处理器具备来源证据后才能复验3项BLOCKED。FAULT-05与继承2FAIL留I3/F4，继续禁止在收集阶段修改生产源码。`batch.mjs`不自动重跑PASS/FAIL；显式`--retry-blocked`才可复验BLOCKED。不进入CI等待、合并或发布。
