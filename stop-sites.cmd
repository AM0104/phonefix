@echo off
rem =====================================================================
rem  Stops forgotten PHP dev servers (PhoneFix / VINPart / CookBook).
rem  All messages are printed by stop-sites.ps1.
rem  Keep this .cmd ASCII-only: Cyrillic inside cmd blocks breaks parsing.
rem
rem  Usage:  stop-sites.cmd                stop all
rem          stop-sites.cmd -WhatIfOnly    only show
rem          stop-sites.cmd -Keep 4381     keep the PhoneFix port
rem =====================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-sites.ps1" %*
pause

endlocal