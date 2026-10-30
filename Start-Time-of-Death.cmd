@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org then reopen this launcher.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo Install Git from https://git-scm.com then reopen this launcher.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4317 in your browser.
echo Press Ctrl+C to stop. Ollama is optional and runs separately.
if not exist "dist\index.html" (
  echo Build the interface first: npm ci, then npm run build.
  pause
  exit /b 1
)
node --env-file-if-exists=.env.local server.mjs
pause
