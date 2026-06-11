@echo off
REM AttendanceHub — Windows startup script
REM Run this script to start the Streamlit app in the background on port 8501.

set APP_DIR=%~dp0
cd /d "%APP_DIR%"

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

echo Starting AttendanceHub on http://localhost:8501 ...
start "AttendanceHub" /MIN cmd /c ".venv\Scripts\python.exe -m streamlit run app.py --server.port 8501 --server.headless true"

echo AttendanceHub is running in a minimized window.
echo To stop the app, close the "AttendanceHub" command window or end the streamlit process in Task Manager.
