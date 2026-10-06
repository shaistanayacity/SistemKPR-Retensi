# Dashboard Berkas KPR & Retensi — Shaistanaya City

Aplikasi web internal untuk memantau kelengkapan berkas KPR dan retensi (escrow) tiap unit rumah.
Pemilik: Arifah Dona (Head of Digital Marketing, Shaistanaya City / PT Neo Pudji Jaya).

## Aturan kerja
- Bahasa antarmuka dan jawaban: Indonesia, sopan dan formal. Pakai "tidak", bukan "ga".
- Tampilan: terang, kaca lembut (kartu putih tembus pandang, latar biru keabuan dengan kilau emas), bentuk kapsul untuk tombol, tab, isian, dan bar; aksen biru tua dan emas selaras dengan logo; tanpa emoji. Status dibedakan lewat warna pastel dan label teks. Tema ada di bagian "Tema lembut" di `src/style.css`. Ubah tampilan tidak boleh menggeser tata letak (diverifikasi dengan mengukur posisi elemen sebelum dan sesudah).
- Jangan ubah fitur yang sudah ada tanpa diminta. Tampilan tabel KPR sengaja ringkas; detail lengkap muncul saat baris diklik (panel samping).
- Purwarupa yang sudah jalan ada di `prototype/dashboard-prototype.html` (satu file HTML). Jadikan acuan tampilan dan perilaku.

## Isi folder
- `prototype/dashboard-prototype.html` — purwarupa final (Versi 13 di Claude Artifact). Semua logika ada di sini.
- `data/kpr.json` (178 unit) dan `data/retensi.json` (20 blok) — data terakhir, termasuk perubahan manual.
- `data/excel-asli/` — dua file Excel sumber.
- `referensi/` — skrip konversi Excel ke JSON dan kode impor Excel dari purwarupa (pemetaan kolom ada di sini).

## Fitur yang sudah ada
Tab Berkas KPR:
- Kartu alur: Pemberkasan, Proses Bank, ACC Bank, Sudah Akad, Non KPR. Daftar "Perlu ditindaklanjuti". Bagan unit per bank.
- Tab status, pencarian nama/unit, filter tahun UTJ, bank, cara bayar, urutan (default berkas terbaru dulu menurut tanggal UTJ).
- Filter tanggal (UTJ, SPR & PPJB, proses bank, ACC, akad, pencairan KPR) dengan rentang dari/sampai dan tombol Bulan ini, Bulan lalu, 30 hari.
- Tabel 8 kolom: Unit, Pembeli (nama, sales, kantor agent), Nilai, Proses Bank (bank, tanggal, keterangan), ACC & Akad, Berkas, Status. Klik baris membuka panel detail untuk melihat dan mengubah.
- Panel detail (revisi Oktober 2026): data pembeli (+ sales, kantor agent), harga (harga jual, diskon PPN / Tusuk Sate / Khusus, total diskon, harga transaksi = harga jual - total diskon, UTJ, uang muka, plafond), kelengkapan berkas hanya sesuai jenis pekerjaan dan semuanya wajib (KTP, NPWP, KK, akta nikah, RK 3 bln, suket kerja, slip gaji 3 bulan, RK 6 bln, NIB/SKDU, lapkeu), proses bank dengan riwayat progres per bank (tombol + Progres), ACC & akad (nominal ACC, TUM, tanggal, tempat, notaris), legal & pajak, serah terima. Tidak ada lagi: cashback, angsuran UM, total UM, pencairan KPR, berkas akad, catatan, promo.
- Unduh PDF dan Excel sesuai filter aktif. Report custom (pilih kolom) hanya PDF. Unggah Excel (lihat aturan impor di bawah).
Tab Retensi/Escrow:
- Kartu: retensi awal, sudah cair, sisa, unit lunas. Pencairan terbaru. Sisa per komponen.
- Pencairan dicatat per tanggal, nominal, dan kategori (tombol "+ Cair"); retensi kategori tersebut dan total retensi berkurang otomatis. Nilai transaksi hanya Nilai KPR ACC bank dan Total diterima awal; persen pencairan KPR dihitung otomatis. Status dan catatan diganti satu kolom Keterangan (isian manual). Tambah Retensi bisa mengambil data dari KPR (nilai KPR = nominal ACC bank).
- Filter status, bank, notaris, tanggal pencairan. Unduh PDF dan Excel. Unggah Excel.

