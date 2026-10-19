@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if not exist node_modules\.bin\electron.cmd (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run check
if errorlevel 1 goto failed
call npm run make:win
if errorlevel 1 goto failed
echo Windows 程序包已生成，请查看 out 文件夹。
pause
exit /b 0
:failed
echo 打包失败，请保留以上错误信息。
pause
exit /b 1
