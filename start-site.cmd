@echo off
rem =====================================================================
rem  PhoneFix launcher. All messages are printed by start-site.ps1.
rem  NOTE: keep this .cmd ASCII-only: Cyrillic inside if(...) blocks
rem  breaks cmd.exe parsing on multibyte characters.
rem
rem  PhoneFix starts on its own port: 4381 (taken from backend\.env APP_URL).
rem  If the port is busy, the script moves PhoneFix to the next free port by itself
rem  and never stops the other sites (VINPart :8000, CookBook :4173).
rem
rem  Usage:  start-site.cmd              start the site
rem          start-site.cmd -CheckOnly   only check port 4381
rem          start-site.cmd -Port 4390   start on another port
rem =====================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-site.ps1" %*
set "RC=%errorlevel%"

rem 1 = startup error, 2 = port is busy (both already explained in Russian)
if "%RC%"=="1" pause
if "%RC%"=="2" pause

endlocal