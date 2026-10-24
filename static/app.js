/**
 * app.js - Vanilla JS (Fetch API) untuk POS & Stok Gudang
 * 100% Offline, Tanpa Framework Berat / Node Webpack
 */

// State Global Aplikasi
let masterBarang = [];
let cart = [];
let isTouchMode = false;
let currentNotaData = null;

// Inisialisasi saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  muatInfoLAN();
  muatMasterBarang();
  muatRiwayatBarangMasuk();
  setupKeyboardShortcuts();
});

// ========================================================
// NAVIGASI & DEVICE MODE
// ========================================================

function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));
  
  if (tab === "kasir") {
    document.getElementById("section-kasir").classList.add("active");
    document.getElementById("btn-tab-kasir").classList.add("active");
    setTimeout(() => {
      const scanInput = document.getElementById("kasir-scan-input");
      if (scanInput) scanInput.focus();
    }, 100);
  } else if (tab === "gudang") {
    document.getElementById("section-gudang").classList.add("active");
    document.getElementById("btn-tab-gudang").classList.add("active");
    muatMasterBarang();
  }
}

function switchGudangSubTab(sub) {
  document.querySelectorAll(".gudang-sub-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".sub-tab-btn").forEach(el => el.classList.remove("active"));
  
  if (sub === "master") {
    document.getElementById("gudang-sub-master").classList.add("active");
    document.getElementById("sub-btn-master").classList.add("active");
  } else {
    document.getElementById("gudang-sub-masuk").classList.add("active");
    document.getElementById("sub-btn-masuk").classList.add("active");
    isiDropdownBarangMasuk();
    muatRiwayatBarangMasuk();
  }
}

function toggleTouchMode() {
  isTouchMode = !isTouchMode;
  document.body.classList.toggle("mode-tablet", isTouchMode);
  const btn = document.getElementById("btn-mode");
  if (btn) {
    btn.textContent = isTouchMode ? "💻 Mode PC Kasir" : "📱 Mode Tablet";
  }
}

function muatInfoLAN() {
  fetch("/api/info-lan")
    .then(res => res.json())
    .then(data => {
      const text = document.getElementById("lan-ip-text");
      if (text && data.tablet_gudang_url) {
        text.textContent = data.tablet_gudang_url;
      }
    })
    .catch(() => {
      const text = document.getElementById("lan-ip-text");
      if (text) text.textContent = "Offline (Localhost)";
    });
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // F2: Bayar Transaksi Kasir
    if (e.key === "F2") {
      e.preventDefault();
      prosesPenjualan();
    }
    // ESC: Tutup Modal
    if (e.key === "Escape") {
      tutupModalBarang();
      tutupModalStruk();
    }
  });

  // Enter pada scan input
  const scanInput = document.getElementById("kasir-scan-input");
  if (scanInput) {
    scanInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        cariBarangKasir();
      }
    });
  }
}

// ========================================================
// FORMATTER UTILS
// ========================================================

function formatRupiah(num) {
  const val = Math.round(num || 0);
  return "Rp " + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ========================================================
// MODUL 1: KASIR (PENJUALAN)
// ========================================================

function muatMasterBarang() {
  fetch("/api/barang")
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        masterBarang = res.data;
        renderKatalogKasir();
        renderTabelMasterGudang();
        isiDropdownBarangMasuk();
      }
    })
    .catch(err => console.error("Gagal memuat barang:", err));
}

function renderKatalogKasir() {
  const katalogEl = document.getElementById("katalog-items");
  const countEl = document.getElementById("katalog-count");
  if (!katalogEl) return;

  katalogEl.innerHTML = "";
  countEl.textContent = `${masterBarang.length} Produk`;

  masterBarang.forEach(b => {
    const btn = document.createElement("button");
    btn.className = "katalog-btn";
    btn.onclick = () => tambahKeKeranjang(b.id);
    
    const statusClass = b.stok <= 0 ? "badge-danger" : (b.stok <= b.stok_min ? "badge-warning" : "badge-success");
    
    btn.innerHTML = `
      <div>
        <div class="item-nama">${b.nama}</div>
        <div class="item-stok">Kode: ${b.kode}</div>
      </div>
      <div>
        <div class="item-harga">${formatRupiah(b.harga_jual)}</div>
        <span class="badge ${statusClass}">Stok: ${b.stok} ${b.satuan}</span>
      </div>
    `;
    katalogEl.appendChild(btn);
  });
}

