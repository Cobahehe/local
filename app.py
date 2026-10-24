"""
app.py - Server Backend Flask untuk Kasir & Gudang Toko Fisik
Mengikuti prinsip KISS (Keep It Simple, Stupid): Ringan, cepat, 100% offline.
Berjalan pada host '0.0.0.0' dan port 5000 agar dapat diakses dari PC Kasir & Tablet Gudang via LAN.
"""

import socket
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from database import get_db_connection, init_db

app = Flask(__name__, template_folder="templates", static_folder="static")

# Inisialisasi tabel SQLite WAL saat aplikasi dijalankan
init_db()

def get_lan_ip():
    """Mendeteksi alamat IP lokal PC di jaringan Wi-Fi/LAN."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ====================================================================
# TAMPILAN WEB (HTML)
# ====================================================================

@app.route("/")
@app.route("/gudang")
def halaman_gudang():
    """Menampilkan halaman antarmuka Stok & Master Barang Gudang."""
    return render_template("gudang.html")

@app.route("/kasir")
def halaman_kasir():
    """Menampilkan halaman antarmuka Kasir."""
    try:
        return render_template("kasir.html")
    except Exception:
        return """
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>🛒 Halaman Kasir (Penjualan)</h2>
            <p>Modul kasir sedang disiapkan untuk tahap berikutnya.</p>
            <p><a href="/gudang" style="display: inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">⬅️ Ke Halaman Gudang</a></p>
        </div>
        """


# ====================================================================
# 1. ENDPOINT MASTER BARANG (GUDANG & KASIR)
# ====================================================================

@app.route("/api/barang", methods=["GET"])
def get_barang():
    """
    Mengambil daftar barang atau mencari barang berdasarkan kode_barang / nama_barang.
    Contoh: /api/barang atau /api/barang?q=indomie
    """
    q = request.args.get("q", "").strip()
    conn = get_db_connection()
    cursor = conn.cursor()

    if q:
        query = """
        SELECT * FROM barang 
        WHERE kode_barang LIKE ? OR nama_barang LIKE ?
        ORDER BY nama_barang ASC
        """
        cursor.execute(query, (f"%{q}%", f"%{q}%"))
    else:
        cursor.execute("SELECT * FROM barang ORDER BY nama_barang ASC")

    rows = cursor.fetchall()
    conn.close()

    hasil = []
    for r in rows:
        hasil.append({
            "id": r["id"],
            "kode_barang": r["kode_barang"],
            "nama_barang": r["nama_barang"],
            "satuan": r["satuan"],
            "harga_modal": r["harga_modal"],
            "harga_jual": r["harga_jual"],
            "stok": r["stok"]
        })

    return jsonify({"success": True, "total": len(hasil), "data": hasil})


@app.route("/api/barang", methods=["POST"])
def add_barang():
    """
    Menambah master barang baru di Gudang.
    Input JSON: { kode_barang, nama_barang, satuan, harga_modal, harga_jual, stok }
    """
    data = request.json or {}
    kode_barang = str(data.get("kode_barang", "")).strip()
    nama_barang = str(data.get("nama_barang", "")).strip()
    satuan = str(data.get("satuan", "pcs")).strip() or "pcs"
    harga_modal = int(data.get("harga_modal", 0))
    harga_jual = int(data.get("harga_jual", 0))
    stok_awal = int(data.get("stok", 0))

    if not kode_barang or not nama_barang:
        return jsonify({"success": False, "message": "Kode barang dan Nama barang wajib diisi!"}), 400

    if harga_jual < 0 or harga_modal < 0 or stok_awal < 0:
        return jsonify({"success": False, "message": "Harga dan stok tidak boleh bernilai negatif!"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    waktu_sekarang = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        # Insert ke tabel barang
        cursor.execute("""
        INSERT INTO barang (kode_barang, nama_barang, satuan, harga_modal, harga_jual, stok)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (kode_barang, nama_barang, satuan, harga_modal, harga_jual, stok_awal))
        
        barang_id = cursor.lastrowid

        # Jika ada stok awal, otomatis catat ke riwayat_stok (MASUK)
        if stok_awal > 0:
            cursor.execute("""
            INSERT INTO riwayat_stok (barang_id, tipe, jumlah, keterangan, waktu)
            VALUES (?, 'MASUK', ?, 'Stok Awal Pendaftaran Barang', ?)
            """, (barang_id, stok_awal, waktu_sekarang))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True, 
            "message": f"Barang '{nama_barang}' berhasil didaftarkan!",
            "id": barang_id
        }), 201

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"success": False, "message": f"Kode barang '{kode_barang}' sudah ada di database!"}), 400
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


# ====================================================================
# 2. ENDPOINT BARANG MASUK / KULAKAN (LOG GUDANG)
# ====================================================================

