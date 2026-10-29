@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" (
  echo Missing .env. Copy .env.example to .env and add your private Supabase server-side key.
  pause
  exit /b 1
)
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg not found. Install it with: winget install --id Gyan.FFmpeg.Shared --exact
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  py -3.11 -m venv .venv
  if errorlevel 1 (
    echo Python 3.11 not found. Install Python and enable Add Python to PATH.
    pause
    exit /b 1
  )
)
call ".venv\Scripts\activate.bat"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" set "%%A=%%B"
)
set PYTHONUNBUFFERED=1
python -m uvicorn app:app --host 127.0.0.1 --port 8765
pause
