# Sistem KPR & Retensi

Dashboard Berkas KPR dan Retensi/Escrow (Shaistanaya City). Aturan kerja dan logika bisnis ada di `CLAUDE.md`; purwarupa acuan ada di `prototype/`.

## Menjalankan
1. `npm install`
2. Salin `.env.example` menjadi `.env`, isi URL dan anon key proyek Supabase.
3. Jalankan `supabase/migrations/0001_init.sql` di proyek Supabase.
4. `npm run dev` (tes: `npm test`)

## Status
Tahap 3: unduh PDF/Excel sesuai filter, unggah Excel dengan pratinjau perubahan (admin), di atas tampilan lengkap dan akses per peran dari tahap 2. Belum ada: tombol WhatsApp, pengingat unit macet, hubungan KPR-Retensi, lampiran dokumen. Catatan: pustaka xlsx versi npm (0.18.5) punya advisori yang belum ada perbaikannya di npm; dipakai hanya untuk file yang diunggah admin.
