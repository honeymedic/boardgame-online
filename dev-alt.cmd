@echo off
REM Second dev server on other ports (server 3002, client 5174) so it can run next to dev.cmd.
set "PATH=C:\Program Files\nodejs;%PATH%"
set PORT=3002
set API_PORT=3002
cd /d "%~dp0"
npx concurrently -n server,client -c blue,green "npm run dev --prefix server" "npm run dev --prefix client -- --port 5174 --strictPort"
