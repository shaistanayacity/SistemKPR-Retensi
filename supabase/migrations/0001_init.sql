-- Skema awal: profil/peran, KPR, Retensi, dan riwayat perubahan.
create type public.app_role as enum ('admin', 'sales', 'pembaca');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nama text,
  role public.app_role not null default 'pembaca'
);

create table public.kpr (
  id uuid primary key default gen_random_uuid(),
  ord int not null default 0,
  unit text not null,
  nama text not null,
  data jsonb not null default '{}'::jsonb, -- seluruh field lain sesuai model di CLAUDE.md
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.retensi (
  id uuid primary key default gen_random_uuid(),
  ord int not null default 0,
  blok text not null,
  nama text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.riwayat (
  id bigint generated always as identity primary key,
  tabel text not null,
  baris_id uuid not null,
  aksi text not null,
  oleh uuid default auth.uid(),
  waktu timestamptz not null default now(),
  sebelum jsonb,
  sesudah jsonb
);

create or replace function public.current_role_app() returns public.app_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

-- Profil otomatis (peran awal: pembaca; admin menaikkan peran secara manual).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$ begin insert into public.profiles (id) values (new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Riwayat perubahan.
create or replace function public.log_riwayat() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  insert into public.riwayat (tabel, baris_id, aksi, sebelum, sesudah)
  values (tg_table_name, coalesce(new.id, old.id), tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger kpr_riwayat after insert or update or delete on public.kpr for each row execute function public.log_riwayat();
create trigger retensi_riwayat after insert or update or delete on public.retensi for each row execute function public.log_riwayat();

alter table public.profiles enable row level security;
alter table public.kpr enable row level security;
alter table public.retensi enable row level security;
alter table public.riwayat enable row level security;

create policy "profil sendiri" on public.profiles for select using (id = auth.uid() or public.current_role_app() = 'admin');
create policy "admin kelola profil" on public.profiles for update using (public.current_role_app() = 'admin');

-- Semua pengguna login boleh melihat.
create policy "kpr lihat" on public.kpr for select to authenticated using (true);
create policy "retensi lihat" on public.retensi for select to authenticated using (true);
-- Admin: penuh. Sales: ubah KPR saja (tidak tambah/hapus, tidak menyentuh Retensi).
create policy "kpr admin" on public.kpr for all using (public.current_role_app() = 'admin') with check (public.current_role_app() = 'admin');
create policy "kpr sales ubah" on public.kpr for update using (public.current_role_app() = 'sales') with check (public.current_role_app() = 'sales');
create policy "retensi admin" on public.retensi for all using (public.current_role_app() = 'admin') with check (public.current_role_app() = 'admin');
create policy "riwayat admin" on public.riwayat for select using (public.current_role_app() = 'admin');
