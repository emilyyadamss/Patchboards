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

echo   Python not found. Install from https://python.org or ensure
echo   Anaconda is added to your PATH.
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
