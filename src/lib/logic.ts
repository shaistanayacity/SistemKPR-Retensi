// Logika bisnis dari purwarupa (lihat CLAUDE.md). Jangan diubah tanpa konfirmasi.
import { BankProses, BankRiwayat, Kpr, RET_KOMP, Retensi } from "./types";

export type KprStatus = "Pemberkasan" | "Proses Bank" | "ACC Bank" | "Sudah Akad" | "Non KPR";

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export const isKPR = (r: Pick<Kpr, "caraBayar">) => /KPR/i.test(r.caraBayar ?? "");

export function status(r: Kpr): KprStatus {
  if (!isKPR(r)) return "Non KPR";
  if (r.tglAkad) return "Sudah Akad";
  if (r.tglACC || num(r.accBank) > 0 || (r.bankProses ?? []).some(b => b.hasil === "ACC")) return "ACC Bank";
  if ((r.bankProses ?? []).length) return "Proses Bank";
  return "Pemberkasan";
}

export const isBelumAkad = (r: Kpr) => ["Pemberkasan", "Proses Bank", "ACC Bank"].includes(status(r));

export const jenis = (r: Kpr) =>
  r.jenisPekerjaan || ((r.berkas?.nibSkdu || r.berkas?.lapkeu) && !r.berkas?.slip3 ? "Wiraswasta" : "Karyawan");

type DocKey = keyof NonNullable<Kpr["berkas"]>;

export function berkasNeed(r: Kpr): DocKey[] {
  const core: DocKey[] = ["ktp", "npwp", "kk", "akta"];
  if (!isKPR(r)) return core;
  return core.concat(jenis(r) === "Wiraswasta" ? ["rk6", "nibSkdu", "lapkeu"] : ["rk3", "suket", "slip3"]);
}

export function berkasScore(r: Kpr) {
  const need = berkasNeed(r);
  const missing = need.filter(k => !r.berkas?.[k]);
  return { have: need.length - missing.length, need: need.length, missing: missing.map(k => DOCS[k]) };
}

/** Jumlah rincian per kategori (bangunan, AJB, dst). */
export const retKomponen = (r: Retensi) => RET_KOMP.reduce((a, k) => a + num(r.ret?.[k]), 0);
/** Retensi awal = nilai KPR ACC bank - total diterima awal; bila salah satunya belum diisi memakai jumlah rincian kategori. */
export const retAwal = (r: Retensi) => (num(r.nilaiKPRAccBank) > 0 && num(r.totalDiterimAwal) > 0 ? Math.max(0, num(r.nilaiKPRAccBank) - num(r.totalDiterimAwal)) : retKomponen(r));
export const retCair = (r: Retensi) => (r.cair ?? []).reduce((a, c) => a + num(c.nominal), 0);
export const retSisa = (r: Retensi) => retAwal(r) - retCair(r);
export const retStatus = (r: Retensi) => (retAwal(r) <= 0 ? "" : retSisa(r) <= 0 ? "Lunas" : "Ada sisa");

// ---- Turunan tambahan (dari purwarupa) ----
import { brand, DOCS, isBankName, kompShort, natural, tgl } from "./format";

export const retNilai = (r: Retensi) => num(r.nilaiKPRAccBank);
export const retTerima = (r: Retensi) => num(r.totalDiterimAwal);
/** Persen yang ditahan bank: (nilai KPR ACC bank - total diterima awal) dibagi nilai KPR ACC bank (otomatis). */
export const retPersen = (r: Retensi) => (retNilai(r) > 0 ? Math.max(0, (retNilai(r) - retTerima(r)) / retNilai(r)) : 0);

/** Total diskon = jumlah tiga kategori; harga transaksi = harga jual - total diskon (bila harga jual diisi). */
export const totalDiskon = (r: Kpr) => num(r.diskonPPN) + num(r.diskonTusukSate) + num(r.diskonKhusus);
export const hargaTransaksiOtomatis = (r: Kpr) => (num(r.hargaJual) > 0 ? num(r.hargaJual) - totalDiskon(r) : num(r.hargaTransaksi));
/** Plafond KPR = harga transaksi - UTJ - uang muka (bila harga transaksi belum ada, memakai plafond tersimpan). */
export const plafondOtomatis = (r: Kpr) => { const h = hargaTransaksiOtomatis(r); return h > 0 ? Math.max(0, h - num(r.utj) - num(r.totalUM)) : num(r.plafond); };
/** Sisa retensi terhadap nilai KPR ACC bank (0 bila nilai KPR ACC belum diisi). */
export const retSisaPersen = (r: Retensi) => (retNilai(r) > 0 ? retSisa(r) / retNilai(r) : 0);
export const compSisa = (r: Retensi, k: string) =>
  num(r.ret?.[k as keyof NonNullable<Retensi["ret"]>]) - (r.cair ?? []).filter(c => c.komponen === k).reduce((a, c) => a + num(c.nominal), 0);
