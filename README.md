# Sistem KPR & Retensi

Dashboard Berkas KPR dan Retensi/Escrow (Shaistanaya City). Aturan kerja dan logika bisnis ada di `CLAUDE.md`; purwarupa acuan ada di `prototype/`.

## Menjalankan
1. `npm install`
2. Salin `.env.example` menjadi `.env`, isi URL dan anon key proyek Supabase.
3. Jalankan `supabase/migrations/0001_init.sql` di proyek Supabase.
4. `npm run dev` (tes: `npm test`)

## Status
Tahap 1: kerangka Vite + React + TypeScript, skema database dengan peran (admin, sales, pembaca) dan riwayat perubahan, logika bisnis dengan tes, login, dan tabel dasar. Panel detail, filter, unduh PDF/Excel, dan impor Excel masih perlu dipindahkan dari purwarupa.
