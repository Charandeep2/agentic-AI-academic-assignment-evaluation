@echo off
echo ======================================================================
echo  AI-Driven Academic Assessment & Performance Analytics System
echo  Powered by Groq LLM API (qwen/qwen3.8-27b) + Next.js App Router
echo ======================================================================
echo.

echo [1/2] Starting Python FastAPI Backend on port 8000...
start "Academic AI Backend (FastAPI)" cmd /k "cd /d "%~dp0" && python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Next.js Frontend on port 3000...
start "Academic AI Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo  Both servers are launching in dedicated background windows!
echo  - Frontend: http://localhost:3000
echo  - Backend API: http://localhost:8000
echo  - Backend Swagger Docs: http://localhost:8000/docs
echo ======================================================================
echo.
timeout /t 5
start http://localhost:3000
exit