function cariBarangKasir() {
  const query = document.getElementById("kasir-scan-input").value.trim().toLowerCase();
  if (!query) return;

  // Cek barcode eksak terlebih dahulu (scanner barcode fisik)
  const exactMatch = masterBarang.find(b => b.kode.toLowerCase() === query);
  if (exactMatch) {
    tambahKeKeranjang(exactMatch.id);
    document.getElementById("kasir-scan-input").value = "";
    return;
  }

  // Jika nama mengandung kata kunci
  const matched = masterBarang.filter(b => 
    b.nama.toLowerCase().includes(query) || b.kode.toLowerCase().includes(query)
  );

  if (matched.length === 1) {
    tambahKeKeranjang(matched[0].id);
    document.getElementById("kasir-scan-input").value = "";
  } else if (matched.length > 1) {
    tampilkanDropdownPencarian(matched);
  } else {
    alert("Barang tidak ditemukan: " + query);
  }
}

function tampilkanDropdownPencarian(list) {
  const dropdown = document.getElementById("kasir-search-results");
  dropdown.innerHTML = "";
  dropdown.classList.remove("hidden");

  list.forEach(b => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.innerHTML = `
      <span><strong>${b.nama}</strong> (${b.kode})</span>
      <span class="text-primary font-bold">${formatRupiah(b.harga_jual)} - Stok: ${b.stok}</span>
    `;
    item.onclick = () => {
      tambahKeKeranjang(b.id);
      dropdown.classList.add("hidden");
      document.getElementById("kasir-scan-input").value = "";
    };
    dropdown.appendChild(item);
  });
}

function tambahKeKeranjang(barangId) {
  const b = masterBarang.find(item => item.id === barangId);
  if (!b) return;

  if (b.stok <= 0) {
    alert(`Stok barang '${b.nama}' habis (0 ${b.satuan})! Tidak bisa dijual.`);
    return;
  }

  const existing = cart.find(c => c.barangId === barangId);
  if (existing) {
    if (existing.qty + 1 > b.stok) {
      alert(`Stok '${b.nama}' tersisa hanya ${b.stok} ${b.satuan}!`);
      return;
    }
    existing.qty += 1;
    existing.subtotal = existing.qty * existing.harga;
  } else {
    cart.push({
      barangId: b.id,
      kode: b.kode,
      nama: b.nama,
      satuan: b.satuan,
      harga: b.harga_jual,
      qty: 1,
      stokTersedia: b.stok,
      subtotal: b.harga_jual
    });
  }

  renderKeranjang();
  // Bunyi beep sederhana via Web Audio API jika didukung browser
  mainkanBeep();
}

function mainkanBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore jika audio diblokir browser
  }
}

function ubahQty(index, delta) {
  const item = cart[index];
  if (!item) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    cart.splice(index, 1);
  } else if (newQty > item.stokTersedia) {
    alert(`Stok '${item.nama}' hanya tersisa ${item.stokTersedia}!`);
  } else {
    item.qty = newQty;
    item.subtotal = item.qty * item.harga;
  }
  renderKeranjang();
}

function setQtyDirect(index, inputVal) {
  const item = cart[index];
  if (!item) return;
  const val = parseInt(inputVal) || 1;
  if (val <= 0) {
    cart.splice(index, 1);
  } else if (val > item.stokTersedia) {
    alert(`Stok '${item.nama}' hanya tersisa ${item.stokTersedia}!`);
    item.qty = item.stokTersedia;
    item.subtotal = item.qty * item.harga;
  } else {
    item.qty = val;
    item.subtotal = item.qty * item.harga;
  }
  renderKeranjang();
}

function hapusItemKeranjang(index) {
  cart.splice(index, 1);
  renderKeranjang();
}

function kosongkanKeranjang() {
  if (cart.length === 0) return;
  if (confirm("Kosongkan keranjang belanja kasir?")) {
    cart = [];
    renderKeranjang();
  }
}

