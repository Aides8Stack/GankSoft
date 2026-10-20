# Pipeline v4 审计与架构
2026-10-20：GitHub实时读取；Private，默认main=a0fb65d89b7273c6f06beb763e66b3c4d1899a05；develop=c8db715d33265bdf8e2edd05f0f14a35b97de8ac，protected=false。
全部341源码blob已逐字节SHA1核验，树10f8ce15939bec5ff02c58a5b7cfd1d20e2c5d3c。用GitHub签名payload重建精确基线commit，shallow边界明确，不冒充取得全历史。
Node24.19.0；npm11.9.0；依赖安装524项。标准Git clone认证失败，采用GitHub Git Data API，保留基树/父链/非强制带expected_sha更新ref。
旧quality.yml同时push(develop/feature/infra)+PR，双平台全量和Windows安装包绑定PR。现有CI脚本完整保留。
PR#2 head57725a646aac73850baef0d223ec88344589f2d9 图片独立；PR#3 headce3898531b8fcd7418727f85f33db0780261386e仅初级去重，仍PR打包。二者Draft未合并。
新PR仅pull_request；develop push只RC；main push只集成；手动完整检查独立。风险分类未知即全量，pr-gate稳定always汇总。
RC采用固定adoption baseline第一父链扫描，串行同组协调器逐SHA对账，解决GitHub pending替换。多平台质量/安全先完成所有intent，再按源码顺序打包及发布；前项失败阻断后项，恢复重扫。发布只有独立Job写权限。
发布事务Draft→全资产上传→远程重下载验哈希→Pre-release；同版本不同SHA拒绝，已发布相同身份严格验证后幂等，Draft冲突不覆盖。
