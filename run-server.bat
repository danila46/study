@echo off
setlocal

cd /d "%~dp0"
set "PORT=4173"
set "PY_CMD="

where py >nul 2>&1
if %errorlevel%==0 (
  set "PY_CMD=py"
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    set "PY_CMD=python"
  )
)

echo [BRS Dashboard] Project dir: %cd%
echo [BRS Dashboard] URL: http://localhost:%PORT%
echo.

if not "%PY_CMD%"=="" (
  echo [BRS Dashboard] Starting with Python (%PY_CMD%)...
  echo To stop server press Ctrl+C in this window.
  echo.
  %PY_CMD% -m http.server %PORT%
  goto :eof
)

echo [BRS Dashboard] Python not found. Fallback to PowerShell static server...
where powershell >nul 2>&1
if %errorlevel% neq 0 (
  echo [BRS Dashboard] Neither Python nor PowerShell are available in PATH.
  echo Install Python 3 or run this project on another machine.
  pause
  exit /b 1
)

echo [BRS Dashboard] Starting with PowerShell script run-server.ps1...
echo To stop server press Ctrl+C in this window.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-server.ps1" -Port %PORT% -Root "%~dp0"

endlocal
