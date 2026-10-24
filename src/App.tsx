/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * POS & Stok Gudang Lokal (Prinsip KISS)
 * Sistem Kasir & Gudang Offline-First untuk PC Windows & Tablet Wi-Fi Lokal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Package,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  ArrowDownToLine,
  Check,
  AlertTriangle,
  Monitor,
  Tablet,
  X,
  Store,
  RotateCcw,
  Receipt,
  FileText,
  Copy,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

import {
  Barang,
  BarangMasuk,
  CartItem,
  Transaksi,
  formatRupiah,
  hitungSubtotal,
  hitungTotalBelanja,
  hitungTotalQty,
  hitungKembalian,
  kurangiStok,
  tambahStok,
  validasiBarang,
  generateNoNota,
  formatThermalNota,
} from './logic/pos-warehouse.ts';

// Data bawaan awal toko fisik (realistis)
const DEFAULT_BARANG: Barang[] = [
  {
    id: '1',
    kode: '8998866200225',
    nama: 'Indomie Goreng Original 85g',
    kategori: 'Makanan',
    satuan: 'bks',
    hargaBeli: 2900,
    hargaJual: 3500,
    stok: 120,
    stokMin: 20,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '2',
    kode: '8998866200119',
    nama: 'Indomie Kuah Ayam Bawang 69g',
    kategori: 'Makanan',
    satuan: 'bks',
    hargaBeli: 2800,
    hargaJual: 3300,
    stok: 85,
    stokMin: 20,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '3',
    kode: '8999999014314',
    nama: 'Minyak Goreng Bimoli 1 Liter',
    kategori: 'Sembako',
    satuan: 'btl',
    hargaBeli: 16500,
    hargaJual: 19000,
    stok: 35,
    stokMin: 10,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '4',
    kode: '8996001301114',
    nama: 'Beras Ramos Super 5 Kg',
    kategori: 'Sembako',
    satuan: 'karung',
    hargaBeli: 64000,
    hargaJual: 72000,
    stok: 18,
    stokMin: 5,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '5',
    kode: '8998899101234',
    nama: 'Gula Pasir Gulaku Putih 1 Kg',
    kategori: 'Sembako',
    satuan: 'kg',
    hargaBeli: 15000,
    hargaJual: 17500,
    stok: 28,
    stokMin: 10,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '6',
    kode: '8992753211112',
    nama: 'Telur Ayam Negeri',
    kategori: 'Sembako',
    satuan: 'kg',
    hargaBeli: 24000,
    hargaJual: 28000,
    stok: 14,
    stokMin: 5,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '7',
    kode: '8991389221102',
    nama: 'Aqua Air Mineral 600ml',
    kategori: 'Minuman',
    satuan: 'btl',
    hargaBeli: 2800,
    hargaJual: 4000,
    stok: 60,
    stokMin: 15,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '8',
    kode: '8992761132104',
    nama: 'Teh Botol Sosro Kotak 250ml',
    kategori: 'Minuman',
    satuan: 'kotak',
    hargaBeli: 3200,
    hargaJual: 4500,
    stok: 40,
    stokMin: 10,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '9',
    kode: '8999999512345',
    nama: 'Sabun Lifebuoy Total 10 85g',
    kategori: 'Kebersihan',
    satuan: 'pcs',
    hargaBeli: 3500,
    hargaJual: 4500,
    stok: 25,
    stokMin: 8,
    updatedAt: '2026-10-24 08:00:00',
  },
  {
    id: '10',
    kode: '8991001101235',
    nama: 'Pasta Gigi Pepsodent 120g',
    kategori: 'Kebersihan',
    satuan: 'pcs',
    hargaBeli: 7500,
    hargaJual: 9500,
    stok: 4, // Menipis
    stokMin: 5,
    updatedAt: '2026-10-24 08:00:00',
  },
];

const DEFAULT_BARANG_MASUK: BarangMasuk[] = [
  {
    id: 'bm-1',
    barangId: '1',
    kodeBarang: '8998866200225',
    namaBarang: 'Indomie Goreng Original 85g',
    qty: 40,
    hargaBeliSatuan: 2900,
    supplier: 'Grosir Sumber Makmur',
    catatan: 'Restock mingguan dus ke-3',
    tanggal: '2026-10-24 09:15',
  },
  {
    id: 'bm-2',
    barangId: '4',
    kodeBarang: '8996001301114',
    namaBarang: 'Beras Ramos Super 5 Kg',
    qty: 10,
    hargaBeliSatuan: 64000,
    supplier: 'Agen Beras Cipinang',
    catatan: 'Faktur No. BRS-9921',
    tanggal: '2026-10-24 10:30',
  },
];

