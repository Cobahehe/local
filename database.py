"""
database.py - Database SQLite dengan mode WAL (Write-Ahead Logging)
Mengikuti prinsip KISS: Sederhana, aman diakses bersamaan oleh PC Kasir dan HP/Tablet Gudang.
"""

import sqlite3
import os
from datetime import datetime

DB_NAME = "toko_gudang.db"

def get_db_connection():
    """
    Membuka koneksi database dengan PRAGMA WAL dan timeout agar aman
    dari error 'database is locked' saat PC Kasir dan Tablet Gudang bertransaksi bersamaan.
    """
    conn = sqlite3.connect(DB_NAME, timeout=10.0)
    conn.row_factory = sqlite3.Row
    
    # Konfigurasi Mutlak WAL untuk Concurrency LAN
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    
    return conn

def init_db():
    """
    Membuat tabel-tabel utama jika belum ada (CREATE TABLE IF NOT EXISTS):
    1. barang (Master Barang Gudang)
    2. riwayat_stok (Log Keluar/Masuk Gudang)
    3. transaksi (Transaksi Kasir / Nota)
    4. detail_transaksi (Rincian Item Penjualan)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tabel Barang (Gudang & Master Data)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS barang (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kode_barang TEXT UNIQUE NOT NULL,
        nama_barang TEXT NOT NULL,
        satuan TEXT NOT NULL DEFAULT 'pcs',
        harga_modal INTEGER NOT NULL DEFAULT 0,
        harga_jual INTEGER NOT NULL DEFAULT 0,
        stok INTEGER NOT NULL DEFAULT 0
    );
    """)

    # 2. Tabel Riwayat Stok (Log Keluar / Masuk Gudang)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS riwayat_stok (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barang_id INTEGER NOT NULL,
        tipe TEXT NOT NULL CHECK(tipe IN ('MASUK', 'KELUAR')),
        jumlah INTEGER NOT NULL,
        keterangan TEXT DEFAULT '-',
        waktu TEXT NOT NULL,
        FOREIGN KEY (barang_id) REFERENCES barang (id)
    );
    """)

    # 3. Tabel Transaksi (Kasir)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transaksi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomor_nota TEXT UNIQUE NOT NULL,
        waktu TEXT NOT NULL,
        total_belanja INTEGER NOT NULL,
        uang_tunai INTEGER NOT NULL,
        kembalian INTEGER NOT NULL
    );
    """)

    # 4. Tabel Detail Transaksi (Kasir)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detail_transaksi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaksi_id INTEGER NOT NULL,
        barang_id INTEGER NOT NULL,
        kode_barang TEXT NOT NULL,
        nama_barang TEXT NOT NULL,
        harga_jual INTEGER NOT NULL,
        jumlah INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        FOREIGN KEY (transaksi_id) REFERENCES transaksi (id),
        FOREIGN KEY (barang_id) REFERENCES barang (id)
    );
    """)

    # Indexing untuk kecepatan pencarian barcode dan nama barang di kasir
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_barang_kode ON barang(kode_barang);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_barang_nama ON barang(nama_barang);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_riwayat_barang ON riwayat_stok(barang_id);")

    # Data awal contoh jika database baru pertama kali dibuat
    cursor.execute("SELECT COUNT(*) FROM barang;")
    if cursor.fetchone()[0] == 0:
        waktu_sekarang = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data_awal = [
            ('8998866200225', 'Indomie Goreng Original 85g', 'pcs', 2900, 3500, 100),
            ('8999999014314', 'Minyak Goreng Bimoli 1 Liter', 'pcs', 16500, 19000, 30),
            ('8996001301114', 'Beras Ramos Super 5 Kg', 'sak', 64000, 72000, 20),
            ('8998899101234', 'Gula Pasir Gulaku Putih 1 Kg', 'kg', 15000, 17500, 25),
            ('8991389221102', 'Aqua Air Mineral 600ml', 'dus', 42000, 48000, 15),
        ]
        cursor.executemany("""
        INSERT INTO barang (kode_barang, nama_barang, satuan, harga_modal, harga_jual, stok)
        VALUES (?, ?, ?, ?, ?, ?);
        """, data_awal)

        # Catat log awal sebagai riwayat stok MASUK
        for b_id in range(1, len(data_awal) + 1):
            qty = data_awal[b_id - 1][5]
            cursor.execute("""
            INSERT INTO riwayat_stok (barang_id, tipe, jumlah, keterangan, waktu)
            VALUES (?, 'MASUK', ?, 'Stok Awal Toko', ?);
            """, (b_id, qty, waktu_sekarang))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"[*] Database '{DB_NAME}' dengan mode WAL berhasil diinisialisasi.")
