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
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "none";
  const { data } = await supabase.from("kpr_profiles").select("role").eq("id", u.user.id).maybeSingle();
  return (data?.role as Role) ?? "none";
}

// Simpan: kolom inti dipisah, sisanya masuk jsonb `data`.
export async function saveKpr(r: Kpr) {
  const { id, ord, unit, nama, updatedAt: _u, ...data } = r;
  const row = { ord, unit, nama, data, updated_at: new Date().toISOString() };
  const q = id ? supabase.from("kpr").update(row).eq("id", id) : supabase.from("kpr").insert(row);
  const { error } = await q;
  if (error) throw error;
}
export async function saveRetensi(r: Retensi) {
  const { id, ord, blok, nama, updatedAt: _u, ...data } = r;
  const row = { ord, blok, nama, data, updated_at: new Date().toISOString() };
  const q = id ? supabase.from("retensi").update(row).eq("id", id) : supabase.from("retensi").insert(row);
  const { error } = await q;
  if (error) throw error;
}
export async function removeRow(table: "kpr" | "retensi", id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function applyWrites(writes: { table: "kpr" | "retensi"; id: string | null; rec: Kpr | Retensi }[], onProgress: (done: number, total: number) => void) {
  const q = [...writes];
  let done = 0, fail = 0;
  const worker = async () => {
    while (q.length) {
      const w = q.shift()!;
      try { await (w.table === "kpr" ? saveKpr({ ...(w.rec as Kpr), id: w.id ?? "" }) : saveRetensi({ ...(w.rec as Retensi), id: w.id ?? "" })); }
      catch { fail++; }
      onProgress(++done, writes.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return fail;
}
