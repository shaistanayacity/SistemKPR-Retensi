import { describe, expect, it } from "vitest";
import { planKpr, planRet, xd, KprImport, RetImport } from "./importExcel";
import type { Kpr, Retensi } from "./types";

describe("tanggal Excel", () => {
  it("serial Excel", () => expect(xd(45000)).toBe("2023-03-15"));
  it("teks Indonesia dan dd/mm/yy", () => {
    expect(xd("31 Agustus 2023")).toBe("2023-08-31");
    expect(xd("31/8/23")).toBe("2023-08-31");
  });
  it("kosong atau tidak dikenal", () => { expect(xd("")).toBe(""); expect(xd("abc")).toBe(""); });
});

const ex = (id: string, unit: string, nama: string, extra: Partial<Kpr> = {}): Kpr => ({ id, ord: 1, unit, nama, caraBayar: "KPR", berkas: { ktp: true }, legal: {}, bankProses: [], pencairan: [], ...extra });
const item = (unit: string, nama: string, extra: Partial<KprImport> = {}): KprImport => ({ ord: 1, unit, nama, caraBayar: "KPR", berkas: { ktp: true }, legal: {}, bankProses: [], pencairan: [], ...extra });

describe("rencana impor KPR", () => {
  it("unit baru ditambahkan", () => {
    const p = planKpr([], [item("A-01", "Budi")], false);
    expect(p.news).toHaveLength(1);
    expect(p.writes[0].id).toBeNull();
  });
  it("mengulang impor yang sama tidak mengubah apa pun", () => {
    const existing = planKpr([], [item("A-01", "Budi", { plafond: 100, tglUTJ: "2024-01-01" })], false).writes.map((w, i) => ({ ...(w.rec as Kpr), id: "id" + i }));
    const again = planKpr(existing, [item("A-01", "Budi", { plafond: 100, tglUTJ: "2024-01-01" })], false);
    expect(again.same).toBe(1);
    expect(again.writes).toHaveLength(0);
  });
  it("spasi sekitar tanda hubung dan huruf besar diabaikan", () => {
    const existing = [ex("1", "A-01", "Budi")];
    expect(planKpr(existing, [item("a - 01", "Budi")], false).news).toHaveLength(0);
  });
  it("unit kembar menurut urutan jadi dua data", () => {
    const existing = [ex("1", "F2-03", "Satu", { ord: 1 }), ex("2", "F2-03", "Dua", { ord: 2 })];
    const p = planKpr(existing, [item("F2-03", "Satu"), item("F2-03", "Dua")], false);
    expect(p.news).toHaveLength(0);
    expect(p.writes).toHaveLength(0);
  });
  it("kolom kosong di Excel tidak menghapus isian, kecuali opsi timpa", () => {
    const existing = [ex("1", "A-01", "Budi", { plafond: 500, keterangan: "catatan manual" })];
    expect(planKpr(existing, [item("A-01", "Budi", { plafond: 0, keterangan: "" })], false).writes).toHaveLength(0);
    expect(planKpr(existing, [item("A-01", "Budi", { plafond: 0, keterangan: "" })], true).writes).toHaveLength(1);
  });
  it("tidak ada yang dihapus", () => {
    const existing = [ex("1", "Z-99", "Lama")];
    expect(planKpr(existing, [item("A-01", "Budi")], false).writes.every(w => w.id !== "1")).toBe(true);
  });
});

describe("rencana impor Retensi", () => {
  const imp = (blok: string, bangunan: number): RetImport => ({ blok, nama: "X", ret: { bangunan } });
  it("retensi tidak ditimpa bila sudah ada riwayat pencairan", () => {
    const existing: Retensi[] = [{ id: "1", ord: 1, blok: "A-01", nama: "X", ret: { bangunan: 10 }, cair: [{ tgl: "2024-01-01", nominal: 5 }] }];
    const p = planRet(existing, [imp("A-01", 99)], false);
    expect(p.skipped).toBe(1);
    expect(p.writes).toHaveLength(0);
  });
  it("blok baru ditambahkan dengan urutan berikutnya", () => {
    const p = planRet([{ id: "1", ord: 7, blok: "A-01", nama: "X" }], [imp("B-01", 5)], false);
    expect(p.news).toHaveLength(1);
    expect((p.writes[0].rec as Retensi).ord).toBe(8);
  });
});
