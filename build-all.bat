@echo off
node scripts/build-tauri-all.mjs %*
exit /b %ERRORLEVEL%
