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

start "PatchBoards Server" %PYTHON% "%SCRIPT_DIR%server\server.py"
timeout /t 1 /nobreak >nul
start "" "http://localhost:4242"

echo   Dashboard opened at http://localhost:4242
echo   Close the "PatchBoards Server" window to stop the server.
echo.
pause
