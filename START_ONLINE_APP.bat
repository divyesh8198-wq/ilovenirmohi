@echo off
title Our Little Universe - Online Server & App
echo ========================================================
echo  ✦ Starting Our Little Universe for Divs & Manuuu ✦
echo ========================================================
echo.

:: 1. Start Backend on port 4000
start "OLU Backend" /min cmd /c "cd /d "%~dp0server" && node node_modules\tsx\dist\cli.mjs src\index.ts"

:: 2. Start Frontend on port 5173
start "OLU Frontend" /min cmd /c "cd /d "%~dp0" && node node_modules\vite\bin\vite.js --host"

:: 3. Start Cloudflare Tunnel
echo Starting secure online tunnel...
timeout /t 3 >nul
"C:\Users\divye\.gemini\antigravity\scratch\cloudflared.exe" tunnel --url http://localhost:5173
