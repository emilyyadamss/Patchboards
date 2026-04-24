@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

echo.
echo   Starting PatchBoards...
echo.

:: Check standard PATH first
where python >nul 2>&1
if %errorlevel% == 0 (
  set PYTHON=python
  goto :run
)

where python3 >nul 2>&1
if %errorlevel% == 0 (
  set PYTHON=python3
  goto :run
)

:: Fall back to common Anaconda locations
for %%P in (
  "%USERPROFILE%\.conda\python.exe"
  "%USERPROFILE%\.conda\envs\base\python.exe"
  "%USERPROFILE%\anaconda3\python.exe"
  "%USERPROFILE%\Anaconda3\python.exe"
  "%LOCALAPPDATA%\anaconda3\python.exe"
  "%LOCALAPPDATA%\Anaconda3\python.exe"
  "C:\ProgramData\anaconda3\python.exe"
  "C:\ProgramData\Anaconda3\python.exe"
  "C:\anaconda3\python.exe"
  "C:\Anaconda3\python.exe"
) do (
  if exist %%P (
    set PYTHON=%%P
    goto :run
  )
)

:: Try conda run as a last resort
where conda >nul 2>&1
if %errorlevel% == 0 (
  echo   Using conda run...
  echo   Server starting at http://localhost:4242
  echo   Press Ctrl+C to stop.
  echo.
  start "" "http://localhost:4242"
  conda run python "%SCRIPT_DIR%server\server.py"
  echo.
  echo   Server stopped.
  pause
  exit /b 0
)

echo   Python not found. Open Anaconda Prompt and run:
echo     python server\server.py
echo   Then open http://localhost:4242 in your browser.
pause
exit /b 1

:run
echo   Using Python: %PYTHON%
echo   Server starting at http://localhost:4242
echo   Press Ctrl+C to stop.
echo.

start "" "http://localhost:4242"
%PYTHON% "%SCRIPT_DIR%server\server.py"

echo.
echo   Server stopped.
pause