@app.route("/api/stok/masuk", methods=["POST"])
def tambah_stok_masuk():
    """
    Mencatat kulakan barang masuk di gudang secara atomik:
    1. Menambah stok di tabel 'barang'.
    2. Mencatat entri tipe 'MASUK' di tabel 'riwayat_stok'.
    
    Input JSON: { barang_id, jumlah, keterangan }
    """
    data = request.json or {}
    barang_id = data.get("barang_id")
    jumlah = int(data.get("jumlah", 0))
    keterangan = str(data.get("keterangan", "-")).strip() or "Kulakan Gudang"

    if not barang_id or jumlah <= 0:
        return jsonify({"success": False, "message": "Pilih barang dan isi jumlah masuk yang valid (> 0)!"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    waktu_sekarang = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        # Cek barang
        cursor.execute("SELECT id, nama_barang, satuan, stok FROM barang WHERE id = ?", (barang_id,))
        barang = cursor.fetchone()
        if not barang:
            conn.close()
            return jsonify({"success": False, "message": "Barang tidak ditemukan!"}), 404

        stok_baru = barang["stok"] + jumlah

        # 1. Tambah stok barang
        cursor.execute("UPDATE barang SET stok = ? WHERE id = ?", (stok_baru, barang_id))

        # 2. Catat ke tabel riwayat_stok (MASUK)
        cursor.execute("""
        INSERT INTO riwayat_stok (barang_id, tipe, jumlah, keterangan, waktu)
        VALUES (?, 'MASUK', ?, ?, ?)
        """, (barang_id, jumlah, keterangan, waktu_sekarang))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Berhasil menambahkan {jumlah} {barang['satuan']} ke stok '{barang['nama_barang']}'.",
            "stok_sebelumnya": barang["stok"],
            "stok_sekarang": stok_baru
        })

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


# ====================================================================
# 3. ENDPOINT TRANSAKSI KASIR (BARANG KELUAR & ATOMIC TRANSACTION)
# ====================================================================

