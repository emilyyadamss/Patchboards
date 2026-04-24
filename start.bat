@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

echo.
echo   Starting PatchBoards...
echo.

where python >nul 2>&1
if %errorlevel% == 0 (
  set PYTHON=python
) else (
  where python3 >nul 2>&1
  if %errorlevel% == 0 (
    set PYTHON=python3
  ) else (
    echo   Python 3 is required. Install from https://python.org
    pause
    exit /b 1
  )
)

echo   Server starting at http://localhost:4242
echo   Press Ctrl+C to stop.
echo.

start "" "http://localhost:4242"
%PYTHON% "%SCRIPT_DIR%server\server.py"

echo.
echo   Server stopped.
pause
