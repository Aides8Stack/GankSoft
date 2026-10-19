@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 LTS，然后重新双击本文件。
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
  echo 需要 Node.js 24 或更新版本。
  pause
  exit /b 1
)
if not exist node_modules\.bin\electron.cmd (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo 启动失败。请将上面的错误信息保留下来，查看 README.md 的排查说明。
pause
exit /b 1
