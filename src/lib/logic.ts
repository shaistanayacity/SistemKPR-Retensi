// Logika bisnis dari purwarupa (lihat CLAUDE.md). Jangan diubah tanpa konfirmasi.
import { Kpr, RET_KOMP, Retensi } from "./types";

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
  r.jenisPekerjaan || ((r.berkas?.nib || r.berkas?.lapkeu) && !r.berkas?.slip ? "Wiraswasta" : "Karyawan");

type DocKey = keyof NonNullable<Kpr["berkas"]>;

export function berkasNeed(r: Kpr): DocKey[] {
  const core: DocKey[] = ["ktp", "npwp", "kk", "akta"];
  if (!isKPR(r)) return core;
  return core.concat(jenis(r) === "Wiraswasta" ? ["rk6", "nib", "lapkeu"] : ["rk3", "suket", "slip"]);
}

export function berkasScore(r: Kpr) {
  const need = berkasNeed(r);
  const missing = need.filter(k => !r.berkas?.[k]);
  return { have: need.length - missing.length, need: need.length, missing };
}

export const retAwal = (r: Retensi) => RET_KOMP.reduce((a, k) => a + num(r.ret?.[k]), 0);
export const retCair = (r: Retensi) => (r.cair ?? []).reduce((a, c) => a + num(c.nominal), 0);
export const retSisa = (r: Retensi) => retAwal(r) - retCair(r);
export const retStatus = (r: Retensi) => (retAwal(r) > 0 && retSisa(r) <= 0 ? "Lunas" : r.status ?? "");
