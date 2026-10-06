import { describe, expect, it } from "vitest";
import { berkasScore, plafondOtomatis, retSisaPersen, progresBank, rapikanBank, sinkronBank, hargaTransaksiOtomatis, retPersen, retSisa, retStatus, status, totalDiskon } from "./logic";
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
    const s = berkasScore({ ...base, jenisPekerjaan: "Wiraswasta", berkas: { ktp: true, nibSkdu: true } });
    expect(s.need).toBe(7);
    expect(s.have).toBe(2);
  });
});

describe("retensi", () => {
  const r: Retensi = { id: "1", ord: 1, blok: "A-01", nama: "Budi", ret: { bangunan: 100, ajb: 50 }, cair: [{ tgl: "2024-01-01", nominal: 150 }] };
  it("sisa = awal - cair", () => expect(retSisa({ ...r, cair: [{ tgl: "", nominal: 40 }] })).toBe(110));
  it("Lunas otomatis saat sisa nol", () => expect(retStatus(r)).toBe("Lunas"));
  it("Ada sisa bila belum habis dicairkan", () => expect(retStatus({ ...r, cair: [] })).toBe("Ada sisa"));
  it("persen pencairan KPR otomatis dari total diterima awal", () => expect(retPersen({ ...r, nilaiKPRAccBank: 1000, totalDiterimAwal: 750 })).toBe(0.75));
  it("persen nol bila nilai KPR ACC kosong", () => expect(retPersen(r)).toBe(0));
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

import { lastMonths, perMonth } from "./logic";
describe("deret bulanan", () => {
  const months = lastMonths(3, new Date(2026, 9, 5));
  it("tiga bulan terakhir berurutan", () => expect(months.map(m => m.key)).toEqual(["2026-08", "2026-09", "2026-10"]));
  it("menghitung dan menjumlah per bulan", () => {
    expect(perMonth([{ tgl: "2026-09-02" }, { tgl: "2026-09-20" }, { tgl: "2025-01-01" }], months)).toEqual([0, 2, 0]);
    expect(perMonth([{ tgl: "2026-10-01", v: 5 }, { tgl: "2026-10-09", v: 7 }], months)).toEqual([0, 0, 12]);
  });
  it("lintas tahun", () => expect(lastMonths(3, new Date(2026, 0, 15)).map(m => m.key)).toEqual(["2025-11", "2025-12", "2026-01"]));
});

import { windowEnd } from "./logic";
describe("jendela grafik", () => {
  const now = new Date(2026, 9, 5);
  it("berakhir pada data terbaru yang tidak melewati hari ini", () => {
    expect(lastMonths(2, windowEnd(["2026-02-10", "2025-05-01", "2027-01-01"], now)).map(m => m.key)).toEqual(["2026-01", "2026-02"]);
  });
  it("tanpa data memakai bulan ini", () => expect(lastMonths(1, windowEnd([], now))[0].key).toBe("2026-10"));
});

import { bankDariKpr, kprKeRetensi, normUnit } from "./logic";
describe("hubungan KPR ke Retensi", () => {
  const k: Kpr = { id: "k1", ord: 1, unit: "F1-01", nama: "Dwiki Anggara", caraBayar: "KPR", accBank: 760000000, notaris: "HAIRUR", tglAkad: "2026-03-02", tempatAkad: "BTN SIDOARJO" };
  it("mengisi nama (huruf besar), bank, notaris, nilai KPR, cara bayar, tanggal akad", () => {
    const x = kprKeRetensi(k);
    expect(x).toMatchObject({ kprId: "k1", blok: "F1-01", nama: "DWIKI ANGGARA", pembayaran: "KPR", bank: "BTN SIDOARJO", notaris: "HAIRUR", nilaiKPRAccBank: 760000000, tglAkad: "2026-03-02" });
    expect(x.kosong).toEqual([]);
  });
  it("tempat akad yang bukan bank tidak dianggap bank", () => expect(bankDariKpr({ ...k, tempatAkad: "Kantor Notaris" })).toBe(""));
  it("bank yang ACC didahulukan", () => expect(bankDariKpr({ ...k, bankProses: [{ bank: "BRI SDA", tgl: "", ket: "", hasil: "ACC" }] })).toBe("BRI SDA"));
  it("kolom yang kosong di KPR dilaporkan dan tidak ditimpa", () => {
    const x = kprKeRetensi({ id: "k2", ord: 2, unit: "A-01", nama: "Budi", caraBayar: "KPR" });
    expect(x.kosong).toEqual(["bank", "notaris", "nilai KPR ACC bank", "tanggal akad"]);
    expect("bank" in x).toBe(false);
  });
  it("kunci unit mengabaikan spasi dan huruf kecil", () => expect(normUnit(" f1 - 01 ")).toBe("F1-01"));
});

describe("harga & diskon", () => {
  it("harga transaksi = harga jual - total diskon", () => {
    const k: Kpr = { ...base, hargaJual: 1000, diskonPPN: 100, diskonTusukSate: 50, diskonKhusus: 25 };
    expect(totalDiskon(k)).toBe(175);
    expect(hargaTransaksiOtomatis(k)).toBe(825);
  });
  it("tanpa harga jual memakai harga transaksi tersimpan", () => expect(hargaTransaksiOtomatis({ ...base, hargaTransaksi: 500 })).toBe(500));
});

describe("proses bank dengan riwayat per bank", () => {
  const b = (bank: string, tgl: string, hasil: string, ket = "") => ({ bank, tgl, hasil, ket });
  it("data lama (satu kondisi) menjadi satu progres", () => expect(progresBank(b("BNI", "2026-10-05", "Diajukan", "a"))).toEqual([{ tgl: "2026-10-05", hasil: "Diajukan", ket: "a" }]));
  it("riwayat lama ditambah kondisi terkini menjadi progres berurutan", () => {
    const x = { ...b("BNI", "2026-10-06", "Proses"), riwayat: [{ tgl: "2026-10-05", hasil: "Diajukan", ket: "" }] };
    expect(progresBank(x).map(p => p.hasil)).toEqual(["Diajukan", "Proses"]);
  });
  it("kondisi terkini mengikuti progres terakhir", () => {
    const x = sinkronBank({ ...b("BNI", "", ""), progres: [{ tgl: "2026-10-01", hasil: "Diajukan", ket: "masuk" }, { tgl: "2026-10-09", hasil: "ACC", ket: "SP3K" }] });
    expect(x).toMatchObject({ tgl: "2026-10-09", hasil: "ACC", ket: "SP3K" });
    expect(x.riwayat).toBeUndefined();
  });
  it("baris ganda bank yang sama digabung dan progresnya disambung", () => {
    const r = rapikanBank([b("BNI", "2026-10-05", "Diajukan"), b("BTN", "", ""), b("bni ", "2026-10-06", "Proses")]);
    expect(r.map(x => x.bank)).toEqual(["BNI", "BTN"]);
    expect(r[0].progres?.map(p => p.hasil)).toEqual(["Diajukan", "Proses"]);
    expect(r[0].hasil).toBe("Proses");
  });
  it("status ACC Bank mengikuti hasil terakhir bank", () => {
    const x = rapikanBank([{ ...b("BNI", "", ""), progres: [{ tgl: "1", hasil: "Diajukan", ket: "" }, { tgl: "2", hasil: "ACC", ket: "" }] }]);
    expect(status({ ...base, bankProses: x })).toBe("ACC Bank");
  });
});

describe("plafond otomatis dan persen sisa retensi", () => {
  it("plafond = harga transaksi - UTJ - uang muka", () => expect(plafondOtomatis({ ...base, hargaJual: 1000, diskonPPN: 100, utj: 50, totalUM: 150 })).toBe(700));
  it("tanpa harga transaksi memakai plafond tersimpan", () => expect(plafondOtomatis({ ...base, plafond: 321 })).toBe(321));
  it("plafond tidak negatif", () => expect(plafondOtomatis({ ...base, hargaTransaksi: 100, totalUM: 500 })).toBe(0));
  it("persen sisa retensi dari nilai KPR ACC bank, bukan retensi awal", () => {
    const r: Retensi = { id: "1", ord: 1, blok: "A", nama: "B", nilaiKPRAccBank: 1000, ret: { bangunan: 100 }, cair: [{ tgl: "", nominal: 40 }] };
    expect(retSisaPersen(r)).toBe(0.06);
  });
  it("persen sisa nol bila nilai KPR ACC kosong", () => expect(retSisaPersen({ id: "1", ord: 1, blok: "A", nama: "B", ret: { bangunan: 100 } })).toBe(0));
});
