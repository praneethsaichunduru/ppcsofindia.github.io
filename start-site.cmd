@echo off
rem Starts the site on this computer. Leave this window open while you look at it; close it to stop.
rem Then open  http://localhost:5173  (in VS Code: Ctrl+Shift+P, "Simple Browser: Show", paste the address).

rem Node.js was set up here by Claude; if you install Node.js yourself, this line is harmless.
set "PATH=C:\Users\DELL\tools\node;%PATH%"
cd /d "%~dp0"

if not exist node_modules (
  echo Installing the site's packages (first time only)...
  call npm install
)

echo.
echo Starting the site at http://localhost:5173 ...
call npm run dev