export default function App() {
  // 1. State Master & Keranjang
  const [barangList, setBarangList] = useState<Barang[]>(() => {
    try {
      const saved = localStorage.getItem('kiss_pos_barang');
      return saved ? JSON.parse(saved) : DEFAULT_BARANG;
    } catch {
      return DEFAULT_BARANG;
    }
  });

  const [barangMasukList, setBarangMasukList] = useState<BarangMasuk[]>(() => {
    try {
      const saved = localStorage.getItem('kiss_pos_barang_masuk');
      return saved ? JSON.parse(saved) : DEFAULT_BARANG_MASUK;
    } catch {
      return DEFAULT_BARANG_MASUK;
    }
  });

  const [riwayatTransaksi, setRiwayatTransaksi] = useState<Transaksi[]>(() => {
    try {
      const saved = localStorage.getItem('kiss_pos_penjualan');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Mode & Navigasi
  const [activeTab, setActiveTab] = useState<'kasir' | 'gudang' | 'windows'>('kasir');
  const [gudangSubTab, setGudangSubTab] = useState<'master' | 'masuk'>('master');
  const [isTabletMode, setIsTabletMode] = useState<boolean>(false);

  // Keranjang Kasir
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanQuery, setScanQuery] = useState<string>('');
  const [uangBayar, setUangBayar] = useState<number | ''>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal State
  const [modalBarangOpen, setModalBarangOpen] = useState<boolean>(false);
  const [editingBarang, setEditingBarang] = useState<Barang | null>(null);
  const [formBarangData, setFormBarangData] = useState<{
    kode: string;
    nama: string;
    kategori: string;
    satuan: string;
    hargaBeli: number;
    hargaJual: number;
    stok: number;
    stokMin: number;
  }>({
    kode: '',
    nama: '',
    kategori: 'Umum',
    satuan: 'pcs',
    hargaBeli: 0,
    hargaJual: 0,
    stok: 0,
    stokMin: 5,
  });

  // Form Barang Masuk State
  const [formMasuk, setFormMasuk] = useState<{
    barangId: string;
    qty: number;
    hargaBeli: number;
    supplier: string;
    catatan: string;
  }>({
    barangId: '',
    qty: 1,
    hargaBeli: 0,
    supplier: '',
    catatan: '',
  });

  // Struk Modal
  const [activeReceipt, setActiveReceipt] = useState<Transaksi | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Search & Filter Gudang
  const [gudangSearch, setGudangSearch] = useState<string>('');
  const [gudangKategoriFilter, setGudangKategoriFilter] = useState<string>('Semua');

  // Input ref untuk autofocus scanner barcode
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Simpan ke localStorage saat ada perubahan
  useEffect(() => {
    localStorage.setItem('kiss_pos_barang', JSON.stringify(barangList));
  }, [barangList]);

  useEffect(() => {
    localStorage.setItem('kiss_pos_barang_masuk', JSON.stringify(barangMasukList));
  }, [barangMasukList]);

  useEffect(() => {
    localStorage.setItem('kiss_pos_penjualan', JSON.stringify(riwayatTransaksi));
  }, [riwayatTransaksi]);

  // Keyboard Shortcuts (Enter, F2, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleProsesPenjualan();
      } else if (e.key === 'Escape') {
        setModalBarangOpen(false);
        setActiveReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Autofocus scan input saat pindah ke tab Kasir
  useEffect(() => {
    if (activeTab === 'kasir') {
      scanInputRef.current?.focus();
    }
  }, [activeTab]);

  // Tampilkan notifikasi feedback singkat
  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Beep Audio
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio tidak diizinkan atau diabaikan
    }
  };

  // ========================================================
  // LOGIKA KASIR (PENJUALAN)
  // ========================================================

  const handleAddToCart = (barang: Barang, qtyToAdd: number = 1) => {
    if (barang.stok <= 0) {
      showFeedback(`Stok "${barang.nama}" habis (0 ${barang.satuan})!`, 'error');
      return;
    }

    const existingIndex = cart.findIndex((c) => c.barangId === barang.id);
    if (existingIndex >= 0) {
      const currentCartItem = cart[existingIndex];
      const newQty = currentCartItem.qty + qtyToAdd;
      if (newQty > barang.stok) {
        showFeedback(`Stok "${barang.nama}" tersisa hanya ${barang.stok} ${barang.satuan}!`, 'error');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...currentCartItem,
        qty: newQty,
        subtotal: hitungSubtotal(currentCartItem.harga, newQty),
      };
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          barangId: barang.id,
          kode: barang.kode,
          nama: barang.nama,
          satuan: barang.satuan,
          harga: barang.hargaJual,
          qty: qtyToAdd,
          stokTersedia: barang.stok,
          subtotal: hitungSubtotal(barang.hargaJual, qtyToAdd),
        },
      ]);
    }

    playBeep();
    showFeedback(`+ Masuk keranjang: ${barang.nama}`, 'success');
  };

  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = scanQuery.trim().toLowerCase();
    if (!query) return;

    // 1. Cek kecocokan Barcode Eksak
    const exactBarcode = barangList.find((b) => b.kode.toLowerCase() === query);
    if (exactBarcode) {
      handleAddToCart(exactBarcode, 1);
      setScanQuery('');
      scanInputRef.current?.focus();
      return;
    }

    // 2. Cek kecocokan Nama / Barcode parsial
    const matched = barangList.filter(
      (b) => b.nama.toLowerCase().includes(query) || b.kode.toLowerCase().includes(query)
    );

    if (matched.length === 1) {
      handleAddToCart(matched[0], 1);
      setScanQuery('');
      scanInputRef.current?.focus();
    } else if (matched.length > 1) {
      // Ada beberapa barang cocok, tampilkan di info
      showFeedback(`Ditemukan ${matched.length} barang cocok. Silakan pilih dari katalog.`, 'info');
    } else {
      showFeedback(`Barang dengan barcode/nama "${query}" tidak ditemukan!`, 'error');
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    const item = cart[index];
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }

    const barang = barangList.find((b) => b.id === item.barangId);
    const maxStok = barang ? barang.stok : item.stokTersedia;

    if (newQty > maxStok) {
      showFeedback(`Stok "${item.nama}" hanya tersisa ${maxStok}!`, 'error');
      newQty = maxStok;
    }

    const updated = [...cart];
    updated[index] = {
      ...item,
      qty: newQty,
      subtotal: hitungSubtotal(item.harga, newQty),
    };
    setCart(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Kosongkan semua barang dari keranjang belanja?')) {
      setCart([]);
      setUangBayar('');
    }
  };

  const totalTagihan = hitungTotalBelanja(cart);
  const totalQtyBelanja = hitungTotalQty(cart);
  const nominalBayarNum = typeof uangBayar === 'number' ? uangBayar : 0;
  const statusKembalian = hitungKembalian(totalTagihan, nominalBayarNum);

  const handleProsesPenjualan = () => {
    if (cart.length === 0) {
      showFeedback('Keranjang belanja masih kosong!', 'error');
      return;
    }

    if (!statusKembalian.isCukup) {
      showFeedback(
        `Uang bayar kurang ${formatRupiah(statusKembalian.selisihKurang)}! Total: ${formatRupiah(totalTagihan)}`,
        'error'
      );
      return;
    }

    // 1. Kurangi stok barang secara atomik
    const updatedBarang = [...barangList];
    for (const cartItem of cart) {
      const idx = updatedBarang.findIndex((b) => b.id === cartItem.barangId);
      if (idx >= 0) {
        const res = kurangiStok(updatedBarang[idx].stok, cartItem.qty);
        if (!res.isValid) {
          showFeedback(res.error || 'Gagal mengurangi stok', 'error');
          return;
        }
        updatedBarang[idx] = {
          ...updatedBarang[idx],
          stok: res.stokBaru,
          updatedAt: new Date().toLocaleString('id-ID'),
        };
      }
    }

    // 2. Buat objek Transaksi baru
    const now = new Date();
    const noNota = generateNoNota(riwayatTransaksi.length + 1, now);
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newTransaksi: Transaksi = {
      id: 'tx-' + Date.now(),
      noNota,
      tanggal: dateStr,
      items: [...cart],
      totalItem: cart.length,
      totalQty: totalQtyBelanja,
      total: totalTagihan,
      bayar: nominalBayarNum,
      kembalian: statusKembalian.kembalian,
    };

    setBarangList(updatedBarang);
    setRiwayatTransaksi([newTransaksi, ...riwayatTransaksi]);
    setActiveReceipt(newTransaksi);
    setCart([]);
    setUangBayar('');
    showFeedback(`Transaksi ${noNota} berhasil disimpan!`, 'success');
  };

  // ========================================================
  // LOGIKA GUDANG (MASTER BARANG & BARANG MASUK)
  // ========================================================

  const handleOpenTambahBarang = () => {
    setEditingBarang(null);
    setFormBarangData({
      kode: '',
      nama: '',
      kategori: 'Umum',
      satuan: 'pcs',
      hargaBeli: 0,
      hargaJual: 0,
      stok: 0,
      stokMin: 5,
    });
    setModalBarangOpen(true);
  };

  const handleOpenEditBarang = (barang: Barang) => {
    setEditingBarang(barang);
    setFormBarangData({
      kode: barang.kode,
      nama: barang.nama,
      kategori: barang.kategori,
      satuan: barang.satuan,
      hargaBeli: barang.hargaBeli,
      hargaJual: barang.hargaJual,
      stok: barang.stok,
      stokMin: barang.stokMin,
    });
    setModalBarangOpen(true);
  };

  const handleSaveBarang = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validasiBarang(formBarangData);
    if (!val.isValid) {
      alert(val.errors.join('\n'));
      return;
    }

    // Cek duplikasi kode barcode
    const duplicate = barangList.find(
      (b) => b.kode.toLowerCase() === formBarangData.kode.trim().toLowerCase() && b.id !== editingBarang?.id
    );
    if (duplicate) {
      alert(`Kode barcode "${formBarangData.kode}" sudah dipakai barang "${duplicate.nama}"!`);
      return;
    }

    const nowStr = new Date().toLocaleString('id-ID');

    if (editingBarang) {
      // Update
      const updated = barangList.map((b) =>
        b.id === editingBarang.id
          ? {
              ...b,
              ...formBarangData,
              kode: formBarangData.kode.trim(),
              nama: formBarangData.nama.trim(),
              updatedAt: nowStr,
            }
          : b
      );
      setBarangList(updated);
      showFeedback(`Data barang "${formBarangData.nama}" berhasil diperbarui!`, 'success');
    } else {
      // Tambah baru
      const newBarang: Barang = {
        id: 'b-' + Date.now(),
        kode: formBarangData.kode.trim(),
        nama: formBarangData.nama.trim(),
        kategori: formBarangData.kategori.trim() || 'Umum',
        satuan: formBarangData.satuan.trim() || 'pcs',
        hargaBeli: formBarangData.hargaBeli,
        hargaJual: formBarangData.hargaJual,
        stok: formBarangData.stok,
        stokMin: formBarangData.stokMin,
        updatedAt: nowStr,
      };
      setBarangList([...barangList, newBarang]);
      showFeedback(`Barang baru "${formBarangData.nama}" berhasil ditambahkan ke master!`, 'success');
    }

    setModalBarangOpen(false);
  };

  const handleDeleteBarang = (barang: Barang) => {
    if (window.confirm(`Yakin ingin menghapus barang "${barang.nama}" (${barang.kode}) dari master?`)) {
      setBarangList(barangList.filter((b) => b.id !== barang.id));
      showFeedback(`Barang "${barang.nama}" telah dihapus.`, 'info');
    }
  };

  const handleSaveBarangMasuk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMasuk.barangId) {
      alert('Pilih barang dari master data terlebih dahulu!');
      return;
    }
    if (formMasuk.qty <= 0) {
      alert('Jumlah masuk harus lebih besar dari 0!');
      return;
    }

    const targetBarang = barangList.find((b) => b.id === formMasuk.barangId);
    if (!targetBarang) return;

    // Update stok di master barang
    const addResult = tambahStok(targetBarang.stok, formMasuk.qty);
    if (!addResult.isValid) {
      alert(addResult.error);
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Catat riwayat barang masuk
    const newBarangMasuk: BarangMasuk = {
      id: 'bm-' + Date.now(),
      barangId: targetBarang.id,
      kodeBarang: targetBarang.kode,
      namaBarang: targetBarang.nama,
      qty: formMasuk.qty,
      hargaBeliSatuan: formMasuk.hargaBeli > 0 ? formMasuk.hargaBeli : targetBarang.hargaBeli,
      supplier: formMasuk.supplier.trim() || '-',
      catatan: formMasuk.catatan.trim() || '-',
      tanggal: dateStr,
    };

    const updatedBarang = barangList.map((b) =>
      b.id === targetBarang.id
        ? {
            ...b,
            stok: addResult.stokBaru,
            hargaBeli: formMasuk.hargaBeli > 0 ? formMasuk.hargaBeli : b.hargaBeli,
            updatedAt: dateStr,
          }
        : b
    );

    setBarangList(updatedBarang);
    setBarangMasukList([newBarangMasuk, ...barangMasukList]);
    setFormMasuk({
      barangId: '',
      qty: 1,
      hargaBeli: 0,
      supplier: '',
      catatan: '',
    });

    showFeedback(
      `Restock berhasil: +${formMasuk.qty} ${targetBarang.satuan} ke "${targetBarang.nama}". Stok sekarang: ${addResult.stokBaru}`,
      'success'
    );
  };

  // Filter Master Barang di Gudang
  const filteredMasterBarang = barangList.filter((b) => {
    const q = gudangSearch.toLowerCase().trim();
    const matchSearch = b.nama.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q);
    const matchKategori = gudangKategoriFilter === 'Semua' || b.kategori === gudangKategoriFilter;
    return matchSearch && matchKategori;
  });

  const totalItemMaster = barangList.length;
  const totalStokMenipis = barangList.filter((b) => b.stok <= b.stokMin && b.stok > 0).length;
  const totalStokHabis = barangList.filter((b) => b.stok <= 0).length;

  // Total Omset Hari Ini
  const totalOmsetHariIni = riwayatTransaksi.reduce((sum, tx) => sum + tx.total, 0);

  // Kategori unik
  const listKategori = Array.from(new Set(barangList.map((b) => b.kategori))).filter(Boolean);

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans ${isTabletMode ? 'text-base' : 'text-sm'}`}>
      
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all transform animate-bounce text-white font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-600'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-600'
              : 'bg-slate-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* HEADER NAVIGASI */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-inner">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">TOKO & GUDANG LOKAL (KISS)</h1>
            <p className="text-xs text-slate-400">Offline-First • SQLite WAL Mode • LAN 0.0.0.0</p>
          </div>
        </div>

        {/* TAB 2 MODUL UTAMA + PANDUAN */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('kasir')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'kasir'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            } ${isTabletMode ? 'py-3 px-5 text-base' : 'text-xs sm:text-sm'}`}
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>1. KASIR</span>
          </button>

          <button
            onClick={() => setActiveTab('gudang')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'gudang'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            } ${isTabletMode ? 'py-3 px-5 text-base' : 'text-xs sm:text-sm'}`}
          >
            <Package className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>2. GUDANG</span>
            {totalStokMenipis + totalStokHabis > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {totalStokMenipis + totalStokHabis}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'windows'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Windows (.bat)</span>
          </button>
        </div>

        {/* DEVICE MODE TOGGLE & STATUS LAN */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-sky-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LAN Wi-Fi: Ready</span>
          </div>

          <button
            onClick={() => setIsTabletMode(!isTabletMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isTabletMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Ubah ukuran tombol untuk layar sentuh tablet"
          >
            {isTabletMode ? <Tablet className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            <span>{isTabletMode ? 'Mode Tablet (Besar)' : 'Mode PC (Kompak)'}</span>
          </button>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-5">
        
        {/* ======================================================== */}
        {/* MODUL 1: KASIR (PENJUALAN & BARANG KELUAR) */}
        {/* ======================================================== */}
        {activeTab === 'kasir' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SISI KIRI: SCANNER BARCODE & KATALOG BARANG CEPAT */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Scan Barcode Form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <form onSubmit={handleScanSubmit} className="flex flex-col gap-2">
                  <label htmlFor="scan-barcode-input" className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-emerald-600" />
                    Scan Barcode / Cari Barang (Tekan Enter):
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={scanInputRef}
                        id="scan-barcode-input"
                        type="text"
                        value={scanQuery}
                        onChange={(e) => setScanQuery(e.target.value)}
                        placeholder="Scan barcode / cari nama barang..."
                        className={`w-full rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-medium pl-3 pr-8 outline-hidden transition-all ${
                          isTabletMode ? 'py-3 text-lg' : 'py-2.5 text-base'
                        }`}
                        autoComplete="off"
                      />
                      {scanQuery && (
                        <button
                          type="button"
                          onClick={() => setScanQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className={`bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg px-4 flex items-center gap-1.5 transition-all ${
                        isTabletMode ? 'py-3 px-6' : 'py-2.5'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                      <span>Cari</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Katalog Barang Cepat Dipilih */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-700 text-sm">Katalog Barang Siap Jual:</span>
                  <span className="text-xs text-slate-500 font-medium">{barangList.length} Barang Terdaftar</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto max-h-[500px] pr-1">
                  {barangList.map((barang) => {
                    const isHabis = barang.stok <= 0;
                    const isMenipis = barang.stok <= barang.stokMin && !isHabis;
                    return (
                      <button
                        key={barang.id}
                        disabled={isHabis}
                        onClick={() => handleAddToCart(barang, 1)}
                        className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between ${
                          isHabis
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-500 border-slate-200 shadow-2xs hover:shadow-xs active:scale-[0.98]'
                        } ${isTabletMode ? 'min-h-[96px] p-4' : 'min-h-[82px]'}`}
                      >
                        <div>
                          <div className="font-semibold text-slate-800 line-clamp-2 leading-tight">
                            {barang.nama}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{barang.kode}</div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-black text-emerald-700">
                            {formatRupiah(barang.hargaJual)}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${
                              isHabis
                                ? 'bg-rose-100 text-rose-800'
                                : isMenipis
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Stok: {barang.stok}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* SISI KANAN: KERANJANG BELANJA & PEMBAYARAN */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                {/* Header Keranjang */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-800">Keranjang Belanja</span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {totalQtyBelanja} item
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                </div>

                {/* Daftar Item Keranjang */}
                <div className="overflow-y-auto max-h-[320px] divide-y divide-slate-100">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Barcode className="w-8 h-8 text-slate-300" />
                      <p className="font-medium">Keranjang masih kosong.</p>
                      <p className="text-xs">Scan barcode fisik atau klik barang dari katalog sebelah kiri.</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={item.barangId} className={`p-3 flex items-center justify-between gap-2 ${isTabletMode ? 'py-4' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-800 text-sm truncate">{item.nama}</h4>
                          <div className="text-xs text-slate-500">
                            {formatRupiah(item.harga)} / {item.satuan}
                          </div>
                        </div>

                        {/* Kontrol Qty (+ / -) Besar untuk Touchscreen */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button
                            onClick={() => handleUpdateQty(idx, item.qty - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs hover:bg-slate-200 active:scale-95 font-bold"
                            title={`Kurang ${item.nama}`}
                            aria-label={`Kurang ${item.nama}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stokTersedia}
                            value={item.qty}
                            aria-label={`Jumlah ${item.nama}`}
                            onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                            className="w-10 text-center font-bold text-sm bg-transparent outline-hidden"
                          />
                          <button
                            onClick={() => handleUpdateQty(idx, item.qty + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs hover:bg-slate-200 active:scale-95 font-bold"
                            title={`Tambah ${item.nama}`}
                            aria-label={`Tambah ${item.nama}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right w-24">
                          <span className="font-black text-slate-900 block">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>

                        {/* Hapus item */}
                        <button
                          onClick={() => handleRemoveCartItem(idx)}
                          aria-label={`Hapus ${item.nama} dari keranjang`}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Tagihan & Pembayaran */}
                <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col gap-3">
                  
                  {/* Banner Total Tagihan */}
                  <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-inner">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                      TOTAL TAGIHAN:
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {formatRupiah(totalTagihan)}
                    </span>
                  </div>

                  {/* Input Uang Diterima */}
                  <div>
                    <label htmlFor="input-uang-bayar" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Uang Diterima (Rp):
                    </label>
                    <input
                      id="input-uang-bayar"
                      type="number"
                      placeholder="Ketik jumlah uang atau klik tombol cepat..."
                      value={uangBayar}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUangBayar(val === '' ? '' : parseInt(val) || 0);
                      }}
                      className={`w-full rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 font-black text-slate-900 px-3 outline-hidden ${
                        isTabletMode ? 'py-3 text-xl' : 'py-2.5 text-lg'
                      }`}
                    />
                  </div>

                  {/* Tombol Pecahan Cepat Uang Tunai */}
                  <div className="grid grid-cols-5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUangBayar(totalTagihan)}
                      className="py-1.5 px-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-bold text-slate-800 text-center"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => setUangBayar((prev) => (typeof prev === 'number' ? prev : 0) + 10000)}
                      className="py-1.5 px-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-bold text-slate-800 text-center"
                    >
                      +10rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setUangBayar((prev) => (typeof prev === 'number' ? prev : 0) + 20000)}
                      className="py-1.5 px-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-bold text-slate-800 text-center"
                    >
                      +20rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setUangBayar((prev) => (typeof prev === 'number' ? prev : 0) + 50000)}
                      className="py-1.5 px-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-bold text-slate-800 text-center"
                    >
                      +50rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setUangBayar((prev) => (typeof prev === 'number' ? prev : 0) + 100000)}
                      className="py-1.5 px-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-bold text-slate-800 text-center"
                    >
                      +100rb
                    </button>
                  </div>

                  {/* Banner Kembalian */}
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                      statusKembalian.isCukup
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase">
                      {statusKembalian.isCukup ? 'KEMBALIAN:' : 'KURANG:'}
                    </span>
                    <span className="text-lg font-black">
                      {statusKembalian.isCukup
                        ? formatRupiah(statusKembalian.kembalian)
                        : formatRupiah(statusKembalian.selisihKurang)}
                    </span>
                  </div>

                  {/* Tombol Bayar & Cetak Nota [F2] */}
                  <button
                    type="button"
                    onClick={handleProsesPenjualan}
                    disabled={cart.length === 0 || !statusKembalian.isCukup}
                    className={`w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isTabletMode ? 'py-4 text-xl' : 'py-3 text-lg'
                    }`}
                  >
                    <Printer className="w-5 h-5" />
                    <span>BAYAR & CETAK STRUK [F2]</span>
                  </button>

                </div>

              </div>

              {/* Ringkasan Omset Harian */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div>
                  <span className="block font-medium">Omset Kasir Hari Ini:</span>
                  <span className="font-black text-slate-900 text-sm">{formatRupiah(totalOmsetHariIni)}</span>
                </div>
                <div>
                  <span className="block font-medium">Total Transaksi:</span>
                  <span className="font-black text-slate-900 text-sm">{riwayatTransaksi.length} Nota</span>
                </div>
                {riwayatTransaksi.length > 0 && (
                  <button
                    onClick={() => setActiveReceipt(riwayatTransaksi[0])}
                    className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Struk Terakhir</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* MODUL 2: STOK GUDANG (MASTER BARANG & BARANG MASUK) */}
        {/* ======================================================== */}
        {activeTab === 'gudang' && (
          <div className="flex flex-col gap-4">
            
            {/* Header Gudang: Sub-tabs & Aksi Tambah */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGudangSubTab('master')}
                  className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                    gudangSubTab === 'master'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Daftar Master Barang ({totalItemMaster})</span>
                </button>

                <button
                  onClick={() => setGudangSubTab('masuk')}
                  className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                    gudangSubTab === 'masuk'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Input Barang Masuk (Restock)</span>
                </button>
              </div>

              <button
                onClick={handleOpenTambahBarang}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Barang Baru</span>
              </button>
            </div>

            {/* 2A. TABEL MASTER BARANG */}
            {gudangSubTab === 'master' && (
              <div className="flex flex-col gap-4">
                
                {/* Filter & Stat Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={gudangSearch}
                        onChange={(e) => setGudangSearch(e.target.value)}
                        placeholder="Cari nama barang atau barcode..."
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <select
                      value={gudangKategoriFilter}
                      onChange={(e) => setGudangKategoriFilter(e.target.value)}
                      className="rounded-lg border border-slate-300 py-2 px-3 text-sm outline-hidden focus:border-emerald-600"
                    >
                      <option value="Semua">Semua Kategori</option>
                      {listKategori.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold">
                      Aman: {barangList.filter((b) => b.stok > b.stokMin).length}
                    </span>
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-bold">
                      Menipis: {totalStokMenipis}
                    </span>
                    <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-xs font-bold">
                      Habis: {totalStokHabis}
                    </span>
                  </div>
                </div>

                {/* Tabel Master Barang */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                          <th className="py-3 px-4">Kode / Barcode</th>
                          <th className="py-3 px-4">Nama Barang</th>
                          <th className="py-3 px-4">Kategori</th>
                          <th className="py-3 px-4 text-right">Harga Beli</th>
                          <th className="py-3 px-4 text-right">Harga Jual</th>
                          <th className="py-3 px-4 text-center">Stok</th>
                          <th className="py-3 px-4 text-center">Min</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredMasterBarang.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-10 text-center text-slate-400">
                              Tidak ada barang yang cocok dengan pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredMasterBarang.map((barang) => {
                            const isHabis = barang.stok <= 0;
                            const isMenipis = barang.stok <= barang.stokMin && !isHabis;
                            return (
                              <tr key={barang.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 font-mono text-xs text-slate-600">
                                  {barang.kode}
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  {barang.nama}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                    {barang.kategori}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600 font-medium">
                                  {formatRupiah(barang.hargaBeli)}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-slate-900">
                                  {formatRupiah(barang.hargaJual)}
                                </td>
                                <td className="py-3 px-4 text-center font-black text-base">
                                  {barang.stok} <span className="text-xs font-normal text-slate-500">{barang.satuan}</span>
                                </td>
                                <td className="py-3 px-4 text-center text-xs text-slate-400">
                                  {barang.stokMin}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`px-2 py-1 rounded-sm text-xs font-bold inline-block ${
                                      isHabis
                                        ? 'bg-rose-100 text-rose-800'
                                        : isMenipis
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {isHabis ? 'Habis' : isMenipis ? 'Menipis' : 'Aman'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditBarang(barang)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBarang(barang)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded text-xs transition-colors"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 2B. FORM & RIWAYAT BARANG MASUK (RESTOCK GUDANG) */}
            {gudangSubTab === 'masuk' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Form Input Barang Masuk */}
                <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                    <span>Catat Barang Masuk (Restock)</span>
                  </h3>

                  <form onSubmit={handleSaveBarangMasuk} className="flex flex-col gap-3.5">
                    <div>
                      <label htmlFor="masuk-barang-select" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Pilih Barang dari Master (*):
                      </label>
                      <select
                        id="masuk-barang-select"
                        value={formMasuk.barangId}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const b = barangList.find((item) => item.id === bId);
                          setFormMasuk({
                            ...formMasuk,
                            barangId: bId,
                            hargaBeli: b ? b.hargaBeli : 0,
                          });
                        }}
                        required
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-medium outline-hidden focus:border-emerald-600"
                      >
                        <option value="">-- Pilih Barang --</option>
                        {barangList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama} ({b.kode}) - Sisa Stok: {b.stok} {b.satuan}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="masuk-qty-input" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Jumlah Masuk (*):
                        </label>
                        <input
                          id="masuk-qty-input"
                          type="number"
                          min="1"
                          required
                          value={formMasuk.qty}
                          onChange={(e) => setFormMasuk({ ...formMasuk, qty: parseInt(e.target.value) || 1 })}
                          className="w-full rounded-lg border border-slate-300 p-2.5 text-base font-bold outline-hidden focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label htmlFor="masuk-harga-beli-input" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Harga Beli Satuan (Rp):
                        </label>
                        <input
                          id="masuk-harga-beli-input"
                          type="number"
                          min="0"
                          value={formMasuk.hargaBeli}
                          onChange={(e) => setFormMasuk({ ...formMasuk, hargaBeli: parseInt(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-medium outline-hidden focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="masuk-supplier-input" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Nama Supplier / Distributor:
                      </label>
                      <input
                        id="masuk-supplier-input"
                        type="text"
                        placeholder="Contoh: Grosir Makmur Jaya"
                        value={formMasuk.supplier}
                        onChange={(e) => setFormMasuk({ ...formMasuk, supplier: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-hidden focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="masuk-catatan-input" className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Catatan / Nomor Faktur:
                      </label>
                      <input
                        id="masuk-catatan-input"
                        type="text"
                        placeholder="Contoh: Faktur No. 2026/10/A-09"
                        value={formMasuk.catatan}
                        onChange={(e) => setFormMasuk({ ...formMasuk, catatan: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-hidden focus:border-emerald-600"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      <span>Simpan & Tambah ke Stok</span>
                    </button>
                  </form>
                </div>

                {/* Riwayat Barang Masuk */}
                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                  <h3 className="font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-slate-600" />
                    <span>Riwayat Barang Masuk Terakhir</span>
                  </h3>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Barang</th>
                          <th className="py-2.5 px-3 text-center">Qty Masuk</th>
                          <th className="py-2.5 px-3">Supplier</th>
                          <th className="py-2.5 px-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {barangMasukList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              Belum ada riwayat barang masuk.
                            </td>
                          </tr>
                        ) : (
                          barangMasukList.map((bm) => (
                            <tr key={bm.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                                {bm.tanggal}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{bm.namaBarang}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{bm.kodeBarang}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-sm text-xs">
                                  +{bm.qty}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600">{bm.supplier}</td>
                              <td className="py-2.5 px-3 text-xs text-slate-500">{bm.catatan}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PANDUAN & PAKET STANDALONE WINDOWS (.BAT) */}
        {/* ======================================================== */}
        {activeTab === 'windows' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-4xl mx-auto flex flex-col gap-6">
            
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-600" />
                <span>Paket Standalone Python 3 + SQLite WAL (Windows 1-Klik)</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Aplikasi ini telah dilengkapi dengan kode sumber Python Flask + SQLite WAL murni yang siap dijalankan langsung di PC Windows toko Anda dengan 1-klik file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-800 font-bold">run_app.bat</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Petunjuk Langkah 1 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                  <span>Jalankan di PC Windows Kasir</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
                  <li>Pastikan PC Windows sudah terpasang Python 3 (centang <i>Add python.exe to PATH</i>).</li>
                  <li>Double-click file <strong>run_app.bat</strong>.</li>
                  <li>Server Flask otomatis aktif di <strong>http://localhost:5000</strong> dan membuka browser.</li>
                  <li>Database <strong>toko_gudang.db</strong> otomatis menggunakan mode <strong>WAL</strong> (Write-Ahead Logging).</li>
                </ul>
              </div>

              {/* Petunjuk Langkah 2 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                  <span>Buka di Tablet/HP Gudang (Wi-Fi)</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
                  <li>Hubungkan Tablet/HP ke Wi-Fi yang sama dengan PC Kasir.</li>
                  <li>Lihat alamat IP LAN di jendela run_app.bat (contoh: <code>http://192.168.1.15:5000</code>).</li>
                  <li>Buka alamat tersebut di Chrome/Edge/Safari pada Tablet.</li>
                  <li>Klik tombol <strong>📱 Mode Tablet</strong> untuk tombol touchscreen besar.</li>
                </ul>
              </div>

            </div>

            {/* Kode run_app.bat */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Isi File Launcher: run_app.bat
                </span>
                <span className="text-xs text-emerald-700 font-mono font-bold">Siap dijalankan di Windows 10 / 11</span>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
{`@echo off
title POS & Gudang Lokal (KISS Server)
color 0A
python -c "import flask" || pip install -r requirements.txt
python -c "import database; database.init_db()"
start http://localhost:5000
python app.py
pause`}
              </pre>
            </div>

            {/* Fitur Reset Data Contoh */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="font-bold text-sm text-amber-900">Reset Data Demo Toko</h4>
                <p className="text-xs text-amber-700">Kembalikan daftar barang dan riwayat ke contoh awal toko fisik.</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Reset data lokal ke data awal sembako & minimarket?')) {
                    localStorage.removeItem('kiss_pos_barang');
                    localStorage.removeItem('kiss_pos_barang_masuk');
                    localStorage.removeItem('kiss_pos_penjualan');
                    setBarangList(DEFAULT_BARANG);
                    setBarangMasukList(DEFAULT_BARANG_MASUK);
                    setRiwayatTransaksi([]);
                    setCart([]);
                    showFeedback('Data toko berhasil di-reset ke default demo!', 'info');
                  }
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Data Demo</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL: TAMBAH / EDIT MASTER BARANG */}
      {/* ======================================================== */}
      {modalBarangOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <span>{editingBarang ? 'Edit Data Barang' : 'Tambah Barang Baru'}</span>
              </h3>
              <button
                onClick={() => setModalBarangOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBarang} className="p-5 flex flex-col gap-3">
              <div>
                <label htmlFor="form-kode-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kode Barcode / SKU (*):
                </label>
                <input
                  id="form-kode-input"
                  type="text"
                  required
                  value={formBarangData.kode}
                  onChange={(e) => setFormBarangData({ ...formBarangData, kode: e.target.value })}
                  placeholder="Contoh: 8998866200225"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-mono outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="form-nama-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Barang (*):
                </label>
                <input
                  id="form-nama-input"
                  type="text"
                  required
                  value={formBarangData.nama}
                  onChange={(e) => setFormBarangData({ ...formBarangData, nama: e.target.value })}
                  placeholder="Contoh: Indomie Goreng 85g"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-kategori-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kategori:
                  </label>
                  <input
                    id="form-kategori-input"
                    type="text"
                    value={formBarangData.kategori}
                    onChange={(e) => setFormBarangData({ ...formBarangData, kategori: e.target.value })}
                    placeholder="Sembako, Makanan, dll"
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="form-satuan-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Satuan:
                  </label>
                  <input
                    id="form-satuan-input"
                    type="text"
                    value={formBarangData.satuan}
                    onChange={(e) => setFormBarangData({ ...formBarangData, satuan: e.target.value })}
                    placeholder="pcs, bks, btl, kg, dus"
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-harga-beli-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga Beli (Rp):
                  </label>
                  <input
                    id="form-harga-beli-input"
                    type="number"
                    min="0"
                    value={formBarangData.hargaBeli}
                    onChange={(e) => setFormBarangData({ ...formBarangData, hargaBeli: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="form-harga-jual-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga Jual (Rp) (*):
                  </label>
                  <input
                    id="form-harga-jual-input"
                    type="number"
                    min="0"
                    required
                    value={formBarangData.hargaJual}
                    onChange={(e) => setFormBarangData({ ...formBarangData, hargaJual: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-emerald-700 outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="form-stok-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stok Sekarang:
                  </label>
                  <input
                    id="form-stok-input"
                    type="number"
                    min="0"
                    value={formBarangData.stok}
                    onChange={(e) => setFormBarangData({ ...formBarangData, stok: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="form-stok-min-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stok Minimum (Alert):
                  </label>
                  <input
                    id="form-stok-min-input"
                    type="number"
                    min="0"
                    value={formBarangData.stokMin}
                    onChange={(e) => setFormBarangData({ ...formBarangData, stokMin: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalBarangOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-xs"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: STRUK NOTA KASIR THERMAL (SIAP PRINT) */}
      {/* ======================================================== */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-300 flex flex-col">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Struk Pembelian Thermal (58mm)
              </span>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kertas Struk Monospace */}
            <div className="p-4 bg-amber-50/50 overflow-y-auto max-h-[440px]">
              <pre
                id="thermal-receipt-area"
                className="font-mono text-xs text-slate-900 leading-tight bg-white p-4 border border-dashed border-slate-300 shadow-xs whitespace-pre select-all"
              >
                {formatThermalNota(activeReceipt)}
              </pre>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(formatThermalNota(activeReceipt));
                  setCopiedReceipt(true);
                  setTimeout(() => setCopiedReceipt(false), 2000);
                }}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {copiedReceipt ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReceipt ? 'Disalin!' : 'Salin Teks'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Tutup [ESC]
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Printer)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
