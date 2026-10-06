// Impor Excel: pembacaan baris, penggabungan, dan rencana perubahan (lihat aturan di CLAUDE.md).
import { juta, num as numv, titleCase, tgl } from "./format";
import type { Kpr, Retensi } from "./types";

const BULAN: Record<string, number> = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, agust: 8, september: 9, oktober: 10, november: 11, desember: 12, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, agt: 8, sep: 9, okt: 10, nov: 11, des: 12 };
const p2 = (n: string | number) => String(n).padStart(2, "0");
type Cell = unknown;
export type Row = Cell[];

export function xd(v: Cell): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") return v > 30000 && v < 60000 ? new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10) : "";
  const s = String(v).trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/.exec(s))) return `20${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s)) && BULAN[m[2].toLowerCase()]) return `${m[3]}-${p2(BULAN[m[2].toLowerCase()])}-${p2(m[1])}`;
  return "";
}
const xn = (v: Cell) => (typeof v === "number" && Number.isFinite(v) ? (Number.isInteger(v) ? v : Math.round(v * 100) / 100) : 0);
const xt = (v: Cell) => { if (v == null) return ""; const s = String(v).trim(); return s === "-" || s === "#DIV/0!" ? "" : s; };
const xc = (v: Cell) => v != null && !["", "-", "x", "X"].includes(String(v).trim());
const normUnit = (s: string) => String(s || "").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim().toUpperCase();
const normBank = (s: string) => String(s || "").replace(/\s+/g, " ").trim().toUpperCase();

export type KprImport = Omit<Kpr, "id">;
export type RetImport = Omit<Retensi, "id" | "ord">;

export function parseKPRRows(rows: Row[]): KprImport[] | null {
  const h = rows.findIndex(r => String(r?.[1] ?? "").trim().toUpperCase() === "UNIT");
  if (h < 0) return null;
  const out: KprImport[] = [];
  let n = 0;
  for (const r of rows.slice(h + 2)) {
    if (!r) continue;
    const unit = String(r[1] ?? "").replace(/\s*-\s*/g, "-").trim(), nama = xt(r[2]);
    if (!unit || !nama) continue;
    n++;
    const bankProses = [25, 26, 27, 28].map(c => xt(r[c])).filter(Boolean).map(b => ({ bank: b, tgl: "", ket: "", hasil: "" }));
    if (bankProses.length && xt(r[29])) bankProses[bankProses.length - 1].ket = xt(r[29]);
    // Excel lama belum punya kategori diskon: selisih harga jual dan harga transaksi dicatat sebagai Diskon Khusus.
    const hargaJual = xn(r[6]), hargaTransaksi = xn(r[7]), selisih = hargaJual > hargaTransaksi && hargaTransaksi > 0 ? hargaJual - hargaTransaksi : 0;
    out.push({
      ord: typeof r[0] === "number" ? r[0] : n, unit, nama, tglUTJ: xd(r[3]), tglSPR: xd(r[4]), caraBayar: xt(r[5]),
      hargaJual, diskonKhusus: selisih, totalDiskon: selisih, hargaTransaksi: hargaJual ? hargaJual - selisih : hargaTransaksi, utj: xn(r[8]), totalUM: xn(r[11]),
      plafond: xn(r[12]), accBank: xn(r[13]), tum: xn(r[14]),
      berkas: Object.fromEntries(["ktp", "npwp", "kk", "akta", "rk3", "suket", "slip3", "rk6", "nibSkdu", "lapkeu"].map((k, i) => [k, xc(r[15 + i])])),
      bankProses,
      legal: Object.fromEntries(["potongPokok", "roya", "ambilSertifikat", "verifikasi", "validasi"].map((k, i) => [k, xc(r[30 + i])])),
      tglAkad: xd(r[39]), tempatAkad: xt(r[40]), notaris: xt(r[41]),
      progressBangun: xn(r[62]), ajb: xc(r[63]), tglAJB: xd(r[64]), stu: xc(r[65]), tglSTU: xd(r[66]),
    });
  }
  return out;
}

export function parseRetRows(rows: Row[]): RetImport[] | null {
  const h = rows.findIndex(r => String(r?.[0] ?? "").trim().toLowerCase() === "blok");
  if (h < 0) return null;
  const out: RetImport[] = [];
  for (const r of rows.slice(h + 1)) {
    if (!r) continue;
    const blok = xt(r[0]), nama = xt(r[1]);
    if (!blok || !nama) continue;
    out.push({
      blok, nama, pembayaran: xt(r[2]), nilaiKPRAccBank: xn(r[4]), totalDiterimAwal: xn(r[6]) + xn(r[7]),
      ret: { bangunan: Math.round(xn(r[10])), ajb: xn(r[11]), sertifikat: xn(r[12]), pbg: xn(r[13]), pdam: xn(r[14]), listrik: xn(r[15]), pajak: xn(r[16]) },
      bank: xt(r[19]), notaris: xt(r[20]), keterangan: [xt(r[18]), xt(r[21]), xt(r[22])].filter(Boolean).join("; "),
    });
  }
  return out;
}

// ---- Penggabungan & rencana ----
type Rec = Record<string, unknown>;
const FL_KPR: Record<string, string> = { unit: "Blok", nama: "Nama", tglUTJ: "Tgl UTJ", tglSPR: "Tgl SPR", caraBayar: "Cara bayar", hargaJual: "Harga jual", diskonPPN: "Diskon PPN", diskonTusukSate: "Diskon Tusuk Sate", diskonKhusus: "Diskon Khusus", hargaTransaksi: "Harga transaksi", utj: "UTJ", totalUM: "Uang muka", plafond: "Plafond", accBank: "Nominal ACC", tum: "TUM", tglAkad: "Tgl akad", tempatAkad: "Tempat akad", notaris: "Notaris", progressBangun: "Progres bangun", ajb: "AJB", tglAJB: "Tgl AJB", stu: "STU", tglSTU: "Tgl STU", berkas: "Berkas", legal: "Legal & pajak", bankProses: "Bank" };
const FL_RET: Record<string, string> = { nama: "Nama", pembayaran: "Pembayaran", nilaiKPRAccBank: "Nilai KPR ACC bank", totalDiterimAwal: "Total diterima awal", ret: "Retensi", bank: "Bank", notaris: "Notaris", keterangan: "Keterangan" };
const isEmptyV = (v: unknown) => v === "" || v == null || v === 0 || v === false;
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

// Bentuk kanonik: kunci objek diurutkan agar urutan kunci tidak dianggap perubahan.
const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Rec).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, canon(x)])) : v;
function nz(v: unknown): unknown {
  if (Array.isArray(v)) return v.length ? JSON.stringify(canon(v)) : null;
  if (v && typeof v === "object") { const e = Object.entries(v as Rec).filter(([, x]) => !isEmptyV(x)).sort(([a], [b]) => (a < b ? -1 : 1)); return e.length ? JSON.stringify(e) : null; }
  return isEmptyV(v) ? null : v;
}
const diffKeys = (a: Rec, b: Rec, labels: Record<string, string>) => Object.keys(labels).filter(k => nz(a[k]) !== nz(b[k]));
function fv(k: string, v: unknown): string {
  if (v == null || v === "" || v === 0 || v === false) return "kosong";
  if (v === true) return "ya";
  if (typeof v === "number") return k === "progressBangun" ? Math.round(v * 100) + "%" : Math.abs(v) >= 1e6 ? juta(v) : String(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return tgl(v);
  if (typeof v === "string") return v.length > 28 ? v.slice(0, 27) + "…" : v;
  return "";
}

const KPR_SCALAR = ["unit", "nama", "tglUTJ", "tglSPR", "caraBayar", "hargaJual", "diskonPPN", "diskonTusukSate", "diskonKhusus", "totalDiskon", "hargaTransaksi", "utj", "totalUM", "plafond", "accBank", "tum", "tglAkad", "tempatAkad", "notaris", "progressBangun", "tglAJB", "tglSTU"];
export function mergeKPR(old: Kpr, x: KprImport, ow: boolean): Kpr {
  const m = clone(old) as unknown as Rec, o = old as unknown as Rec, xr = x as unknown as Rec;
  KPR_SCALAR.forEach(k => { if (ow || !isEmptyV(xr[k])) m[k] = xr[k]; });
  if (ow || x.ajb) m.ajb = x.ajb;
  if (ow || x.stu) m.stu = x.stu;
  for (const g of ["berkas", "legal"] as const) {
    const xg = (xr[g] ?? {}) as Record<string, boolean>, og = (o[g] ?? {}) as Record<string, boolean>;
    m[g] = ow ? { ...xg } : Object.fromEntries(Object.keys(xg).map(k => [k, !!(og[k] || xg[k])]));
  }
  const have = new Set((old.bankProses ?? []).map(b => normBank(b.bank)));
  const bp = [...(old.bankProses ?? [])];
  (x.bankProses ?? []).forEach(b => { if (!have.has(normBank(b.bank))) { bp.push({ ...b }); have.add(normBank(b.bank)); } });
  m.bankProses = bp;
  if (!m.ord) m.ord = x.ord;
  return m as unknown as Kpr;
}
export function mergeRet(old: Retensi, x: RetImport, ow: boolean) {
  const m = clone(old) as unknown as Rec, xr = x as unknown as Rec;
  ["nama", "pembayaran", "nilaiKPRAccBank", "totalDiterimAwal", "bank", "notaris", "keterangan"].forEach(k => { if (ow || !isEmptyV(xr[k])) m[k] = xr[k]; });
  let skipped = false;
  if (!(old.cair ?? []).length) m.ret = { ...x.ret };
  else if (nz(old.ret) !== nz(x.ret)) skipped = true;
  return { m: m as unknown as Retensi, skipped };
}

export interface PlanItem { label: string; sub: string; baru?: boolean; ch: { l: string; a: string; b: string }[] }
export interface Write { table: "kpr" | "retensi"; id: string | null; rec: Kpr | Retensi }
export interface Plan { news: PlanItem[]; upd: PlanItem[]; same: number; skipped: number; writes: Write[] }

export function planKpr(existing: Kpr[], items: KprImport[], ow: boolean): Plan {
  const plan: Plan = { news: [], upd: [], same: 0, skipped: 0, writes: [] };
  // Unit kembar diperlakukan terpisah menurut urutan.
  const keyed = (list: { unit: string; ord?: number }[], ordered: boolean) => {
    const c: Record<string, number> = {}, m = new Map<string, (typeof list)[number]>();
    (ordered ? [...list].sort((a, b) => (a.ord || 0) - (b.ord || 0)) : list).forEach(r => { const u = normUnit(r.unit); c[u] = (c[u] ?? 0) + 1; m.set(c[u] > 1 ? u + "#" + c[u] : u, r); });
    return m;
  };
  const idx = keyed(existing, true) as Map<string, Kpr>, seen = keyed(items, false) as Map<string, KprImport>;
  seen.forEach((x, key) => {
    const old = idx.get(key);
    if (!old) { plan.news.push({ label: x.unit, sub: titleCase(x.nama), baru: true, ch: [] }); plan.writes.push({ table: "kpr", id: null, rec: { ...x, id: "", tglACC: "" } }); return; }
    const m = mergeKPR(old, x, ow), ch = diffKeys(old as unknown as Rec, m as unknown as Rec, FL_KPR);
    if (!ch.length) { plan.same++; return; }
    plan.upd.push({ label: old.unit, sub: titleCase(m.nama), ch: ch.map(k => ({ l: FL_KPR[k], a: fv(k, (old as unknown as Rec)[k]), b: fv(k, (m as unknown as Rec)[k]) })) });
    plan.writes.push({ table: "kpr", id: old.id, rec: m });
  });
  return plan;
}

export function planRet(existing: Retensi[], items: RetImport[], ow: boolean): Plan {
  const plan: Plan = { news: [], upd: [], same: 0, skipped: 0, writes: [] };
  const idx = new Map(existing.map(r => [String(r.blok).trim().toUpperCase(), r]));
  const seen = new Map(items.map(x => [x.blok.trim().toUpperCase(), x]));
  const maxOrd = existing.reduce((m, r) => Math.max(m, numv(r.ord)), 0);
  seen.forEach((x, key) => {
    const old = idx.get(key);
    if (!old) { plan.news.push({ label: x.blok, sub: titleCase(x.nama), baru: true, ch: [] }); plan.writes.push({ table: "retensi", id: null, rec: { ...x, id: "", cair: [], ord: maxOrd + plan.news.length } }); return; }
    const { m, skipped } = mergeRet(old, x, ow);
    if (skipped) plan.skipped++;
    const ch = diffKeys(old as unknown as Rec, m as unknown as Rec, FL_RET);
    if (!ch.length) { plan.same++; return; }
    plan.upd.push({ label: old.blok, sub: titleCase(m.nama), ch: ch.map(k => ({ l: FL_RET[k], a: k === "ret" ? "" : fv(k, (old as unknown as Rec)[k]), b: k === "ret" ? "" : fv(k, (m as unknown as Rec)[k]) })) });
    plan.writes.push({ table: "retensi", id: old.id, rec: m });
  });
  return plan;
}
