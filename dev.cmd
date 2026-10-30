@echo off
REM Run dev servers (Node server on 3001 + Vite client on 5173).
set "PATH=C:\Program Files\nodejs;%PATH%"
set PORT=3001
cd /d "%~dp0"
npm run dev
