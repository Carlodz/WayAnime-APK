@echo off
chcp 65001 >nul
title WayAnime - Build Installer
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js ma mtsabbatch. Tsabbtou men https://nodejs.org w3awd 3ayet had l fichier.
  pause
  exit /b 1
)
if exist "%~dp0cert.pfx" (
  set /p CSC_KEY_PASSWORD=Password dyal cert.pfx: 
  set "CSC_LINK=%~dp0cert.pfx"
  echo [SIGNING] cert.pfx lqitou - l installer ghadi ytsign.
) else (
  set CSC_IDENTITY_AUTO_DISCOVERY=false
  echo [INFO] ma kayench cert.pfx - l installer ghadi ykoun bla signature ^(Windows ghadi y3ti SmartScreen^). Chouf SIGNING.md
)
echo [1/2] npm install ...
call npm install
if errorlevel 1 goto :fail
echo [2/2] Building installer ...
call npm run build
if errorlevel 1 goto :fail
echo.
echo Mzyan! L installer dyalek f dossier: dist\WayAnime-Setup-1.2.0.exe
start "" "%~dp0dist"
pause
exit /b 0
:fail
echo Wa9e3 mouchkil f build. Sift lia screenshot dyal l erreur.
pause
exit /b 1
