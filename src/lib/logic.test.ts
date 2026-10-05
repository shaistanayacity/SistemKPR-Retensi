import { describe, expect, it } from "vitest";
import { berkasScore, retSisa, retStatus, status } from "./logic";
import type { Kpr, Retensi } from "./types";

const base: Kpr = { id: "1", ord: 1, unit: "A-01", nama: "Budi", caraBayar: "KPR" };

describe("status KPR", () => {
  it("Non KPR bila cara bayar tidak mengandung KPR", () => expect(status({ ...base, caraBayar: "Hardcash" })).toBe("Non KPR"));
  it("Sudah Akad bila ada tanggal akad", () => expect(status({ ...base, tglAkad: "2024-01-01" })).toBe("Sudah Akad"));
  it("ACC Bank lewat tanggal, nominal, atau hasil bank", () => {
    expect(status({ ...base, tglACC: "2024-01-01" })).toBe("ACC Bank");
    expect(status({ ...base, accBank: 1 })).toBe("ACC Bank");
    expect(status({ ...base, bankProses: [{ bank: "BTN", tgl: "", ket: "", hasil: "ACC" }] })).toBe("ACC Bank");
  });
  it("Proses Bank bila ada data bank", () => expect(status({ ...base, bankProses: [{ bank: "BTN", tgl: "", ket: "", hasil: "Diajukan" }] })).toBe("Proses Bank"));
  it("Pemberkasan sebagai default", () => expect(status(base)).toBe("Pemberkasan"));
});

describe("kelengkapan berkas", () => {
  it("karyawan butuh 7 dokumen", () => expect(berkasScore(base).need).toBe(7));
  it("wiraswasta butuh 7 dokumen dengan NIB", () => {
    const s = berkasScore({ ...base, jenisPekerjaan: "Wiraswasta", berkas: { ktp: true, nib: true } });
    expect(s.need).toBe(7);
    expect(s.have).toBe(2);
  });
});

describe("retensi", () => {
  const r: Retensi = { id: "1", ord: 1, blok: "A-01", nama: "Budi", ret: { bangunan: 100, ajb: 50 }, cair: [{ tgl: "2024-01-01", nominal: 150 }] };
  it("sisa = awal - cair", () => expect(retSisa({ ...r, cair: [{ tgl: "", nominal: 40 }] })).toBe(110));
  it("Lunas otomatis saat sisa nol", () => expect(retStatus(r)).toBe("Lunas"));
});

import { emptyKprFilter, emptyRetFilter, kprRows, retRows } from "./logic";

describe("filter", () => {
  const rows: Kpr[] = [
    { id: "1", ord: 1, unit: "A-01", nama: "Budi", caraBayar: "KPR", tglUTJ: "2024-01-05" },
    { id: "2", ord: 2, unit: "B-02", nama: "Sari", caraBayar: "KPR", tglUTJ: "2024-03-10", tglAkad: "2024-04-01", tempatAkad: "BTN Cabang" },
    { id: "3", ord: 3, unit: "C-03", nama: "Andi", caraBayar: "Hardcash", tglUTJ: "2023-12-01" },
  ];
  it("belum akad hanya Pemberkasan/Proses/ACC", () => expect(kprRows(rows, { ...emptyKprFilter, status: "belum" }).map(r => r.unit)).toEqual(["A-01"]));
  it("urutan default: UTJ terbaru dulu", () => expect(kprRows(rows, emptyKprFilter).map(r => r.unit)).toEqual(["B-02", "A-01", "C-03"]));
  it("filter tahun UTJ dan cari nama", () => {
    expect(kprRows(rows, { ...emptyKprFilter, year: "2023" }).map(r => r.unit)).toEqual(["C-03"]);
    expect(kprRows(rows, { ...emptyKprFilter, q: "sari" }).map(r => r.unit)).toEqual(["B-02"]);
  });
  it("filter bank memakai merek", () => expect(kprRows(rows, { ...emptyKprFilter, bank: "BTN" }).map(r => r.unit)).toEqual(["B-02"]));
  it("rentang tanggal akad", () => expect(kprRows(rows, { ...emptyKprFilter, dtb: "akad", d1: "2024-04-01", d2: "2024-04-30" }).map(r => r.unit)).toEqual(["B-02"]));
  it("retensi: urut blok natural dan filter tanggal cair", () => {
    const ret: Retensi[] = [
      { id: "a", ord: 1, blok: "A-10", nama: "X", ret: { bangunan: 10 }, cair: [{ tgl: "2024-05-01", nominal: 5 }] },
      { id: "b", ord: 2, blok: "A-2", nama: "Y", ret: { bangunan: 10 } },
    ];
    expect(retRows(ret, emptyRetFilter).map(r => r.blok)).toEqual(["A-2", "A-10"]);
    expect(retRows(ret, { ...emptyRetFilter, d1: "2024-05-01", d2: "2024-05-31" }).map(r => r.blok)).toEqual(["A-10"]);
  });
});
