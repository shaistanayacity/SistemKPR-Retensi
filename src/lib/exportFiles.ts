// Unduhan PDF dan Excel sesuai filter aktif. Pustaka dimuat saat dibutuhkan agar halaman awal tetap ringan.
import { berkasScore, cairSorted, progresBank, compSisa, isKPR, jenis, KprFilter, RetFilter, retAwal, retCair, retNilai, retPersen, retSisa, retStatus, retTerima, status, totalDiskon } from "./logic";
import { DOCS, kompShort, LEGAL, num, RET_LABEL, rp, tgl } from "./format";
import type { Kpr, Retensi } from "./types";

const stamp = () => new Date().toISOString().slice(0, 10);
const today = () => tgl(stamp());

export function kprFilterLabel(f: KprFilter) {
  const p: string[] = [];
  if (f.status) p.push(f.status === "belum" ? "Belum akad" : f.status);
  if (f.bank) p.push("Bank " + f.bank);
  if (f.year) p.push("UTJ " + f.year);
  if (f.d1 || f.d2) p.push(({ utj: "UTJ", spr: "SPR & PPJB", bank: "Proses bank", acc: "ACC", akad: "Akad", cair: "Pencairan" } as Record<string, string>)[f.dtb] + " " + rangeLabel(f.d1, f.d2));
  if (f.bayar) p.push(f.bayar);
  if (f.q) p.push(`Cari "${f.q}"`);
  p.push(({ baru: "berkas terbaru dulu", lama: "berkas terlama dulu", diubah: "terakhir diubah", unit: "unit A–Z" } as Record<string, string>)[f.sort]);
  return p.join(" · ");
}
export function retFilterLabel(f: RetFilter) {
  const p: string[] = [];
  if (f.status) p.push(f.status);
  if (f.bank) p.push(f.bank);
  if (f.notaris) p.push("Notaris " + f.notaris);
  if (f.d1 || f.d2) p.push("Cair " + rangeLabel(f.d1, f.d2));
  if (f.q) p.push(`Cari "${f.q}"`);
  return p.length ? p.join(" · ") : "Semua unit";
}
const rangeLabel = (a: string, b: string) => (a && b ? tgl(a) + " – " + tgl(b) : a ? "sejak " + tgl(a) : "s/d " + tgl(b));

