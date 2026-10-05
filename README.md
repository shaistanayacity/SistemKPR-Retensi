# Sistem KPR & Retensi

Dashboard Berkas KPR dan Retensi/Escrow (Shaistanaya City). Aturan kerja dan logika bisnis ada di `CLAUDE.md`; purwarupa acuan ada di `prototype/`.

## Menjalankan
1. `npm install`
2. Salin `.env.example` menjadi `.env`, isi URL dan anon key proyek Supabase.
3. Jalankan `supabase/migrations/0001_init.sql` di proyek Supabase.
4. `npm run dev` (tes: `npm test`)

## Status
Tahap 2: tampilan lengkap dari purwarupa (kartu alur, tindak lanjut, bagan bank, filter dan tanggal, tabel, panel detail dengan ubah/tambah/hapus, pencairan retensi) dengan akses per peran. Belum ada: unduh PDF/Excel, impor Excel, tombol WhatsApp, pengingat unit macet, hubungan KPR-Retensi.
