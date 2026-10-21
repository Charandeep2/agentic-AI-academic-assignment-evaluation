@echo off
echo ========================================
echo  AI Academic Assessment System
echo  Starting Streamlit Application...
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if streamlit is installed
python -c "import streamlit" >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    pip install -r requirements.txt
    echo.
)

echo Starting the application...
echo Open your browser at: http://localhost:8501
echo.
echo Demo Accounts:
echo   Faculty: dr.smith / faculty123
echo   Student: alice / student123
echo.
streamlit run Home.py --server.port 8501 --server.headless true

pause
