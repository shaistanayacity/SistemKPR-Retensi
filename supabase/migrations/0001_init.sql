-- Skema aplikasi Berkas KPR & Retensi.
-- Aman dipasang di proyek Supabase yang dipakai aplikasi lain: semua objek berawalan kpr_/retensi,
-- tidak ada pemicu di auth.users, dan akun baru TIDAK punya akses sampai admin memberi peran.
create type public.kpr_role as enum ('admin', 'sales', 'pembaca');

create table public.kpr_profiles (
  id uuid primary key references auth.users on delete cascade,
  nama text,
  role public.kpr_role not null
);

create table public.kpr (
  id uuid primary key default gen_random_uuid(),
  ord int not null default 0,
  unit text not null,
  nama text not null,
  data jsonb not null default '{}'::jsonb, -- field lain sesuai model di CLAUDE.md
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table public.retensi (
  id uuid primary key default gen_random_uuid(),
  ord int not null default 0,
  blok text not null,
  nama text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table public.kpr_riwayat (
  id bigint generated always as identity primary key,
  tabel text not null,
  baris_id uuid not null,
  aksi text not null,
  oleh uuid default auth.uid(),
  waktu timestamptz not null default now(),
  sebelum jsonb,
  sesudah jsonb
);

-- Peran pengguna saat ini; null bila belum diberi akses.
create or replace function public.kpr_peran() returns public.kpr_role
language sql stable security definer set search_path = public as
$$ select role from public.kpr_profiles where id = auth.uid() $$;
revoke all on function public.kpr_peran() from public, anon;
grant execute on function public.kpr_peran() to authenticated;

create or replace function public.kpr_log_riwayat() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  insert into public.kpr_riwayat (tabel, baris_id, aksi, sebelum, sesudah)
  values (tg_table_name, coalesce(new.id, old.id), tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
revoke all on function public.kpr_log_riwayat() from public, anon, authenticated;
create trigger kpr_riwayat after insert or update or delete on public.kpr for each row execute function public.kpr_log_riwayat();
create trigger retensi_riwayat after insert or update or delete on public.retensi for each row execute function public.kpr_log_riwayat();

alter table public.kpr_profiles enable row level security;
alter table public.kpr enable row level security;
alter table public.retensi enable row level security;
alter table public.kpr_riwayat enable row level security;

create policy "profil sendiri" on public.kpr_profiles for select to authenticated using (id = auth.uid() or public.kpr_peran() = 'admin');
create policy "admin kelola profil" on public.kpr_profiles for all to authenticated using (public.kpr_peran() = 'admin') with check (public.kpr_peran() = 'admin');

-- Hanya yang sudah diberi peran boleh melihat.
create policy "kpr lihat" on public.kpr for select to authenticated using (public.kpr_peran() is not null);
create policy "retensi lihat" on public.retensi for select to authenticated using (public.kpr_peran() is not null);
-- Admin: penuh. Sales: ubah KPR saja (tidak tambah/hapus, tidak menyentuh Retensi).
create policy "kpr admin" on public.kpr for all to authenticated using (public.kpr_peran() = 'admin') with check (public.kpr_peran() = 'admin');
create policy "kpr sales ubah" on public.kpr for update to authenticated using (public.kpr_peran() = 'sales') with check (public.kpr_peran() = 'sales');
create policy "retensi admin" on public.retensi for all to authenticated using (public.kpr_peran() = 'admin') with check (public.kpr_peran() = 'admin');
create policy "riwayat admin" on public.kpr_riwayat for select to authenticated using (public.kpr_peran() = 'admin');
