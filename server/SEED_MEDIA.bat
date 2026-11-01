@echo off
echo.
echo  ✦ Our Little Universe — Media Seed ✦
echo  This will import all your photos, videos and voice notes.
echo.
echo  Starting server...
start /b node node_modules\tsx\dist\cli.mjs src\index.ts > server_seed.log 2>&1
timeout /t 5 /nobreak >nul

echo  Seeding media files...
curl -s -X POST http://localhost:4000/api/seed -H "Content-Type: application/json" -d "{\"adminKey\":\"our-little-universe-setup-2026\"}"
echo.
echo  Done! You can close this window.
pause
