import { createClient } from "@supabase/supabase-js";
import type { Kpr, Retensi, Role } from "./types";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? "http://localhost",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "anon",
);

// Baris database: kolom inti + `data` (jsonb) -> bentuk model aplikasi.
type Row = { id: string; ord: number; data: Record<string, unknown>; updated_at: string } & Record<string, unknown>;
export const toKpr = (r: Row) => ({ ...r.data, id: r.id, ord: r.ord, unit: r.unit, nama: r.nama, updatedAt: r.updated_at }) as Kpr;
export const toRetensi = (r: Row) => ({ ...r.data, id: r.id, ord: r.ord, blok: r.blok, nama: r.nama, updatedAt: r.updated_at }) as Retensi;

export async function loadAll() {
  const [k, r] = await Promise.all([supabase.from("kpr").select("*").order("ord"), supabase.from("retensi").select("*").order("ord")]);
  if (k.error) throw k.error;
  if (r.error) throw r.error;
  return { kpr: (k.data as Row[]).map(toKpr), retensi: (r.data as Row[]).map(toRetensi) };
}

export async function myRole(): Promise<Role> {
  const { data } = await supabase.from("profiles").select("role").single();
  return (data?.role as Role) ?? "pembaca";
}
