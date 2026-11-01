@echo off
echo.
echo  ✦ Our Little Universe — First Time Setup ✦
echo.
echo  Step 1: Installing frontend dependencies...
cd /d %~dp0
call npm install
echo  ✓ Frontend dependencies installed.

echo.
echo  Step 2: Installing backend dependencies...
cd /d %~dp0server
call npm install
call npm install-scripts approve better-sqlite3
call npm install-scripts approve esbuild
call npm install
echo  ✓ Backend dependencies installed.

echo.
echo  Setup complete! Run START.bat to launch the website.
pause