export function save(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

let logoCache: Promise<string | null> | null = null;
/** Logo sebagai data URL untuk disematkan di PDF; null bila gagal dimuat (PDF tetap dibuat tanpa logo). */
function loadLogo(): Promise<string | null> {
  return (logoCache ??= fetch("/logo.png?v=2")
    .then(r => (r.ok ? r.blob() : Promise.reject()))
    .then(b => new Promise<string>((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = no; fr.readAsDataURL(b); }))
    .catch(() => null));
}

async function pdfDoc(title: string, sub: string, head: string[], body: (string | number)[][], foot: (string | number)[], colStyles: Record<number, object>) {
  const { default: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  // Kop: logo di kiri, lalu judul dan keterangan filter di sebelah kanannya.
  const logo = await loadLogo();
  if (logo) doc.addImage(logo, "PNG", 10, 6, 14, 14);
  const tx = logo ? 27 : 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(17); doc.text(title, tx, 12.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100); doc.text(sub, tx, 18);
  autoTable(doc, {
    head: [head], body, foot: [foot], startY: 24, margin: { left: 10, right: 10, bottom: 12 }, theme: "grid",
    styles: { fontSize: 6.6, cellPadding: 1.3, lineColor: [225, 225, 225], lineWidth: 0.15, textColor: [17, 17, 17], valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: "bold", fontSize: 6.8 },
    footStyles: { fillColor: [238, 238, 238], textColor: [20, 24, 28], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 247, 247] }, columnStyles: colStyles, showFoot: "lastPage",
    didDrawPage: d => { doc.setFontSize(7); doc.setTextColor(140); doc.text(`Halaman ${d.pageNumber}`, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 6, { align: "right" }); doc.setTextColor(17); },
  });
  return doc.output("blob");
}

const slug = (f: KprFilter) => (f.status ? "_" + (f.status === "belum" ? "belum-akad" : f.status.toLowerCase().replace(/\s+/g, "-")) : "");

export async function kprPDF(rows: Kpr[], f: KprFilter) {
  const body = rows.map((r, i) => [i + 1, r.unit, r.nama, r.caraBayar ?? "", rp(num(r.hargaTransaksi)), num(r.totalUM) > 0 ? rp(num(r.totalUM)) : "–", isKPR(r) ? rp(num(r.plafond)) : "–",
    (r.bankProses ?? []).map(b => [b.bank, b.tgl && tgl(b.tgl), b.hasil || "Diajukan", b.ket].filter(Boolean).join(" · ")).join("\n") || "–",
    tgl(r.tglACC) || (num(r.accBank) ? "ACC " + rp(num(r.accBank)) : "–"), tgl(r.tglAkad) || "–", r.tempatAkad || "–", r.notaris || "–", tgl(r.tglSPR) || "–",
    ((s) => (s.missing.length ? `${s.have}/${s.need} (kurang: ${s.missing.join(", ")})` : `${s.have}/${s.need} lengkap`))(berkasScore(r)), status(r)]);
  const sumPl = rows.reduce((a, r) => a + (isKPR(r) ? num(r.plafond) : 0), 0), sumH = rows.reduce((a, r) => a + num(r.hargaTransaksi), 0);
  const blob = await pdfDoc("Rekap Berkas KPR", `${kprFilterLabel(f)} · ${rows.length} unit · dicetak ${today()}`,
    ["No", "Unit", "Nama", "Cara Bayar", "Harga Transaksi", "Uang Muka", "Plafond KPR", "Proses Bank (bank · tgl · hasil · ket)", "Tgl ACC", "Tgl Akad", "Tempat Akad", "Notaris", "SPR & PPJB", "Berkas", "Status"],
    body, ["", "", "Total", "", rp(sumH), "", rp(sumPl), "", "", "", "", "", "", "", ""],
    { 0: { cellWidth: 6, halign: "right" }, 1: { cellWidth: 13, fontStyle: "bold" }, 2: { cellWidth: 28 }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { cellWidth: 40 }, 13: { cellWidth: 22 } });
  save(`Berkas_KPR${slug(f)}_${stamp()}.pdf`, blob);
}

export async function retPDF(rows: Retensi[], f: RetFilter) {
  const K = Object.keys(RET_LABEL) as (keyof typeof RET_LABEL)[];
  const body = rows.map((r, i) => [i + 1, r.blok, r.nama, r.bank ?? "", r.notaris ?? "", rp(retNilai(r)), rp(retTerima(r)),
    K.filter(k => num(r.ret?.[k]) > 0).map(k => `${kompShort(k)}: ${rp(num(r.ret?.[k]))}`).join("\n") || "–", rp(retAwal(r)),
    cairSorted(r).map(c => [tgl(c.tgl) || "tanpa tgl", rp(num(c.nominal)), kompShort(c.komponen), c.ket].filter(Boolean).join(" · ")).join("\n") || "Belum ada",
    rp(retCair(r)), rp(retSisa(r)) === "–" ? "0" : rp(retSisa(r)), retStatus(r), r.keterangan ?? ""]);
  const sum = (fn: (r: Retensi) => number) => rp(rows.reduce((a, r) => a + fn(r), 0));
  const blob = await pdfDoc("Rekap Retensi / Escrow", `${retFilterLabel(f)} · ${rows.length} unit · dicetak ${today()}`,
    ["No", "Blok", "Nama", "Bank KPR", "Notaris", "Nilai KPR ACC Bank", "Total Diterima Awal", "Rincian Retensi", "Retensi", "Riwayat Pencairan Retensi", "Sudah Cair", "Total Retensi (Sisa)", "Status", "Keterangan"],
    body, ["", "", "Total", "", "", sum(retNilai), sum(retTerima), "", sum(retAwal), "", sum(retCair), sum(retSisa), "", ""],
    { 0: { cellWidth: 6, halign: "right" }, 1: { fontStyle: "bold", cellWidth: 12 }, 2: { cellWidth: 28 }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { cellWidth: 32 }, 8: { halign: "right" }, 9: { cellWidth: 44 }, 10: { halign: "right" }, 11: { halign: "right", fontStyle: "bold" }, 12: { cellWidth: 22 } });
  save(`Retensi_${stamp()}.pdf`, blob);
}

type Sheet = [string, Record<string, unknown>[], number[]?, string[]?];
async function xlsxBlob(sheets: Sheet[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  sheets.forEach(([name, rows, widths, header]) => {
    const ws = XLSX.utils.json_to_sheet(rows, header ? { header } : undefined);
    if (widths) ws["!cols"] = widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function kprXLS(rows: Kpr[], f: KprFilter) {
  const maxB = Math.max(1, ...rows.map(r => (r.bankProses ?? []).length));
  const data = rows.map((r, i) => {
    const o: Record<string, unknown> = { No: i + 1, Unit: r.unit, Nama: r.nama, Sales: r.sales ?? "", "Kantor Agent": r.kantor ?? "", Status: status(r), "Cara Bayar": r.caraBayar, Pekerjaan: jenis(r), "Tgl UTJ": r.tglUTJ, "Tgl SPR & PPJB": r.tglSPR,
      "Harga Jual": num(r.hargaJual), "Diskon PPN": num(r.diskonPPN), "Diskon Tusuk Sate": num(r.diskonTusukSate), "Diskon Khusus": num(r.diskonKhusus), "Total Diskon": totalDiskon(r), "Harga Transaksi": num(r.hargaTransaksi), UTJ: num(r.utj), "Uang Muka": num(r.totalUM), "Plafond KPR": num(r.plafond) };
    (Object.keys(DOCS) as (keyof typeof DOCS)[]).forEach(k => (o[DOCS[k]] = r.berkas?.[k] ? "Ya" : ""));
    const s = berkasScore(r); o["Berkas Lengkap"] = `${s.have}/${s.need}`;
    for (let j = 0; j < maxB; j++) { const b = (r.bankProses ?? [])[j]; o[`Bank ${j + 1}`] = b?.bank ?? ""; o[`Tgl Bank ${j + 1}`] = b?.tgl ?? ""; o[`Hasil Bank ${j + 1}`] = b?.bank ? b.hasil || "Diajukan" : ""; o[`Ket Bank ${j + 1}`] = b?.ket ?? ""; o[`Riwayat Bank ${j + 1}`] = b ? progresBank(b).map(h => [h.tgl ? tgl(h.tgl) : "tanpa tgl", h.hasil || "Diajukan", h.ket].filter(Boolean).join(" · ")).join(" → ") : ""; }
    Object.assign(o, { "Nominal ACC": num(r.accBank), TUM: num(r.tum), "Tgl ACC": r.tglACC ?? "", "Tgl Akad": r.tglAkad ?? "", "Tempat Akad": r.tempatAkad ?? "", Notaris: r.notaris ?? "" });
    (Object.keys(LEGAL) as (keyof typeof LEGAL)[]).forEach(k => (o[LEGAL[k]] = r.legal?.[k] ? "Ya" : ""));
    Object.assign(o, { "Progres Bangun %": Math.round(num(r.progressBangun) * 100), AJB: r.ajb ? "Ya" : "", "Tgl AJB": r.tglAJB ?? "", STU: r.stu ? "Ya" : "", "Tgl STU": r.tglSTU ?? "" });
    return o;
  });
  save(`Berkas_KPR${slug(f)}_${stamp()}.xlsx`, await xlsxBlob([["Berkas KPR", data, [5, 10, 30, 12, 14, 11, 11, 13]]]));
}

export async function retXLS(rows: Retensi[]) {
  const K = Object.keys(RET_LABEL) as (keyof typeof RET_LABEL)[];
  const data = rows.map((r, i) => {
    const o: Record<string, unknown> = { No: i + 1, Blok: r.blok, Nama: r.nama, Pembayaran: r.pembayaran ?? "", "Bank KPR": r.bank ?? "", Notaris: r.notaris ?? "",
      "Nilai KPR ACC Bank": retNilai(r), "Total Diterima Awal": retTerima(r), "% Pencairan KPR": Math.round(retPersen(r) * 10000) / 100 };
    K.forEach(k => (o["Retensi " + RET_LABEL[k]] = num(r.ret?.[k])));
    o["Total Retensi Awal"] = retAwal(r); o["Sudah Cair"] = retCair(r); o["Jumlah Pencairan"] = (r.cair ?? []).length;
    o["Tgl Cair Terakhir"] = cairSorted(r).slice(-1)[0]?.tgl ?? "";
    K.forEach(k => (o["Sisa " + RET_LABEL[k]] = compSisa(r, k)));
    Object.assign(o, { "Total Retensi (Sisa)": retSisa(r), Status: retStatus(r), Keterangan: r.keterangan ?? "" });
    return o;
  });
  const hist = rows.flatMap(r => cairSorted(r).map(c => ({ Blok: r.blok, Nama: r.nama, "Bank KPR": r.bank ?? "", "Tanggal Cair": c.tgl ?? "", Komponen: RET_LABEL[c.komponen as keyof typeof RET_LABEL] ?? c.komponen ?? "", Nominal: num(c.nominal), Keterangan: c.ket ?? "" })));
  save(`Retensi_${stamp()}.xlsx`, await xlsxBlob([["Retensi", data, [5, 9, 30, 10, 16, 10]], ["Riwayat Pencairan", hist, [9, 30, 16, 12, 22, 14, 30], ["Blok", "Nama", "Bank KPR", "Tanggal Cair", "Komponen", "Nominal", "Keterangan"]]]));
}

// Report custom: hanya PDF, kolom sesuai pilihan.
async function reportPDF<T>(title: string, sub: string, rows: T[], cols: { head: string; val: (r: T, i: number) => string | number; right?: boolean; sum?: (r: T) => number; w?: number }[], file: string) {
  const body = rows.map((r, i) => cols.map(c => c.val(r, i)));
  const foot = cols.map((c, i) => (i === 0 ? `Total ${rows.length} data` : c.sum ? rp(rows.reduce((a, r) => a + c.sum!(r), 0)) : ""));
  const styles: Record<number, object> = {};
  cols.forEach((c, i) => { styles[i] = { ...(c.right ? { halign: "right" } : {}), ...(c.w ? { cellWidth: c.w } : {}) }; });
  save(file, await pdfDoc(title, sub, cols.map(c => c.head), body, foot, styles));
}

export async function kprReportPDF(rows: Kpr[], f: KprFilter, columns: Record<string, boolean>) {
  const bp = (r: Kpr) => (r.bankProses ?? []).map(b => b.bank + ":\n" + progresBank(b).map(h => "  " + [h.tgl ? tgl(h.tgl) : "tanpa tgl", h.hasil || "Diajukan", h.ket].filter(Boolean).join(" · ")).join("\n")).join("\n") || "–";
  const all: [string, { head: string; val: (r: Kpr, i: number) => string | number; right?: boolean; sum?: (r: Kpr) => number; w?: number }][] = [
    ["unit", { head: "Unit", val: r => r.unit, w: 14 }], ["nama", { head: "Nama", val: r => r.nama }], ["sales", { head: "Sales", val: r => r.sales ?? "–" }],
    ["kantor", { head: "Kantor Agent", val: r => r.kantor ?? "–" }], ["caraBayar", { head: "Cara Bayar", val: r => r.caraBayar ?? "–" }],
    ["hargaJual", { head: "Harga Jual", val: r => rp(num(r.hargaJual)), right: true, sum: r => num(r.hargaJual) }],
    ["totalDiskon", { head: "Total Diskon", val: r => rp(totalDiskon(r)), right: true, sum: totalDiskon }],
    ["hargaTransaksi", { head: "Harga Transaksi", val: r => rp(num(r.hargaTransaksi)), right: true, sum: r => num(r.hargaTransaksi) }],
    ["utj", { head: "UTJ", val: r => rp(num(r.utj)), right: true, sum: r => num(r.utj) }],
    ["totalUM", { head: "Uang Muka", val: r => rp(num(r.totalUM)), right: true, sum: r => num(r.totalUM) }],
    ["plafond", { head: "Plafond KPR", val: r => rp(num(r.plafond)), right: true, sum: r => (isKPR(r) ? num(r.plafond) : 0) }],
    ["accBank", { head: "Nominal ACC", val: r => rp(num(r.accBank)), right: true, sum: r => num(r.accBank) }],
    ["tum", { head: "TUM", val: r => rp(num(r.tum)), right: true, sum: r => num(r.tum) }],
    ["tglUTJ", { head: "Tgl UTJ", val: r => tgl(r.tglUTJ) || "–" }], ["tglSPR", { head: "Tgl SPR & PPJB", val: r => tgl(r.tglSPR) || "–" }],
    ["tglACC", { head: "Tgl ACC", val: r => tgl(r.tglACC) || "–" }], ["tglAkad", { head: "Tgl Akad", val: r => tgl(r.tglAkad) || "–" }],
    ["tempatAkad", { head: "Tempat Akad", val: r => r.tempatAkad ?? "–" }], ["notaris", { head: "Notaris", val: r => r.notaris ?? "–" }],
    ["status", { head: "Status", val: r => status(r) }], ["bankProses", { head: "Proses Bank (riwayat per bank)", val: bp, w: 52 }],
    ["berkas", { head: "Berkas", val: r => { const s = berkasScore(r); return s.missing.length ? `${s.have}/${s.need} (kurang: ${s.missing.join(", ")})` : `${s.have}/${s.need} lengkap`; }, w: 24 }],
    ["jenisPekerjaan", { head: "Pekerjaan", val: r => jenis(r) }],
  ];
  const cols = all.filter(([k]) => columns[k]).map(([, c]) => c);
  await reportPDF("Report Berkas KPR", `${kprFilterLabel(f)} · ${rows.length} unit · dicetak ${today()}`, rows, cols, `Report_KPR${slug(f)}_${stamp()}.pdf`);
}

export async function retReportPDF(rows: Retensi[], f: RetFilter, columns: Record<string, boolean>) {
  const all: [string, { head: string; val: (r: Retensi, i: number) => string | number; right?: boolean; sum?: (r: Retensi) => number; w?: number }][] = [
    ["blok", { head: "Blok", val: r => r.blok, w: 14 }], ["nama", { head: "Nama", val: r => r.nama }], ["pembayaran", { head: "Pembayaran", val: r => r.pembayaran ?? "–" }],
    ["bank", { head: "Bank KPR", val: r => r.bank ?? "–" }], ["notaris", { head: "Notaris", val: r => r.notaris ?? "–" }],
    ["nilaiKPRAccBank", { head: "Nilai KPR ACC Bank", val: r => rp(retNilai(r)), right: true, sum: retNilai }],
    ["totalDiterimAwal", { head: "Total Diterima Awal", val: r => rp(retTerima(r)), right: true, sum: retTerima }],
    ["persenCair", { head: "% Cair KPR", val: r => (retPersen(r) * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "%", right: true }],
    ["retAwal", { head: "Retensi", val: r => rp(retAwal(r)), right: true, sum: retAwal }],
    ["retCair", { head: "Sudah Cair", val: r => rp(retCair(r)), right: true, sum: retCair }],
    ["retSisa", { head: "Total Retensi (Sisa)", val: r => (retSisa(r) ? rp(retSisa(r)) : "0"), right: true, sum: retSisa }],
    ["status", { head: "Status", val: r => retStatus(r) || "–" }],
    ["riwayatCair", { head: "Riwayat Pencairan", val: r => cairSorted(r).map(c => [tgl(c.tgl) || "tanpa tgl", rp(num(c.nominal)), kompShort(c.komponen), c.ket].filter(Boolean).join(" · ")).join("\n") || "Belum ada", w: 44 }],
    ["keterangan", { head: "Keterangan", val: r => r.keterangan ?? "–", w: 40 }],
  ];
  const cols = all.filter(([k]) => columns[k]).map(([, c]) => c);
  await reportPDF("Report Retensi / Escrow", `${retFilterLabel(f)} · ${rows.length} unit · dicetak ${today()}`, rows, cols, `Report_Retensi_${stamp()}.pdf`);
}
