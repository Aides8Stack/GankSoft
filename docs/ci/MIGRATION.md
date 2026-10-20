# G2迁移状态
当前迁移方案见 [PR_TRUST_AND_MIGRATION.md](PR_TRUST_AND_MIGRATION.md) 的F03。六旧分支尚未迁移；main/develop已保护但尚缺可信状态。以下为初次v4设计的历史记录，不作为实时状态。

# 迁移及回滚
v4独立从develop派生，不合并/关闭PR#2/#3。旧quality.yml由v4单次替换，PR#3功能被覆盖，不能随后再次合入旧配置。用户决定处理PR#3。
用户先配置develop/main保护、required pr-gate、只允许维护者合并，禁止force/deletion；当前develop/main均unprotected，自动RC必须阻断。
审核合并v4后才启用develop push；新版本源码预先bump。默认main手动入口需另行批准推广，Work不修改main。
失败新建修复/回滚PR，不reset，不强推，不删除恢复分支/Release。版本及Tag永久不复用。漏发重扫adoption baseline，失败版本阻断后续直到修复或明确人工处置，不静默跳过。
原始配套设计保存在docs/ci/design-v4；它们是计划，验收结果见当前TEST_REPORT。
