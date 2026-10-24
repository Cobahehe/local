@echo off
title SISTEM KASIR & GUDANG LOKAL (ERP KISS)
color 0A
cls

echo ========================================================================
echo       SISTEM KASIR & GUDANG TOKO FISIK (OFFLINE 100%%)
echo                Prinsip KISS - Keep It Simple, Stupid
echo ========================================================================
echo.

:: 1. Verifikasi ketersediaan Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3 tidak ditemukan di komputer ini!
    echo Silakan unduh dan install Python dari: https://www.python.org/downloads/
    echo PENTING: Centang kotak "Add python.exe to PATH" saat proses instalasi.
    echo.
    pause
    exit /b
)

:: 2. Verifikasi dan instalasi otomatis library Flask jika belum ada
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Menginstall pustaka Flask (hanya perlu sekali di awal)...
    pip install flask
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstall Flask. Pastikan ada koneksi internet saat instalasi awal.
        pause
        exit /b
    )
)

:: 3. Inisialisasi Database SQLite WAL
python -c "import database; database.init_db()" >nul 2>&1

:: 4. Deteksi otomatis IP Address lokal untuk Tablet Gudang
for /f "tokens=*" %%i in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1).IPAddress"') do set LOCAL_IP=%%i

if "%LOCAL_IP%"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
        if not defined LOCAL_IP set LOCAL_IP=%%a
    )
)
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo ========================================================================
echo   ALAMAT AKSES SISTEM TOKO (SIAP DIGUNAKAN):
echo ========================================================================
echo.
echo   [1] PC KASIR (Komputer Ini):
echo       http://localhost:5000/kasir
echo.
echo   [2] TABLET / HP GUDANG (Buka lewat Wi-Fi Toko):
if "%LOCAL_IP%"=="" (
    echo       http://[IP_KOMPUTER]:5000/gudang
) else (
    echo       http://%LOCAL_IP%:5000/gudang
)
echo.
echo   Catatan: Pastikan Tablet/HP terhubung ke Wi-Fi yang sama dengan PC ini.
echo ========================================================================
echo.
echo [*] Membuka Halaman Kasir di browser secara otomatis...
start http://localhost:5000/kasir

echo [*] Server lokal sedang berjalan di port 5000 (SQLite WAL Aktif)...
echo [*] JANGAN TUTUP JENDELA HITAM INI SELAMA JAM OPERASIONAL TOKO.
echo.

python app.py
pause
