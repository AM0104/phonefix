@echo off
rem =====================================================================
rem  PhoneFix - environment check
rem  Wrapper runs check-env.ps1 bypassing the script execution policy.
rem =====================================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-env.ps1" %*
set CODE=%ERRORLEVEL%
echo.
pause
exit /b %CODE%
