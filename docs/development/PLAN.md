# Pipeline v4.0 计划
基线 c8db715d33265bdf8e2edd05f0f14a35b97de8ac；分支 infra/pipeline-v4。
P0 审计/隔离/初始化；P1 版本治理；P2 PR去重和门禁；P3 可信RC构建；P4 RC事务与队列；P5 Stable/公开审计；P6 本地综合验证及Draft PR。
每阶段测试、更新状态、独立提交并远程读回；不等待远程CI。P6真实合并演练未经授权NOT_RUN。
复用ci:quality、windows-package.ps1、release:verify，不改图片PR #2。v4替代PR #3；保留#3，由用户决定关闭。