export const cairSorted = (r: Retensi) => [...(r.cair ?? [])].sort((a, b) => String(a.tgl).localeCompare(String(b.tgl)));

const kunciBank = (s?: string) => String(s ?? "").replace(/\s+/g, " ").trim().toUpperCase();
/** Seluruh progres sebuah bank, berurutan. Data lama (tanpa `progres`) dibentuk dari riwayat lama + kondisi terkini. */
export const progresBank = (b: BankProses): BankRiwayat[] =>
  b.progres?.length ? b.progres : [...(b.riwayat ?? []), ...(b.tgl || b.hasil || b.ket ? [{ tgl: b.tgl, hasil: b.hasil, ket: b.ket }] : [])];
/** Samakan tgl/hasil/ket dengan progres terakhir dan buang `riwayat` lama. */
export function sinkronBank(b: BankProses): BankProses {
  const progres = progresBank(b), last = progres[progres.length - 1];
  const { riwayat: _lama, ...rest } = b;
  return { ...rest, progres, tgl: last?.tgl ?? "", hasil: last?.hasil ?? "", ket: last?.ket ?? "" };
}
/** Satu entri per bank: baris ganda bank yang sama digabung (progresnya disambung), lalu disinkronkan. */
export function rapikanBank(list: BankProses[] = []): BankProses[] {
  const out: BankProses[] = [], idx = new Map<string, number>();
  for (const b of list) {
    const k = kunciBank(b.bank);
    if (k && idx.has(k)) { const i = idx.get(k)!; out[i] = { ...out[i], progres: [...progresBank(out[i]), ...progresBank(b)] }; continue; }
    if (k) idx.set(k, out.length);
    out.push({ ...b });
  }
  return out.map(sinkronBank);
}

export const accBankName = (r: Kpr) => (r.bankProses ?? []).find(b => b.hasil === "ACC")?.bank ?? "";
export const kprBrand = (r: Kpr) => brand(r.tempatAkad) || brand(accBankName(r));
export const kprBanks = (r: Kpr) => {
  const s = new Set((r.bankProses ?? []).map(b => brand(b.bank)).filter(Boolean));
  const t = brand(r.tempatAkad);
  if (t) s.add(t);
  return [...s];
};

export function followUp(r: Kpr): string {
  const st = status(r), bp = r.bankProses ?? [], last = bp[bp.length - 1];
  if (st === "ACC Bank") { const a = bp.find(b => b.hasil === "ACC"); return `ACC ${a ? brand(a.bank) : "bank"}${r.tglACC ? " " + tgl(r.tglACC) : ""} · jadwalkan akad`; }
  if (st === "Proses Bank") {
    if (last && (last.hasil === "Ditolak" || last.hasil === "Batal")) return `${last.hasil} ${brand(last.bank)} · ajukan ke bank lain`;
    return `Menunggu hasil ${brand(last?.bank) || "bank"}${last?.tgl ? " sejak " + tgl(last.tgl) : ""}${last?.ket ? " · " + last.ket : ""}`;
  }
  const sc = berkasScore(r);
  return sc.missing.length ? `Kurang ${sc.missing.join(", ")}` : "Berkas lengkap · belum diajukan ke bank";
}

// ---- Filter ----
export interface KprFilter { q: string; year: string; status: string; bank: string; bayar: string; sort: string; dtb: string; d1: string; d2: string }
export interface RetFilter { q: string; status: string; bank: string; notaris: string; sort: string; d1: string; d2: string }
export const emptyKprFilter: KprFilter = { q: "", year: "", status: "", bank: "", bayar: "", sort: "baru", dtb: "utj", d1: "", d2: "" };
export const emptyRetFilter: RetFilter = { q: "", status: "", bank: "", notaris: "", sort: "blok", d1: "", d2: "" };

const inRange = (d: string, a: string, b: string) => !!d && (!a || d >= a) && (!b || d <= b);
const anyIn = (arr: { tgl?: string }[] | undefined, a: string, b: string) => (arr ?? []).some(x => inRange(String(x.tgl ?? "").slice(0, 10), a, b));

function kprDateOK(r: Kpr, f: KprFilter) {
  if (!f.d1 && !f.d2) return true;
  const g = (k: keyof Kpr) => String(r[k] ?? "").slice(0, 10);
  switch (f.dtb) {
    case "spr": return inRange(g("tglSPR"), f.d1, f.d2);
    case "acc": return inRange(g("tglACC"), f.d1, f.d2);
    case "akad": return inRange(g("tglAkad"), f.d1, f.d2);
    case "bank": return anyIn(r.bankProses, f.d1, f.d2);
    default: return inRange(g("tglUTJ"), f.d1, f.d2);
  }
}

