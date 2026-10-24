# PANDUAN DEPLOY LOCALHOST (OFFLINE 100%) - WINDOWS 10 / 11

Aplikasi ini dibangun dengan prinsip **KISS (Keep It Simple, Stupid)** untuk toko fisik & gudang lokal.
Berjalan sepenuhnya tanpa internet, menggunakan **Python 3 + Flask + SQLite WAL Mode**.

---

## 🚀 CARA MENJALANKAN (1 KLIK DI WINDOWS)

1. Pastikan PC Windows Anda sudah terpasang **Python 3** (Download gratis di [python.org](https://www.python.org/downloads/)).
   > ⚠️ **PENTING:** Saat install Python, pastikan mencentang kotak **"Add python.exe to PATH"**.
2. Buka folder aplikasi ini di PC Windows.
3. Cukup **Klik Dua Kali (Double-Click)** file:
   ```cmd
   run_app.bat
   ```
4. Jendela terminal hitam akan otomatis:
   - Memeriksa paket Flask
   - Mengaktifkan database SQLite `toko_gudang.db` dalam mode **WAL (Write-Ahead Logging)**
   - Mendeteksi alamat IP Wi-Fi lokal
   - Membuka browser default PC Kasir ke: `http://localhost:5000`

---

## 📱 CARA MENGHUBUNGKAN TABLET / HP DI GUDANG (VIA WI-FI)

1. Hubungkan Tablet/HP Gudang ke **jaringan Wi-Fi yang sama** dengan PC Kasir.
2. Lihat alamat IP yang tertulis di jendela hitam `run_app.bat` (atau badge atas aplikasi).
   Contoh:
   ```
   http://192.168.1.15:5000
   ```
3. Buka browser Chrome / Edge / Safari di Tablet/HP dan ketikkan alamat tersebut.
4. Klik tombol **"📱 Mode Tablet"** di pojok kanan atas agar tombol berukuran besar dan nyaman ditekan layar sentuh.

---

## 🔒 KEAMANAN DATA: SQLITE WAL (WRITE-AHEAD LOGGING)

Database menggunakan konfigurasi:
```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
PRAGMA synchronous=NORMAL;
```
**Mengapa WAL?**
Mode WAL memungkinkan **baca dan tulis berjalan bersamaan** tanpa bentrok ("database is locked"), sehingga saat Kasir sedang input transaksi penjualan di PC, petugas gudang dapat bersamaan menambah stok dari HP tanpa hambatan.

---

## ⌨️ SHORTCUT KEYBOARD KASIR CEPAT (PC WINDOWS)

- **Ketik Barcode / Nama lalu tekan [ENTER]**: Otomatis masuk ke keranjang belanja.
- **[F2]**: Langsung proses Bayar & Buka Struk Nota.
- **[ESC]**: Menutup jendela modal / popup struk.
- **Tombol Cepat Uang Tunai**: Uang Pas, +10rb, +20rb, +50rb, +100rb.

---

## 🖨️ CETAK STRUK NOTA THERMAL

Struk didesain standar format printer kasir thermal **58mm / 80mm (32 karakter per baris)**.
Mendukung semua printer thermal USB, Bluetooth, maupun print dialog standar Windows (`Ctrl + P`).
