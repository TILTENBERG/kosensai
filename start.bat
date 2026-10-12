@echo off
rem ============================================================
rem  Ryouri Dengon Game - server start (PC1)
rem  Double-click this file. Keep the black window open while playing.
rem  (Japanese guidance is printed by the server itself.)
rem ============================================================
cd /d "%~dp0"
title Ryouri Dengon Game - SERVER (do not close)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js is not installed on this PC.
  echo          Node.js ga mitsukarimasen. README.md no "shokai setup" wo mite kudasai.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\ws\package.json" (
  echo.
  echo  [ERROR] node_modules folder is missing.
  echo          Run "npm install" once on a PC with internet, then copy the whole folder.
  echo          README.md no "shokai setup" wo mite kudasai.
  echo.
  pause
  exit /b 1
)

set OPEN_SENDER=1
node server\index.js

echo.
echo  Server stopped. / Saaba ga tomarimashita.
pause