function renderKeranjang() {
  const tbody = document.getElementById("cart-table-body");
  if (!tbody) return;

  if (cart.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5" class="text-center text-muted p-5">
          Keranjang kosong.<br>Scan barcode atau klik barang di katalog.
        </td>
      </tr>
    `;
    document.getElementById("label-total-belanja").textContent = "Rp 0";
    document.getElementById("label-kembalian").textContent = "Rp 0";
    return;
  }

  tbody.innerHTML = "";
  let grandTotal = 0;

  cart.forEach((item, idx) => {
    grandTotal += item.subtotal;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${item.nama}</strong>
        <div class="text-sm text-muted">${item.kode}</div>
      </td>
      <td class="text-center">
        <div class="qty-control">
          <button class="btn-qty" onclick="ubahQty(${idx}, -1)">-</button>
          <input type="number" class="qty-num" value="${item.qty}" min="1" max="${item.stokTersedia}" onchange="setQtyDirect(${idx}, this.value)">
          <button class="btn-qty" onclick="ubahQty(${idx}, 1)">+</button>
        </div>
      </td>
      <td class="text-right">${formatRupiah(item.harga)}</td>
      <td class="text-right font-bold">${formatRupiah(item.subtotal)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-danger" onclick="hapusItemKeranjang(${idx})">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("label-total-belanja").textContent = formatRupiah(grandTotal);
  hitungKembalianRealtime();
}

function hitungKembalianRealtime() {
  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const inputBayar = document.getElementById("input-bayar");
  const bayar = parseInt(inputBayar.value) || 0;
  const labelKembali = document.getElementById("label-kembalian");
  const bannerKembali = document.getElementById("banner-kembalian");

  const selisih = bayar - grandTotal;
  if (selisih >= 0) {
    labelKembali.textContent = formatRupiah(selisih);
    labelKembali.style.color = "#166534";
    bannerKembali.style.borderColor = "#86efac";
    bannerKembali.style.background = "#f0fdf4";
  } else {
    labelKembali.textContent = "Kurang " + formatRupiah(Math.abs(selisih));
    labelKembali.style.color = "#b91c1c";
    bannerKembali.style.borderColor = "#fca5a5";
    bannerKembali.style.background = "#fef2f2";
  }
}

function setUangPas() {
  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  document.getElementById("input-bayar").value = grandTotal;
  hitungKembalianRealtime();
}

function tambahUangBayar(nominal) {
  const inputBayar = document.getElementById("input-bayar");
  const current = parseInt(inputBayar.value) || 0;
  inputBayar.value = current + nominal;
  hitungKembalianRealtime();
}

function prosesPenjualan() {
  if (cart.length === 0) {
    alert("Keranjang masih kosong!");
    return;
  }

  const grandTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const bayar = parseInt(document.getElementById("input-bayar").value) || 0;

  if (bayar < grandTotal) {
    alert(`Uang pembayaran kurang! Total: ${formatRupiah(grandTotal)}, Bayar: ${formatRupiah(bayar)}`);
    document.getElementById("input-bayar").focus();
    return;
  }

  const payload = {
    items: cart.map(c => ({ barang_id: c.barangId, qty: c.qty })),
    bayar: bayar
  };

  fetch("/api/penjualan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        currentNotaData = res.nota;
        tampilkanModalStruk(res.nota);
        
        // Reset Cart
        cart = [];
        document.getElementById("input-bayar").value = "";
        renderKeranjang();
        muatMasterBarang();
      } else {
        alert("Gagal memproses transaksi: " + res.message);
      }
    })
    .catch(err => {
      alert("Error koneksi server: " + err.message);
    });
}

function tampilkanModalStruk(nota) {
  const paper = document.getElementById("receipt-paper-content");
  if (!paper) return;

  const line = "--------------------------------";
  const itemsText = nota.items.map(it => {
    const qtyHarga = `${it.qty} ${it.satuan} x ${it.harga.toLocaleString('id-ID')}`;
    const sub = it.subtotal.toLocaleString('id-ID');
    const space = Math.max(1, 32 - qtyHarga.length - sub.length);
    return `${it.nama.substring(0, 32)}\n${qtyHarga}${' '.repeat(space)}${sub}`;
  }).join("\n");

  const totalStr = formatRupiah(nota.total_harga);
  const bayarStr = formatRupiah(nota.bayar);
  const kembaliStr = formatRupiah(nota.kembalian);

  const receiptContent = `
     TOKO KELONTONG BERKAH
   Jl. Pasar Raya - Offline LAN
${line}
No   : ${nota.no_nota}
Tgl  : ${nota.tanggal}
Kasir: PC Kasir 01
${line}
${itemsText}
${line}
TOTAL (${nota.total_qty} item) : ${totalStr}
TUNAI              : ${bayarStr}
KEMBALI            : ${kembaliStr}
${line}
 Terima Kasih Atas Kunjungan Anda
   Barang Tdk Dpt Ditukar
`.trim();

  paper.textContent = receiptContent;
  document.getElementById("modal-struk").classList.remove("hidden");
}

function tutupModalStruk() {
  document.getElementById("modal-struk").classList.add("hidden");
}

function cetakStrukThermal() {
  window.print();
}

// ========================================================
// MODUL 2: STOK GUDANG (MASTER & BARANG MASUK)
// ========================================================

function renderTabelMasterGudang() {
  const tbody = document.getElementById("master-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";
  let menipisCount = 0;

  masterBarang.forEach(b => {
    if (b.stok <= b.stok_min) menipisCount++;

    const statusBadge = b.stok <= 0 
      ? '<span class="badge badge-danger">Habis</span>'
      : (b.stok <= b.stok_min ? '<span class="badge badge-warning">Menipis</span>' : '<span class="badge badge-success">Aman</span>');

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${b.kode}</code></td>
      <td><strong>${b.nama}</strong></td>
      <td><span class="badge" style="background:#e2e8f0;">${b.kategori}</span></td>
      <td class="text-right">${formatRupiah(b.harga_beli)}</td>
      <td class="text-right font-bold">${formatRupiah(b.harga_jual)}</td>
      <td class="text-center font-bold text-lg">${b.stok} <small>${b.satuan}</small></td>
      <td class="text-center text-muted">${b.stok_min}</td>
      <td class="text-center">${statusBadge}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-secondary" onclick="editBarang(${b.id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="hapusBarang(${b.id}, '${b.nama}')">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const totalEl = document.getElementById("stat-total-barang");
  const menipisEl = document.getElementById("stat-menipis-barang");
  if (totalEl) totalEl.textContent = `Total: ${masterBarang.length} Item`;
  if (menipisEl) menipisEl.textContent = `Menipis: ${menipisCount}`;
}

function filterMasterBarang() {
  const q = document.getElementById("gudang-search-input").value.toLowerCase();
  const kat = document.getElementById("gudang-filter-kategori").value;

  const rows = document.querySelectorAll("#master-table-body tr");
  masterBarang.forEach((b, idx) => {
    const row = rows[idx];
    if (!row) return;

    const matchText = b.nama.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q);
    const matchKat = (kat === "Semua" || b.kategori === kat);

    row.style.display = (matchText && matchKat) ? "" : "none";
  });
}

function bukaModalTambahBarang() {
  document.getElementById("modal-barang-title").textContent = "Tambah Barang Baru";
  document.getElementById("barang-id").value = "";
  document.getElementById("barang-kode").value = "";
  document.getElementById("barang-nama").value = "";
  document.getElementById("barang-kategori").value = "Umum";
  document.getElementById("barang-satuan").value = "pcs";
  document.getElementById("barang-harga-beli").value = "0";
  document.getElementById("barang-harga-jual").value = "0";
  document.getElementById("barang-stok").value = "0";
  document.getElementById("barang-stok-min").value = "5";
  document.getElementById("modal-barang").classList.remove("hidden");
  document.getElementById("barang-kode").focus();
}

function editBarang(id) {
  const b = masterBarang.find(item => item.id === id);
  if (!b) return;

  document.getElementById("modal-barang-title").textContent = "Edit Data Barang";
  document.getElementById("barang-id").value = b.id;
  document.getElementById("barang-kode").value = b.kode;
  document.getElementById("barang-nama").value = b.nama;
  document.getElementById("barang-kategori").value = b.kategori;
  document.getElementById("barang-satuan").value = b.satuan;
  document.getElementById("barang-harga-beli").value = b.harga_beli;
  document.getElementById("barang-harga-jual").value = b.harga_jual;
  document.getElementById("barang-stok").value = b.stok;
  document.getElementById("barang-stok-min").value = b.stok_min;
  document.getElementById("modal-barang").classList.remove("hidden");
}

function tutupModalBarang() {
  document.getElementById("modal-barang").classList.add("hidden");
}

function simpanDataBarang(e) {
  e.preventDefault();
  const id = document.getElementById("barang-id").value;
  const payload = {
    kode: document.getElementById("barang-kode").value.trim(),
    nama: document.getElementById("barang-nama").value.trim(),
    kategori: document.getElementById("barang-kategori").value.trim(),
    satuan: document.getElementById("barang-satuan").value.trim(),
    harga_beli: parseInt(document.getElementById("barang-harga-beli").value) || 0,
    harga_jual: parseInt(document.getElementById("barang-harga-jual").value) || 0,
    stok: parseInt(document.getElementById("barang-stok").value) || 0,
    stok_min: parseInt(document.getElementById("barang-stok-min").value) || 0
  };

  const url = id ? `/api/barang/${id}` : "/api/barang";
  const method = id ? "PUT" : "POST";

  fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        alert(res.message);
        tutupModalBarang();
        muatMasterBarang();
      } else {
        alert("Gagal menyimpan barang: " + res.message);
      }
    })
    .catch(err => alert("Error koneksi: " + err.message));
}

function hapusBarang(id, nama) {
  if (confirm(`Yakin ingin menghapus barang '${nama}' dari master data?`)) {
    fetch(`/api/barang/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          alert("Barang berhasil dihapus!");
          muatMasterBarang();
        } else {
          alert("Gagal menghapus: " + res.message);
        }
      })
      .catch(err => alert("Error: " + err.message));
  }
}

