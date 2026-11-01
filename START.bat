@echo off
title Our Little Universe — Starting...
echo.
echo  ================================================
echo   Our Little Universe — Divs ^& Manuuu  💗
echo  ================================================
echo.

echo  [1/2] Starting Backend (API server on port 4000)...
cd /d "%~dp0server"
start "OLU Backend - keep open" /min cmd /c "node node_modules\tsx\dist\cli.mjs src\index.ts & pause"

echo  Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo  [2/2] Starting Frontend (website on port 5173)...
cd /d "%~dp0"
start "OLU Frontend - keep open" /min cmd /c "node node_modules\vite\bin\vite.js & pause"

echo  Waiting for frontend to start...
timeout /t 5 /nobreak > nul

echo.
echo  ================================================
echo   Website is ready!
echo   Open this in your browser:
echo   http://localhost:5173
echo  ================================================
echo.
echo  (Do NOT close the two background windows)
echo.

start "" "http://localhost:5173"
pause
