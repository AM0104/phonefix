@echo off
rem =====================================================================
rem  PhoneFix - backend tests (61 tests on in-memory SQLite)
rem  Wrapper runs run-tests.ps1 bypassing the script execution policy.
rem =====================================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-tests.ps1" %*
set CODE=%ERRORLEVEL%
echo.
pause
exit /b %CODE%