// BARANG MASUK (RESTOCK GUDANG)
function isiDropdownBarangMasuk() {
  const select = document.getElementById("masuk-pilih-barang");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Pilih Barang dari Master --</option>';

  masterBarang.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = `${b.nama} (${b.kode}) - Sisa Stok: ${b.stok} ${b.satuan}`;
    select.appendChild(opt);
  });

  if (currentVal) select.value = currentVal;
}

function onSelectBarangMasuk() {
  const select = document.getElementById("masuk-pilih-barang");
  const bId = parseInt(select.value);
  const b = masterBarang.find(item => item.id === bId);
  const labelSatuan = document.getElementById("masuk-satuan-label");
  const inputHarga = document.getElementById("masuk-harga-beli");

  if (b) {
    if (labelSatuan) labelSatuan.textContent = b.satuan;
    if (inputHarga) inputHarga.value = b.harga_beli;
  }
}

function simpanBarangMasuk(e) {
  e.preventDefault();
  const select = document.getElementById("masuk-pilih-barang");
  const bId = parseInt(select.value);
  const qty = parseInt(document.getElementById("masuk-qty").value) || 0;
  const hargaBeli = parseInt(document.getElementById("masuk-harga-beli").value) || 0;
  const supplier = document.getElementById("masuk-supplier").value.trim();
  const catatan = document.getElementById("masuk-catatan").value.trim();

  if (!bId || qty <= 0) {
    alert("Pilih barang dan jumlah stok masuk (>0)!");
    return;
  }

  fetch("/api/barang-masuk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barang_id: bId,
      qty: qty,
      harga_beli: hargaBeli,
      supplier: supplier,
      catatan: catatan
    })
  })
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        alert(res.message);
        document.getElementById("form-barang-masuk").reset();
        muatMasterBarang();
        muatRiwayatBarangMasuk();
      } else {
        alert("Gagal mencatat barang masuk: " + res.message);
      }
    })
    .catch(err => alert("Error koneksi: " + err.message));
}

function muatRiwayatBarangMasuk() {
  fetch("/api/barang-masuk?limit=20")
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        const tbody = document.getElementById("riwayat-masuk-tbody");
        if (!tbody) return;

        if (res.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-3">Belum ada riwayat barang masuk.</td></tr>';
          return;
        }

        tbody.innerHTML = "";
        res.data.forEach(r => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td class="text-sm text-muted">${r.tanggal}</td>
            <td><strong>${r.nama_barang}</strong><div class="text-sm text-muted">${r.kode_barang}</div></td>
            <td class="text-center"><span class="badge badge-success">+${r.qty} ${r.satuan}</span></td>
            <td class="text-sm">${r.supplier}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    })
    .catch(err => console.error("Gagal muat riwayat barang masuk:", err));
}
