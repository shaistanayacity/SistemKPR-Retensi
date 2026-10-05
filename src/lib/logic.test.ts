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
