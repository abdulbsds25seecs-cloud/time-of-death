@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org then reopen this launcher.
  pause
  exit /b 1
)
if not exist "scripts\launch.mjs" (
  echo Extract the ENTIRE prebuilt ZIP first, then open this launcher from the extracted folder.
  pause
  exit /b 1
)
node scripts\launch.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
