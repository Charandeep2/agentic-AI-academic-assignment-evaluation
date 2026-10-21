@echo off
echo ======================================================================
echo  AI-Driven Academic Assessment & Performance Analytics System
echo  Launching Modern Next.js Interface...
echo ======================================================================
echo.

cd /d "%~dp0frontend"

echo Checking node and npm...
node -v
npm -v
echo.

echo Starting Next.js development server at http://localhost:3000 ...
echo Press Ctrl+C in this terminal to stop the server.
echo.
npm run dev
pause
