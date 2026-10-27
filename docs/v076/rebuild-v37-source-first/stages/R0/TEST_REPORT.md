# R0 测试报告

被审源码基线 `8f61ab90678de88ee8e94d54d78978394431dac0`；Linux，Node v24.22.1。

| 命令/检查 | 退出码 | 结果 |
|---|---:|---|
| `sha256sum docs/v075/reference/OPEN-ME-v3.7.html` | 0 | PASS，哈希匹配，1/1 |
| `npm ci --offline --no-audit --no-fund` | 1 | FAIL，ENOTCACHED zwitch-2.0.4.tgz；0 测试运行 |
| 正则索引 Python 脚本 | 0 | PASS，索引生成；不等于功能测试 |

VISUAL、UI_INTERACTION、IPC_API、BACKEND_INTEGRATION、PERSISTENCE_RESTART、NEGATIVE_SECURITY、REGRESSION、WINDOWS_REAL：NOT_RUN；依赖不足及无 Windows 环境，未执行产品测试，无通过数量。索引未覆盖动态属性，仍须人工复核。

`git diff --check` 与三个 JSON `python3 -m json.tool` 检查退出码 0；密钥模式扫描无匹配（有限模式扫描，不保证发现所有敏感内容）。这些是文档检查，不是产品测试。
