@echo off
title POS ^& Gudang Lokal (KISS Server)
color 0A
cls

echo =====================================================================
echo       SISTEM KASIR ^& STOK GUDANG LOKAL (OFFLINE 100%%)
echo                 Prinsip KISS - Keep It Simple, Stupid
echo =====================================================================
echo.

:: 1. Cek ketersediaan Python di Windows
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak terdeteksi di PC ini!
    echo Silakan install Python 3 dari https://www.python.org/downloads/
    echo PENTING: Centang opsi "Add python.exe to PATH" saat menginstall.
    echo.
    pause
    exit /b
)

:: 2. Cek library Flask
echo [*] Memeriksa paket Flask...
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Menginstall Flask secara otomatis...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstall Flask. Pastikan ada koneksi internet saat instalasi pertama kali.
        pause
        exit /b
    )
)

:: 3. Inisialisasi Database SQLite WAL
echo [*] Memeriksa database toko_gudang.db (SQLite WAL Mode)...
python -c "import database; database.init_db()"

:: 4. Deteksi Alamat IP Lokal PC untuk Tablet Gudang
echo.
echo =====================================================================
echo ALAMAT AKSES SISTEM TOKO ^& GUDANG:
echo.
echo  [1] PC KASIR (Lokal Windows):
echo      http://localhost:5000
echo.
echo  [2] TABLET / HP GUDANG (Via Wi-Fi Toko):
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0"') do (
    echo      http://%%a:5000
)
echo.
echo  (Pastikan HP/Tablet dan PC Kasir terhubung ke Wi-Fi / Router yang SAMA)
echo =====================================================================
echo.
echo [*] Membuka browser PC Kasir...
start http://localhost:5000

echo [*] Menjalankan Server Flask di port 5000 (0.0.0.0)...
echo     (JANGAN TUTUP JENDELA HITAM INI SELAMA TOKO BEROPERASI)
echo.

python app.py
pause
