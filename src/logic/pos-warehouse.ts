/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Logika Bisnis Murni (Pure Logic) - POS & Stok Gudang
 * Mengikuti prinsip KISS (Keep It Simple, Stupid) untuk operasional toko fisik.
 */

export interface Barang {
  id: string;
  kode: string; // Barcode / SKU
  nama: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMin: number;
  updatedAt: string;
}

export interface BarangMasuk {
  id: string;
  barangId: string;
  kodeBarang: string;
  namaBarang: string;
  qty: number;
  hargaBeliSatuan: number;
  supplier: string;
  catatan: string;
  tanggal: string;
}

export interface CartItem {
  barangId: string;
  kode: string;
  nama: string;
  satuan: string;
  harga: number;
  qty: number;
  stokTersedia: number;
  subtotal: number;
}

export interface Transaksi {
  id: string;
  noNota: string;
  tanggal: string;
  items: CartItem[];
  totalItem: number;
  totalQty: number;
  total: number;
  bayar: number;
  kembalian: number;
}

/**
 * Format angka ke mata uang Rupiah Indonesia (contoh: Rp 15.000)
 */
export function formatRupiah(nominal: number): string {
  const safeNominal = Math.round(nominal || 0);
  return 'Rp ' + safeNominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Hitung subtotal untuk sebuah item belanja
 */
export function hitungSubtotal(harga: number, qty: number): number {
  if (harga < 0 || qty < 0) return 0;
  return Math.round(harga * qty);
}

/**
 * Hitung total tagihan dari daftar item
 */
export function hitungTotalBelanja(items: Array<{ harga: number; qty: number }>): number {
  return items.reduce((sum, item) => sum + hitungSubtotal(item.harga, item.qty), 0);
}

/**
 * Hitung total kuantitas (pcs) dari daftar item
 */
export function hitungTotalQty(items: Array<{ qty: number }>): number {
  return items.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
}

/**
 * Hitung kembalian dan cek kecukupan uang bayar tunai
 */
export function hitungKembalian(total: number, bayar: number): {
  kembalian: number;
  isCukup: boolean;
  selisihKurang: number;
} {
  const t = Math.max(0, Math.round(total));
  const b = Math.max(0, Math.round(bayar));
  const selisih = b - t;

  if (selisih >= 0) {
    return {
      kembalian: selisih,
      isCukup: true,
      selisihKurang: 0,
    };
  } else {
    return {
      kembalian: 0,
      isCukup: false,
      selisihKurang: Math.abs(selisih),
    };
  }
}

/**
 * Kurangi stok barang saat terjadi penjualan
 */
export function kurangiStok(
  stokSekarang: number,
  qtyKeluar: number
): {
  stokBaru: number;
  isValid: boolean;
  error?: string;
} {
  if (qtyKeluar <= 0) {
    return {
      stokBaru: stokSekarang,
      isValid: false,
      error: 'Jumlah penjualan harus lebih dari 0',
    };
  }
  if (stokSekarang < qtyKeluar) {
    return {
      stokBaru: stokSekarang,
      isValid: false,
      error: `Stok tidak mencukupi (sisa ${stokSekarang}, diminta ${qtyKeluar})`,
    };
  }
  return {
    stokBaru: stokSekarang - qtyKeluar,
    isValid: true,
  };
}

/**
 * Tambah stok barang saat barang masuk (restock dari supplier/gudang)
 */
export function tambahStok(
  stokSekarang: number,
  qtyMasuk: number
): {
  stokBaru: number;
  isValid: boolean;
  error?: string;
} {
  if (qtyMasuk <= 0) {
    return {
      stokBaru: stokSekarang,
      isValid: false,
      error: 'Jumlah barang masuk harus lebih dari 0',
    };
  }
  return {
    stokBaru: stokSekarang + qtyMasuk,
    isValid: true,
  };
}

/**
 * Validasi form master barang
 */
export function validasiBarang(data: {
  kode?: string;
  nama?: string;
  satuan?: string;
  hargaBeli?: number;
  hargaJual?: number;
  stokMin?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.kode || data.kode.trim() === '') {
    errors.push('Kode barcode / SKU barang wajib diisi');
  }
  if (!data.nama || data.nama.trim() === '') {
    errors.push('Nama barang wajib diisi');
  }
  if (data.hargaBeli === undefined || data.hargaBeli < 0) {
    errors.push('Harga beli tidak boleh bernilai negatif');
  }
  if (data.hargaJual === undefined || data.hargaJual < 0) {
    errors.push('Harga jual tidak boleh bernilai negatif');
  }
  if (data.hargaJual !== undefined && data.hargaBeli !== undefined && data.hargaJual < data.hargaBeli) {
    // Peringatan wajar toko fisik (bukan error blokir mutlak, namun dicatat)
  }
  if (data.stokMin !== undefined && data.stokMin < 0) {
    errors.push('Stok minimum tidak boleh negatif');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate nomor nota kasir ringkas (contoh: TR-20261024-001)
 */
export function generateNoNota(sequence: number, dateObj: Date = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `TR-${year}${month}${day}-${seq}`;
}

/**
 * Buat format teks nota thermal sederhana (standar printer kasir 58mm / 32 kolom karakter)
 */
export function formatThermalNota(
  transaksi: Transaksi,
  namaToko: string = 'TOKO KELONTONG BERKAH',
  alamatToko: string = 'Jl. Raya Pasar No. 12 - LAN Local'
): string {
  const line = '--------------------------------';
  const lines: string[] = [];

  lines.push(namaToko.center(32));
  lines.push(alamatToko.center(32));
  lines.push(line);
  lines.push(`No: ${transaksi.noNota}`);
  lines.push(`Tgl: ${transaksi.tanggal}`);
  lines.push(line);

  for (const item of transaksi.items) {
    // Baris 1: Nama barang
    lines.push(item.nama.substring(0, 32));
    // Baris 2: Qty x Harga = Subtotal
    const qtyHarga = `${item.qty} ${item.satuan} x ${item.harga.toLocaleString('id-ID')}`;
    const sub = item.subtotal.toLocaleString('id-ID');
    const spaceCount = Math.max(1, 32 - qtyHarga.length - sub.length);
    lines.push(qtyHarga + ' '.repeat(spaceCount) + sub);
  }

  lines.push(line);
  // Total
  const totalLabel = `TOTAL (${transaksi.totalQty} item):`;
  const totalVal = formatRupiah(transaksi.total);
  lines.push(totalLabel + ' '.repeat(Math.max(1, 32 - totalLabel.length - totalVal.length)) + totalVal);

  // Tunai
  const bayarLabel = 'TUNAI:';
  const bayarVal = formatRupiah(transaksi.bayar);
  lines.push(bayarLabel + ' '.repeat(Math.max(1, 32 - bayarLabel.length - bayarVal.length)) + bayarVal);

  // Kembali
  const kembaliLabel = 'KEMBALI:';
  const kembaliVal = formatRupiah(transaksi.kembalian);
  lines.push(kembaliLabel + ' '.repeat(Math.max(1, 32 - kembaliLabel.length - kembaliVal.length)) + kembaliVal);

  lines.push(line);
  lines.push('TERIMA KASIH ATAS KUNJUNGAN ANDA'.center(32));
  lines.push('BARANG DIBELI TDK DPT DITUKAR'.center(32));
  lines.push('\n\n');

  return lines.join('\n');
}

// Helper center alignment untuk format thermal
declare global {
  interface String {
    center(width: number): string;
  }
}

if (!String.prototype.center) {
  String.prototype.center = function (width: number): string {
    const str = this.toString().trim();
    if (str.length >= width) return str.substring(0, width);
    const diff = width - str.length;
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  };
}
