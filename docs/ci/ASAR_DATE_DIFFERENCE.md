# Linux ASAR 日期统计差异调查

基线：PR #4 `a281411ad14aa01664fa2b1e4208d2f6e5e300ac`。Run `39425037338` 四个 Job success；Ubuntu Job `118635416826` 原始日志明确记录日期范围 case PASS。不是仅根据绿色状态推断。

## 已确认根因

`openDatabase()` 初始化 `studyTimezone` 时读取 `Intl.DateTimeFormat().resolvedOptions().timeZone`。原 smoke 先创建数据库并提交四次复盘，最后才改为 `Asia/Shanghai`。`review/service.ts` 在提交时根据学习日、上次有效复盘和到期状态持久化 `effective`；之后更改统计时区不会重算历史信用。

Work 的 `/etc/localtime` 指向 `Asia/Shanghai`，虽然 `/etc/timezone` 内容为 `/UTC`。实际 Intl 默认是上海，不能只读文本文件判定系统时区。固定同一 Node、Electron、ASAR、源码与数据初始化，仅用子进程 `TZ` 切换就稳定复现：

| UTC 时间 | 上海学习日 | UTC 提交策略 effective | 上海提交策略 effective |
| --- | --- | --- | --- |
| 2026-10-17 15:59:59Z | 10-17 | 1 | 1 |
| 2026-10-17 16:00:00Z | 10-18 | 0 | 1 |
| 2026-10-18 15:59:59Z | 10-18 | 1 | 1 |
| 2026-10-18 16:00:00Z | 10-19 | 0 | 1 |

四条答错记录均 `self_score=3`，评估后 `score=1`。UTC 策略下第二、四条与前一有效记录只差一秒，未再次到期，不推进 FSRS；第三条跨日且已到期。上海策略下第二、四条跨上海日，第三条虽同日但已到期，所以四条均有效。最终 due_at：UTC 生成 `2026-10-18T16:00:59.000Z`，上海生成 `2026-10-18T16:01:00.000Z`。

10-18 上海统计窗口都包含第二、三条，总数均为 2；有效次数分别为 1 和 2，巩固次数分别为 1 和 0。直接后端 `collectionSummary`、Electron renderer 的 `analytics.collection` 协议调用和实际界面三者一致。原失败不是日期过滤漏项，也不是该差异由异步竞态造成。原始差异日志已保留。

## 环境核对及证据限制

| 项目 | Work | GitHub Ubuntu |
| --- | --- | --- |
| 系统 | Ubuntu 24.04.3 | ubuntu-24.04，镜像 20261018.339.1 |
| Node / npm | 24.19.0 / 11.9.0 | 24.22.0 / 11.19.1（原日志） |
| Electron | 44.7.2 | 同锁文件 `npm ci` 固定 44.7.2；运行时版本未在旧日志打印 |
| 主机 ICU / SQLite | 78.3 / 3.53.3 | 原 CI 日志未记录，待核验 |
| Electron Node / ICU / SQLite | 24.21.0 / 78.2 / 3.53.4 | 原 CI 日志未记录，待核验 |
| 主机时区 | 实测 Asia/Shanghai；显式 UTC 对照成功 | 原日志未打印；其结果与 UTC 夹具完全吻合，不能当作直接时区采证 |
| 数据库 | 每次独立临时 SQLite，schema604 | 同脚本独立初始化，无用户数据库 |
| 构建 | 现有构建 ASAR，修复前后使用同一文件 | 同 SHA/lock，`ci:quality` 构建后 package-check |

不把未打印的 CI ICU/时区推测成实测值。Node 补丁和镜像差异存在，但同一 Work 环境仅切换 TZ 足以产生完整差异，因此无需以升级运行时掩盖夹具缺陷。

## 最小修复及验证入口

只修改测试。`tools/fixtures/v070-date-reviews.ts` 在提交前明确 UTC 调度时区，提交后明确上海统计时区。保留原 CI 的 `[1,0,1,0]` 信用和界面预期 `1`，并增加四条时间戳、信用、评分及真实 renderer API 的断言；不改生产调度、不手改 attempts、不加固定等待。

`tests/asar-date-fixture.test.ts` 在 UTC、上海、纽约三个独立进程调用同一夹具和生产协议，核验学习日边界、相邻日数量、无效范围、有效/巩固次数、调度到期、切换统计时区不改历史及数据库重启一致性。临时路径含空格/中文；没有借助本机默认时区。

`useDeckStatistics` 已检查：deep watch 追踪 deck/selection/dataRevision；每次请求递增 sequence 并清空旧 data；只有最新请求且 deck 相符才能写入，卸载递增 sequence。DateRangeControl 每次输入替换 selection，可能产生中间窗口，但本次原异常的最终 API 与 UI 一致，持续值由已保存记录决定。没有证据要求修改生产 watch/请求逻辑。原有快速输入、无效范围和界面断言均保留，并用独立重复 smoke 验证。

完整执行结果、源码与日志哈希见 `docs/ci/evidence/asar-date-validation.json`（最终验收阶段生成）。历史 rc-withdrawal 的失败日志保留为当时真实结果；本报告的新证据解释并取代“根因未确认”，不抹除旧记录。

## 最终结果与保留限制

最终专项3/3、业务202/202、流水线61/61、全量质量和完整ASAR13组通过；完整ASAR中v070有全部15个case。独立重复日志核验：UTC3、上海3、纽约2，共8次完整15case通过。另两次纽约进程虽返回0，且日期case通过，但只留下4/5个case、没有结束JSON，必须记INCOMPLETE，根因未核实，原日志保留。不能把退出码0单独当作完整通过，也不能据此虚构生产修复。初步9/9说法已由本次完整日志核验更正。最终G2仍等待CI、安全及平台验收；Windows实机未执行。
