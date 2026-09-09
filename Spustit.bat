@echo off
cd /d "%~dp0"

if exist "dist-runtime\Přístav — Poslední linie.exe" (
  start "" "dist-runtime\Přístav — Poslední linie.exe"
  exit /b 0
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8765/"
  python -m http.server 8765
  exit /b 0
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:8765/"
  py -m http.server 8765
  exit /b 0
)

if exist "index.html" (
  start "" "%~dp0index.html"
  exit /b 0
)

echo Hru se nepodarilo spustit. Soubor index.html v teto slozce chybi.
pause
