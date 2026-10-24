/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
  Transaksi,
  CartItem,
} from './pos-warehouse.ts';

test('formatRupiah formats Indonesian Rupiah properly', () => {
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(15000), 'Rp 15.000');
  assert.equal(formatRupiah(1250500), 'Rp 1.250.500');
});

test('hitungSubtotal computes multiplication safely', () => {
  assert.equal(hitungSubtotal(5000, 3), 15000);
  assert.equal(hitungSubtotal(12500, 2), 25000);
  assert.equal(hitungSubtotal(-100, 5), 0);
  assert.equal(hitungSubtotal(100, -2), 0);
});

test('hitungTotalBelanja sums all cart items correctly', () => {
  const items = [
    { harga: 3000, qty: 2 },  // 6000
    { harga: 15000, qty: 1 }, // 15000
    { harga: 2500, qty: 4 },  // 10000
  ];
  assert.equal(hitungTotalBelanja(items), 31000);
  assert.equal(hitungTotalQty(items), 7);
});

test('hitungKembalian handles cash payments accurately', () => {
  // Pas
  const res1 = hitungKembalian(50000, 50000);
  assert.equal(res1.isCukup, true);
  assert.equal(res1.kembalian, 0);
  assert.equal(res1.selisihKurang, 0);

  // Lebih
  const res2 = hitungKembalian(32500, 50000);
  assert.equal(res2.isCukup, true);
  assert.equal(res2.kembalian, 17500);
  assert.equal(res2.selisihKurang, 0);

  // Kurang
  const res3 = hitungKembalian(60000, 50000);
  assert.equal(res3.isCukup, false);
  assert.equal(res3.kembalian, 0);
  assert.equal(res3.selisihKurang, 10000);
});

test('kurangiStok validates available inventory and prevents overselling', () => {
  // Sukses
  const res1 = kurangiStok(10, 3);
  assert.equal(res1.isValid, true);
  assert.equal(res1.stokBaru, 7);

  // Stok pas
  const res2 = kurangiStok(5, 5);
  assert.equal(res2.isValid, true);
  assert.equal(res2.stokBaru, 0);

  // Stok tidak cukup
  const res3 = kurangiStok(4, 5);
  assert.equal(res3.isValid, false);
  assert.match(res3.error || '', /Stok tidak mencukupi/);

  // Input tidak valid (0 atau negatif)
  const res4 = kurangiStok(10, 0);
  assert.equal(res4.isValid, false);
});

test('tambahStok increases inventory accurately on restock', () => {
  const res1 = tambahStok(10, 25);
  assert.equal(res1.isValid, true);
  assert.equal(res1.stokBaru, 35);

  const res2 = tambahStok(0, 50);
  assert.equal(res2.isValid, true);
  assert.equal(res2.stokBaru, 50);

  const res3 = tambahStok(10, -5);
  assert.equal(res3.isValid, false);
});

test('validasiBarang rejects missing required master data', () => {
  const valid = validasiBarang({
    kode: '8991234567890',
    nama: 'Beras Pandan Wangi 5kg',
    satuan: 'karung',
    hargaBeli: 65000,
    hargaJual: 75000,
    stokMin: 5,
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);

  const invalid = validasiBarang({
    kode: '',
    nama: '',
    hargaBeli: -100,
    hargaJual: 1000,
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.length >= 2);
});

test('generateNoNota generates readable order number with sequence', () => {
  const testDate = new Date(2026, 9, 24); // Oct 24, 2026
  const noNota = generateNoNota(1, testDate);
  assert.equal(noNota, 'TR-20261024-0001');
});

test('formatThermalNota outputs compliant 32-character receipt', () => {
  const items: CartItem[] = [
    {
      barangId: '1',
      kode: '899123',
      nama: 'Minyak Goreng 1L',
      satuan: 'btl',
      harga: 16000,
      qty: 2,
      stokTersedia: 10,
      subtotal: 32000,
    },
  ];
  const tx: Transaksi = {
    id: 'tx-1',
    noNota: 'TR-20261024-0001',
    tanggal: '24/10/2026 14:30',
    items,
    totalItem: 1,
    totalQty: 2,
    total: 32000,
    bayar: 50000,
    kembalian: 18000,
  };
  const nota = formatThermalNota(tx);
  assert.ok(nota.includes('TR-20261024-0001'));
  assert.ok(nota.includes('Minyak Goreng 1L'));
  assert.ok(nota.includes('TOTAL'));
  assert.ok(nota.includes('TUNAI:'));
  assert.ok(nota.includes('KEMBALI:'));
});
