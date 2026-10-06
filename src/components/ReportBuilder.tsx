import { useState } from "react";
import { Drawer } from "./ui";

export const KPR_COLUMNS = [
  { id: "unit", label: "Unit", default: true },
  { id: "nama", label: "Nama Pembeli", default: true },
  { id: "sales", label: "Sales", default: true },
  { id: "kantor", label: "Kantor Agent", default: false },
  { id: "caraBayar", label: "Cara Bayar", default: true },
  { id: "hargaJual", label: "Harga Jual", default: false },
  { id: "totalDiskon", label: "Total Diskon", default: false },
  { id: "hargaTransaksi", label: "Harga Transaksi", default: true },
  { id: "utj", label: "UTJ", default: false },
  { id: "totalUM", label: "Uang Muka", default: true },
  { id: "plafond", label: "Plafond KPR", default: false },
  { id: "accBank", label: "Nominal ACC Bank", default: false },
  { id: "tum", label: "TUM", default: false },
  { id: "tglUTJ", label: "Tgl UTJ", default: false },
  { id: "tglSPR", label: "Tgl SPR & PPJB", default: false },
  { id: "tglACC", label: "Tgl ACC", default: false },
  { id: "tglAkad", label: "Tgl Akad", default: true },
  { id: "tempatAkad", label: "Tempat Akad", default: false },
  { id: "notaris", label: "Notaris", default: true },
  { id: "status", label: "Status", default: true },
  { id: "bankProses", label: "Proses Bank", default: false },
  { id: "berkas", label: "Kelengkapan Berkas", default: false },
  { id: "jenisPekerjaan", label: "Jenis Pekerjaan", default: false },
] as const;

export const RET_COLUMNS = [
  { id: "blok", label: "Blok", default: true },
  { id: "nama", label: "Nama", default: true },
  { id: "pembayaran", label: "Pembayaran", default: true },
  { id: "bank", label: "Bank KPR", default: true },
  { id: "notaris", label: "Notaris", default: true },
  { id: "nilaiKPRAccBank", label: "Nilai KPR ACC Bank", default: true },
  { id: "totalDiterimAwal", label: "Total Diterima Awal", default: true },
  { id: "persenCair", label: "% Cair KPR", default: true },
  { id: "retAwal", label: "Retensi", default: true },
  { id: "retCair", label: "Sudah Cair", default: true },
  { id: "retSisa", label: "Total Retensi (Sisa)", default: true },
  { id: "status", label: "Status", default: true },
  { id: "riwayatCair", label: "Riwayat Pencairan", default: false },
  { id: "keterangan", label: "Keterangan", default: false },
] as const;

type ColConfig = Record<string, boolean>;

export function ReportBuilder({ type, onClose, onGenerate }: { type: "kpr" | "ret"; onClose: () => void; onGenerate: (cols: ColConfig) => void }) {
  const columns = type === "kpr" ? KPR_COLUMNS : RET_COLUMNS;
  const [cols, setCols] = useState<ColConfig>(() => {
    const c: ColConfig = {};
    columns.forEach(col => (c[col.id] = col.default));
    return c;
  });

  const handleSelectAll = () => {
    const c: ColConfig = {};
    columns.forEach(col => (c[col.id] = true));
    setCols(c);
  };

  const handleClearAll = () => {
    const c: ColConfig = {};
    columns.forEach(col => (c[col.id] = false));
    setCols(c);
  };

  const selected = Object.values(cols).filter(Boolean).length;
  const total = Object.keys(cols).length;

  return (
    <Drawer title={`Buat Report ${type === "kpr" ? "KPR" : "Retensi"} Custom`} subtitle="Pilih kolom yang ingin ditampilkan" onClose={onClose}
      footer={
        <>
          <span className="sp" />
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn pri" disabled={selected === 0} onClick={() => onGenerate(cols)}>
            Buat Report PDF ({selected}/{total})
          </button>
        </>
      }>
      <fieldset style={{ display: "contents" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", gap: 10, justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            <b>{selected}</b> dari <b>{total}</b> kolom dipilih
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn sm" onClick={handleSelectAll}>Pilih Semua</button>
            <button type="button" className="btn sm" onClick={handleClearAll}>Hapus Semua</button>
          </div>
        </div>
        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px 16px" }}>
          {columns.map(col => (
            <label key={col.id} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={cols[col.id] ?? false}
                onChange={e => setCols(c => ({ ...c, [col.id]: e.target.checked }))}
                style={{ width: "auto", cursor: "pointer" }}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </Drawer>
  );
}
