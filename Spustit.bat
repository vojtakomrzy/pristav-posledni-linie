@echo off
cd /d "%~dp0"

if exist "dist-runtime\Přístav — Poslední linie.exe" (
  start "" "dist-runtime\Přístav — Poslední linie.exe"
  exit /b 0
)

if exist "index.html" (
  start "" "%~dp0index.html"
  exit /b 0
)

echo Hru se nepodarilo spustit. Soubor index.html v teto slozce chybi.
pause
