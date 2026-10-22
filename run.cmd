@echo off
rem Starts the local development web server for the Generator and Player.
rem Usage: run.cmd [port]   (default 8080). Extra serve.mjs options may follow the port.
rem Set NO_BROWSER=1 to skip opening the browser.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required: https://nodejs.org/
  exit /b 1
)

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"
if not "%~1"=="" shift

echo Serving %CD% at http://localhost:%PORT%/pentomino/  (Ctrl+C to stop)
if not defined NO_BROWSER start "" "http://localhost:%PORT%/pentomino/"
node tools\serve.mjs --port %PORT% --prefix /pentomino/ %1 %2 %3 %4 %5 %6
endlocal