## Logika bisnis (jangan diubah tanpa konfirmasi)
Status unit KPR, diperiksa berurutan:
1. Cara bayar tidak mengandung "KPR" → Non KPR
2. Ada tanggal akad → Sudah Akad
3. Ada tanggal ACC, atau nominal ACC bank > 0, atau ada bank berhasil "ACC" → ACC Bank
4. Ada data proses bank → Proses Bank
5. Selain itu → Pemberkasan
"Belum akad" = Pemberkasan + Proses Bank + ACC Bank.
Retensi: awal = jumlah semua komponen (bangunan, ajb, sertifikat, pbg, pdam, listrik, pajak). Cair = jumlah semua pencairan. Total retensi (sisa) = awal − cair. Status otomatis: "Lunas" saat awal > 0 dan sisa ≤ 0, "Ada sisa" bila masih ada sisa. Persen pencairan KPR = total diterima awal / nilai KPR ACC bank.
Harga: total diskon = diskon PPN + Tusuk Sate + Khusus; harga transaksi = harga jual − total diskon.
Kelengkapan berkas: jumlah dokumen terpenuhi dari yang dibutuhkan (karyawan: KTP, NPWP, KK, akta nikah, RK 3 bln, suket kerja, slip gaji; wiraswasta: KTP, NPWP, KK, akta nikah, RK 6 bln, NIB, lapkeu).

## Model data
KPR: ord, unit, nama, sales, kantor, tglUTJ, tglSPR, caraBayar, jenisPekerjaan, hargaJual, diskonPPN, diskonTusukSate, diskonKhusus, totalDiskon, hargaTransaksi, utj, totalUM (uang muka), plafond, accBank, tglACC, tum, berkas{ktp,npwp,kk,akta,rk3,suket,slip3,rk6,nibSkdu,lapkeu}, bankProses[{bank,tgl,ket,hasil}] (satu baris per progres, bank yang sama boleh berulang), legal{potongPokok,roya,ambilSertifikat,verifikasi,validasi}, tglAkad, tempatAkad, notaris, progressBangun, ajb, tglAJB, stu, tglSTU, updatedAt.
Retensi: ord, blok, nama, pembayaran, tglAkad, kprId, nilaiKPRAccBank, totalDiterimAwal, ret{bangunan,ajb,sertifikat,pbg,pdam,listrik,pajak}, cair[{tgl,nominal,komponen,ket}], bank, notaris, keterangan, updatedAt.
Tanggal disimpan ISO (YYYY-MM-DD). Nominal dalam rupiah (angka bulat).

## Aturan impor Excel
- Rekap KPR: baris header ditemukan lewat sel kolom B bernilai "UNIT"; data mulai 2 baris di bawahnya. Retensi: header di kolom A bernilai "Blok".
- Tanggal bisa berupa serial Excel atau teks Indonesia ("31 Agustus 2023", "31/8/23").
- Kunci pencocokan: nomor unit (KPR) atau blok (retensi), huruf besar, spasi di sekitar "-" diabaikan. Unit kembar di file (contoh F2-03, F12-09) diperlakukan sebagai dua data terpisah menurut urutan.
- Unit yang ada diperbarui, unit baru ditambahkan, tidak ada yang dihapus. Tampilkan pratinjau perubahan sebelum menyimpan.
- Retensi: nilai retensi tidak ditimpa jika blok itu sudah punya riwayat pencairan.
- Uji: mengunggah ulang dua file asli harus menghasilkan "tidak ada perubahan".

## Rencana pengembangan (urutan prioritas)
1. Pindah dari penyimpanan purwarupa ke database sungguhan dengan login. Rekomendasi: Supabase (Postgres + Auth) dan Next.js atau Vite + React, dengan peran: admin (ubah), sales (ubah terbatas), pembaca (lihat saja).
2. Riwayat perubahan (siapa mengubah apa, kapan).
3. Tombol WhatsApp ke pembeli untuk berkas yang kurang (link wa.me dengan pesan siap kirim, tanpa API).
4. Pengingat unit macet: lama di proses bank tanpa hasil, atau sudah ACC tetapi belum dijadwalkan akad.
5. Hubungan KPR dan Retensi per unit.
6. Lampiran dokumen per unit, catatan harian, laporan bulanan, cetak kartu satu unit.
Catatan: unduhan PDF/Excel di purwarupa belum diuji sampai file benar-benar terbuka, jadi uji di aplikasi baru.

## Privasi
Data berisi nama dan data keuangan pembeli. Jangan taruh data asli di repositori publik. Gunakan `.gitignore` untuk folder `data/`.
