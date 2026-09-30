@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale Node.js 22.12 ou superior e tente novamente.
  pause
  exit /b 1
)
node scripts\start-game.js %*
if errorlevel 1 pause