export function kprRows(all: Kpr[], f: KprFilter): Kpr[] {
  const q = f.q.trim().toLowerCase();
  return all.filter(r => {
    if (q && !`${r.nama} ${r.unit}`.toLowerCase().includes(q)) return false;
    if (f.year && String(r.tglUTJ ?? "").slice(0, 4) !== f.year) return false;
    const st = status(r);
    if (f.status === "belum") { if (!isBelumAkad(r)) return false; }
    else if (f.status && st !== f.status) return false;
    if (!kprDateOK(r, f)) return false;
    if (f.bank && !kprBanks(r).includes(f.bank)) return false;
    if (f.bayar && (r.caraBayar ?? "").toUpperCase() !== f.bayar) return false;
    return true;
  }).sort((a, b) => {
    const ua = String(a.tglUTJ ?? ""), ub = String(b.tglUTJ ?? "");
    if (f.sort === "unit") return natural(a.unit, b.unit);
    if (f.sort === "lama") return (ua || "9999").localeCompare(ub || "9999") || num(a.ord) - num(b.ord);
    if (f.sort === "diubah") return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")) || ub.localeCompare(ua) || num(b.ord) - num(a.ord);
    return ub.localeCompare(ua) || num(b.ord) - num(a.ord);
  });
}

export function retRows(all: Retensi[], f: RetFilter): Retensi[] {
  const q = f.q.trim().toLowerCase();
  return all.filter(r => {
    if (q && !`${r.nama} ${r.blok}`.toLowerCase().includes(q)) return false;
    if (f.status && retStatus(r) !== f.status) return false;
    if (f.bank && (r.bank ?? "") !== f.bank) return false;
    if (f.notaris && (r.notaris ?? "") !== f.notaris) return false;
    if ((f.d1 || f.d2) && !anyIn(r.cair, f.d1, f.d2)) return false;
    return true;
  }).sort((a, b) => {
    if (f.sort === "sisa") return retSisa(b) - retSisa(a) || natural(a.blok, b.blok);
    if (f.sort === "diubah") { const la = (x: Retensi) => String([x.updatedAt ?? "", ...(x.cair ?? []).map(c => c.tgl ?? "")].sort().pop()); return la(b).localeCompare(la(a)) || natural(a.blok, b.blok); }
    return natural(a.blok, b.blok);
  });
}
export { kompShort };

// ---- Deret bulanan untuk grafik ----
export function lastMonths(n: number, now = new Date()): { key: string; label: string }[] {
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: BLN[d.getMonth()] };
  });
}
/** Tanggal data terbaru yang tidak melewati hari ini; dipakai sebagai akhir jendela grafik. */
export function windowEnd(dates: (string | undefined)[], now = new Date()): Date {
  const iso = now.toISOString().slice(0, 10);
  const latest = dates.filter((d): d is string => !!d && d <= iso).sort().pop();
  return latest ? new Date(+latest.slice(0, 4), +latest.slice(5, 7) - 1, 1) : now;
}
/** Jumlah (atau total nominal) per bulan untuk daftar {tgl, nilai}. */
export function perMonth(items: { tgl?: string; v?: number }[], months: { key: string }[]): number[] {
  const m = new Map(months.map(x => [x.key, 0]));
  items.forEach(i => { const k = String(i.tgl ?? "").slice(0, 7); if (m.has(k)) m.set(k, (m.get(k) ?? 0) + (i.v ?? 1)); });
  return months.map(x => m.get(x.key) ?? 0);
}

// ---- Hubungan KPR -> Retensi ----
/** Kunci pencocokan unit/blok: huruf besar, spasi di sekitar "-" diabaikan. */
export const normUnit = (s?: string) => String(s ?? "").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim().toUpperCase();

/** Bank untuk retensi: bank yang ACC, atau tempat akad bila itu memang bank. */
export const bankDariKpr = (r: Kpr) => accBankName(r) || (isBankName(r.tempatAkad) ? r.tempatAkad ?? "" : "");

/** Isian Retensi yang bisa diambil dari unit KPR. Hanya kolom yang ada nilainya; semuanya tetap bisa diubah manual. */
export function kprKeRetensi(r: Kpr): Partial<Retensi> & { kosong: string[] } {
  const out: Partial<Retensi> = { kprId: r.id, blok: r.unit, nama: String(r.nama ?? "").toUpperCase() };
  const kosong: string[] = [];
  const set = <K extends keyof Retensi>(k: K, v: Retensi[K] | undefined, label: string) => { if (v === undefined || v === "" || v === 0) kosong.push(label); else out[k] = v; };
  set("pembayaran", r.caraBayar, "cara bayar");
  set("bank", bankDariKpr(r), "bank");
  set("notaris", r.notaris, "notaris");
  set("nilaiKPRAccBank", num(r.accBank), "nilai KPR ACC bank");
  set("tglAkad", r.tglAkad, "tanggal akad");
  return { ...out, kosong };
}