@app.route("/api/transaksi", methods=["POST"])
def proses_transaksi():
    """
    Memproses transaksi penjualan kasir dalam 1 Transaksi Database Atomik (ACID):
    - Validasi ketersediaan stok tiap barang
    - Validasi kecukupan uang tunai
    - Simpan master transaksi (nomor_nota, waktu, total_belanja, uang_tunai, kembalian)
    - Simpan detail item transaksi
    - Potong stok di tabel 'barang'
    - Catat pengeluaran di tabel 'riwayat_stok' (tipe 'KELUAR')
    
    Input JSON:
    {
      "items": [
        { "barang_id": 1, "jumlah": 2 },
        { "barang_id": 3, "jumlah": 1 }
      ],
      "uang_tunai": 50000
    }
    """
    data = request.json or {}
    items_input = data.get("items", [])
    uang_tunai = int(data.get("uang_tunai", 0))

    if not items_input or not isinstance(items_input, list):
        return jsonify({"success": False, "message": "Daftar item belanja tidak boleh kosong!"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        total_belanja = 0
        items_valid = []

        # 1. Tahap Validasi Stok & Perhitungan Total Belanja
        for item in items_input:
            b_id = item.get("barang_id")
            qty = int(item.get("jumlah", 0))

            if qty <= 0:
                conn.close()
                return jsonify({"success": False, "message": "Jumlah barang harus lebih dari 0!"}), 400

            cursor.execute("SELECT id, kode_barang, nama_barang, satuan, harga_jual, stok FROM barang WHERE id = ?", (b_id,))
            barang = cursor.fetchone()

            if not barang:
                conn.close()
                return jsonify({"success": False, "message": f"Barang ID {b_id} tidak ditemukan!"}), 404

            if barang["stok"] < qty:
                conn.close()
                return jsonify({
                    "success": False,
                    "message": f"Stok '{barang['nama_barang']}' tidak cukup! Tersisa: {barang['stok']} {barang['satuan']}, diminta: {qty}."
                }), 400

            subtotal = barang["harga_jual"] * qty
            total_belanja += subtotal

            items_valid.append({
                "barang_id": barang["id"],
                "kode_barang": barang["kode_barang"],
                "nama_barang": barang["nama_barang"],
                "satuan": barang["satuan"],
                "harga_jual": barang["harga_jual"],
                "jumlah": qty,
                "subtotal": subtotal,
                "stok_akhir": barang["stok"] - qty
            })

        # 2. Cek uang tunai
        if uang_tunai < total_belanja:
            conn.close()
            return jsonify({
                "success": False,
                "message": f"Uang tunai kurang! Total belanja: Rp {total_belanja:,}, Diterima: Rp {uang_tunai:,}".replace(",", ".")
            }), 400

        kembalian = uang_tunai - total_belanja
        now = datetime.now()
        waktu_str = now.strftime("%Y-%m-%d %H:%M:%S")

        # 3. Generate Nomor Nota Kasir Unik (Contoh: NOTA-20261024-0001)
        tanggal_prefix = now.strftime("%Y%m%d")
        cursor.execute("SELECT COUNT(*) FROM transaksi WHERE waktu LIKE ?", (f"{now.strftime('%Y-%m-%d')}%",))
        urutan = cursor.fetchone()[0] + 1
        nomor_nota = f"NOTA-{tanggal_prefix}-{urutan:04d}"

        # 4. Simpan ke Tabel Transaksi
        cursor.execute("""
        INSERT INTO transaksi (nomor_nota, waktu, total_belanja, uang_tunai, kembalian)
        VALUES (?, ?, ?, ?, ?)
        """, (nomor_nota, waktu_str, total_belanja, uang_tunai, kembalian))
        
        transaksi_id = cursor.lastrowid

        # 5. Simpan Detail Transaksi, Potong Stok Barang, dan Catat Riwayat Stok KELUAR
        for it in items_valid:
            # Insert detail_transaksi
            cursor.execute("""
            INSERT INTO detail_transaksi (transaksi_id, barang_id, kode_barang, nama_barang, harga_jual, jumlah, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (transaksi_id, it["barang_id"], it["kode_barang"], it["nama_barang"], it["harga_jual"], it["jumlah"], it["subtotal"]))

            # Potong stok di tabel barang
            cursor.execute("""
            UPDATE barang SET stok = ? WHERE id = ?
            """, (it["stok_akhir"], it["barang_id"]))

            # Catat log ke tabel riwayat_stok (KELUAR)
            cursor.execute("""
            INSERT INTO riwayat_stok (barang_id, tipe, jumlah, keterangan, waktu)
            VALUES (?, 'KELUAR', ?, ?, ?)
            """, (it["barang_id"], it["jumlah"], f"Penjualan Kasir ({nomor_nota})", waktu_str))

        # Commit atomik: Semua perubahan di atas tersimpan sekaligus
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Transaksi berhasil diproses!",
            "data": {
                "transaksi_id": transaksi_id,
                "nomor_nota": nomor_nota,
                "waktu": waktu_str,
                "total_belanja": total_belanja,
                "uang_tunai": uang_tunai,
                "kembalian": kembalian,
                "items": items_valid
            }
        }), 201

    except Exception as e:
        conn.rollback() # Batalkan semua jika ada kesalahan
        conn.close()
        return jsonify({"success": False, "message": f"Transaksi gagal: {str(e)}"}), 500


# ====================================================================
# 4. ENDPOINT RIWAYAT & INFORMASI LAN
# ====================================================================

@app.route("/api/riwayat-stok", methods=["GET"])
def get_riwayat_stok():
    """Mengambil 50 log riwayat mutasi stok gudang terakhir (MASUK / KELUAR)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.id, r.barang_id, b.kode_barang, b.nama_barang, b.satuan, r.tipe, r.jumlah, r.keterangan, r.waktu
    FROM riwayat_stok r
    JOIN barang b ON r.barang_id = b.id
    ORDER BY r.id DESC
    LIMIT 50
    """)
    rows = cursor.fetchall()
    conn.close()

    hasil = []
    for r in rows:
        hasil.append({
            "id": r["id"],
            "barang_id": r["barang_id"],
            "kode_barang": r["kode_barang"],
            "nama_barang": r["nama_barang"],
            "satuan": r["satuan"],
            "tipe": r["tipe"],
            "jumlah": r["jumlah"],
            "keterangan": r["keterangan"],
            "waktu": r["waktu"]
        })
    return jsonify({"success": True, "data": hasil})


@app.route("/api/transaksi", methods=["GET"])
def get_transaksi():
    """Mengambil 30 riwayat transaksi kasir terakhir."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transaksi ORDER BY id DESC LIMIT 30")
    rows = cursor.fetchall()
    conn.close()

    hasil = []
    for r in rows:
        hasil.append({
            "id": r["id"],
            "nomor_nota": r["nomor_nota"],
            "waktu": r["waktu"],
            "total_belanja": r["total_belanja"],
            "uang_tunai": r["uang_tunai"],
            "kembalian": r["kembalian"]
        })
    return jsonify({"success": True, "data": hasil})


@app.route("/api/info-lan", methods=["GET"])
def info_lan():
    """Memberikan informasi alamat akses jaringan untuk perangkat PC dan Tablet."""
    lan_ip = get_lan_ip()
    return jsonify({
        "pc_kasir_url": "http://localhost:5000",
        "tablet_gudang_url": f"http://{lan_ip}:5000",
        "lan_ip": lan_ip,
        "port": 5000
    })


if __name__ == "__main__":
    ip_lokal = get_lan_ip()
    print("=" * 65)
    print("  BACKEND & DATABASE SQLITE WAL BERHASIL DIJALANKAN (KISS)")
    print("=" * 65)
    print(f"  [PC Kasir (Localhost)]   : http://localhost:5000")
    print(f"  [Tablet Gudang (Wi-Fi)]  : http://{ip_lokal}:5000")
    print("=" * 65)
    print("  Host: 0.0.0.0 | Port: 5000 | Concurrency: SQLite WAL Mode")
    print("=" * 65)
    app.run(host="0.0.0.0", port=5000, threaded=True, debug=False)
