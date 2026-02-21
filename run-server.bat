@echo off
setlocal

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

if "%PY_CMD%"=="" (
  echo [BRS Dashboard] Python not found in PATH.
  echo Install Python 3 from https://www.python.org/downloads/
  pause
  exit /b 1
)

echo [BRS Dashboard] Starting local server on port %PORT% using %PY_CMD%...
echo Open in browser: http://localhost:%PORT%
echo To stop server press Ctrl+C in this window.
echo.

%PY_CMD% -m http.server %PORT%

endlocal
