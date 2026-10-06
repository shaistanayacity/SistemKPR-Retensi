import { useMemo, useState } from "react";
import { cairSorted, compSisa, lastMonths, perMonth, windowEnd, emptyRetFilter, RetFilter, retAwal, retCair, retNilai, retPersen, retRows, retSisa, retSisaPersen, retStatus, retTerima } from "../lib/logic";
import { juta, kompShort, num, RET_LABEL, RET_PILL, rp, rpShort, tgl, titleCase } from "../lib/format";
import type { Retensi } from "../lib/types";
import { retPDF, retXLS, retReportPDF } from "../lib/exportFiles";
import { Avatar, Chev, DateTools, Dash, Who } from "./ui";
import { Icon } from "./Icon";
import { TrendChart } from "./TrendChart";
import { ReportBuilder } from "./ReportBuilder";

export function RetView({ all, canEdit, onOpen, onAdd, onCair, onImport }: { all: Retensi[]; canEdit: boolean; onOpen: (r: Retensi) => void; onAdd: () => void; onCair: (r: Retensi) => void; onImport: () => void }) {
  const [dl, setDl] = useState("");
  const [reportBuilding, setReportBuilding] = useState(false);
  const months = useMemo(() => lastMonths(12, windowEnd(all.flatMap(r => (r.cair ?? []).map(c => c.tgl)))), [all]);
  const [f, setF] = useState<RetFilter>(emptyRetFilter);
  const set = (p: Partial<RetFilter>) => setF(x => ({ ...x, ...p }));

  const gAwal = all.reduce((a, r) => a + retAwal(r), 0), gCair = all.reduce((a, r) => a + retCair(r), 0), gSisa = gAwal - gCair;
  const nCair = all.reduce((a, r) => a + (r.cair ?? []).length, 0), nLunas = all.filter(r => retStatus(r) === "Lunas").length;
  const pctCair = gAwal ? Math.min(1, gCair / gAwal) : 0;
  const gNilai = all.reduce((a, r) => a + retNilai(r), 0), pctSisa = gNilai ? Math.max(0, Math.min(1, gSisa / gNilai)) : 0;
  const recent = all.flatMap(r => (r.cair ?? []).map(c => ({ r, c }))).sort((a, b) => String(b.c.tgl).localeCompare(String(a.c.tgl)));
  const comp = (Object.keys(RET_LABEL) as (keyof typeof RET_LABEL)[]).map(k => [k, all.reduce((a, r) => a + Math.max(0, compSisa(r, k)), 0)] as const).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const maxComp = comp[0]?.[1] ?? 1;

  const by: Record<string, number> = {};
  all.forEach(r => { const s = retStatus(r) || "Tanpa retensi"; by[s] = (by[s] ?? 0) + 1; });
  const sts = ["Ada sisa", "Lunas"].filter(s => by[s] || f.status === s);
  const rows = retRows(all, f);
  const run = async (k: "pdf" | "xls") => {
    if (!rows.length) { alert("Tidak ada data pada filter ini."); return; }
    setDl(k);
    try { await (k === "pdf" ? retPDF(rows, f) : retXLS(rows)); } catch { alert("Gagal menyiapkan file. Periksa koneksi lalu coba lagi."); }
    setDl("");
  };
  const genReport = async (cols: Record<string, boolean>) => {
    if (!rows.length) { alert("Tidak ada data pada filter ini."); return; }
    setDl("report");
    try { await retReportPDF(rows, f, cols); } catch { alert("Gagal menyiapkan file. Periksa koneksi lalu coba lagi."); }
    setDl("");
    setReportBuilding(false);
  };
  const tSisa = rows.reduce((a, r) => a + retSisa(r), 0), tNilai = rows.reduce((a, r) => a + retNilai(r), 0), tCair = rows.reduce((a, r) => a + retCair(r), 0);
  const banks = [...new Set(all.map(r => r.bank).filter(Boolean) as string[])].sort();
  const notaris = [...new Set(all.map(r => r.notaris).filter(Boolean) as string[])].sort();

  return (
    <section className="view">
      <div className="ph">
        <div><p className="eyebrow">Escrow yang ditahan bank</p><h1>Retensi</h1>
          <p className="lead"><b className="num">{all.length}</b> unit dengan retensi · <b className="num">{Math.round(pctCair * 100)}%</b> sudah cair</p></div>
        {canEdit && <button className="btn pri" onClick={onAdd}>+ Tambah Retensi</button>}
      </div>

      <div className="stats four">
        <div className="card stat"><span className="st-l"><span className="lbl">Retensi awal</span><span className="v num">{rpShort(gAwal)}</span><span className="s">ditahan bank saat akad</span></span><span className="st-r"><span className="tile"><Icon name="layers" size={22} /></span></span></div>
        <div className="card stat"><span className="st-l"><span className="lbl">Sudah cair</span><span className="v num">{rpShort(gCair)}</span><span className="s num">{nCair} kali pencairan</span></span><span className="st-r"><span className="tile"><Icon name="down" size={22} /></span></span></div>
        <div className="card stat dark"><span className="st-l"><span className="lbl">Sisa retensi</span><span className="v num">{rpShort(gSisa)}</span><span className="t"><i style={{ width: (pctSisa * 100).toFixed(1) + "%" }} /></span><span className="s num">{gNilai ? (pctSisa * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "% dari nilai KPR ACC bank" : "nilai KPR ACC bank belum diisi"}</span></span><span className="st-r"><span className="tile"><Icon name="wallet" size={22} /></span></span></div>
        <div className="card stat"><span className="st-l"><span className="lbl">Unit lunas</span><span className="v num">{nLunas}<span className="of"> / {all.length}</span></span><span className="s">retensi habis dicairkan</span></span><span className="st-r"><span className="tile"><Icon name="check" size={22} /></span></span></div>
      </div>

      <div className="row2">
        <div className="card">
          <div className="card-h"><h2>Pencairan per bulan</h2><span className="sub">12 bulan hingga {months[11].label} {months[11].key.slice(0, 4)}, juta rupiah</span></div>
          <div className="card-b"><TrendChart labels={months.map(m => m.label)} format={n => String(n)} series={[{ name: "Pencairan (juta)", values: perMonth(all.flatMap(r => (r.cair ?? []).map(c => ({ tgl: c.tgl, v: Math.round(num(c.nominal) / 1e6) }))), months), area: true, dashed: true }]} empty="Belum ada pencairan pada rentang ini." /></div>
        </div>
        <div className="card"><div className="card-h"><h2>Pencairan terbaru</h2><span className="sub">{recent.length ? `${recent.length} pencairan tercatat` : ""}</span></div>
          <div className="card-b"><div className="fu">
            {recent.length ? recent.slice(0, 5).map(({ r, c }, i) => (
              <button key={r.id + i} className="fu-i" onClick={() => onOpen(r)}>
                <Avatar name={r.nama} />
                <span style={{ minWidth: 0 }}><b><em>{r.blok}</em>{titleCase(r.nama)}</b><span className="why">{[tgl(c.tgl) || "tanpa tanggal", kompShort(c.komponen), c.ket].filter(Boolean).join(" · ")}</span></span>
                <b className="num">+ {rpShort(c.nominal)}</b>
              </button>)) : <p className="none">Belum ada pencairan tercatat. Klik <b>+ Cair</b> pada baris unit di tabel untuk mencatat tanggal dan nominal yang cair.</p>}
          </div></div></div>
      </div>

      <div className="card"><div className="card-h"><h2>Sisa per komponen</h2><span className="sub">belum cair</span></div>
        <div className="card-b"><div className="bars two">
          {comp.length ? comp.map(([k, v]) => <div className="bar" key={k}><span className="bn">{kompShort(k)}</span><span className="bt"><i style={{ width: Math.max(1.5, v / maxComp * 100).toFixed(1) + "%" }} /></span><span className="bc num">{juta(v)}</span></div>) : <p className="none">Tidak ada retensi tertahan.</p>}
        </div></div></div>

      <div className="card panel">
        <div className="seg" aria-label="Filter status">
          {[["", "Semua", all.length] as [string, string, number], ...sts.map(s => [s, s, by[s] ?? 0] as [string, string, number])].map(([v, l, n]) =>
            <button key={v} aria-pressed={f.status === v} onClick={() => set({ status: v })}>{l} <span className="k num">{n}</span></button>)}
        </div>
        <div className="tools">
          <label className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" placeholder="Cari nama atau blok" aria-label="Cari nama atau blok" value={f.q} onChange={e => set({ q: e.target.value })} /></label>
          <select className="sel" aria-label="Bank" value={f.bank} onChange={e => set({ bank: e.target.value })}><option value="">Semua bank</option>{banks.map(b => <option key={b}>{b}</option>)}</select>
          <select className="sel" aria-label="Notaris" value={f.notaris} onChange={e => set({ notaris: e.target.value })}><option value="">Semua notaris</option>{notaris.map(b => <option key={b}>{b}</option>)}</select>
          <select className="sel" aria-label="Urutan" value={f.sort} onChange={e => set({ sort: e.target.value })}><option value="blok">Blok A–Z</option><option value="sisa">Sisa retensi terbesar</option><option value="diubah">Terakhir diubah / cair</option></select>
          <span className="sp" />
          {canEdit && <button className="btn pri" onClick={onImport}>Unggah Excel</button>}
          <button className="btn" disabled={!!dl} onClick={() => void run("pdf")}>{dl === "pdf" ? "Menyiapkan…" : "Unduh PDF"}</button>
          <button className="btn" disabled={!!dl} onClick={() => void run("xls")}>{dl === "xls" ? "Menyiapkan…" : "Unduh Excel"}</button>
          <button className="btn" onClick={() => setReportBuilding(true)}>Buat Report Custom</button>
        </div>
        <div className="tools dt"><span className="dtl">Tanggal</span><span className="dtl" style={{ fontWeight: 600, color: "var(--fg)" }}>Tanggal pencairan</span>
          <DateTools d1={f.d1} d2={f.d2} onChange={(d1, d2) => set({ d1, d2 })} /></div>
        <p className="meta">Menampilkan <b className="num">{rows.length}</b> dari {all.length} unit · sudah cair <b className="num">{rpShort(tCair)}</b> · sisa <b className="num">{rpShort(tSisa)}</b></p>
        <div className="tbl"><table>
          <thead><tr><th>Blok</th><th>Pemilik</th><th className="r">Nilai KPR ACC Bank</th><th className="r">Sisa Retensi</th><th>Per Komponen</th><th>Riwayat Pencairan</th><th>Status</th><th>Keterangan</th><th></th></tr></thead>
          <tbody>
            {rows.length ? rows.map(r => <RetRow key={r.id} r={r} canEdit={canEdit} onOpen={onOpen} onCair={onCair} />) : <tr><td colSpan={9}><div className="empty"><b>Tidak ada data yang cocok</b>Ubah filter, atau klik Tambah untuk mengisi data baru.</div></td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot><tr><td colSpan={2}>Total {rows.length} unit</td><td className="r num">{rp(tNilai)}</td><td className="r num">{rp(tSisa)}</td><td></td><td className="num">cair {rp(tCair)}</td><td colSpan={2}></td><td></td></tr></tfoot>}
        </table></div>
      </div>
      {reportBuilding && <ReportBuilder type="ret" onClose={() => setReportBuilding(false)} onGenerate={genReport} />}
    </section>
  );
}

function RetRow({ r, canEdit, onOpen, onCair }: { r: Retensi; canEdit: boolean; onOpen: (r: Retensi) => void; onCair: (r: Retensi) => void }) {
  const awal = retAwal(r), cair = retCair(r), sisa = awal - cair, st = retStatus(r), p = retPersen(r);
  const pct = Math.min(1, Math.max(0, retSisaPersen(r))), nilai = retNilai(r);
  const hist = cairSorted(r), shown = hist.slice(-3);
  const komp = (Object.keys(RET_LABEL) as (keyof typeof RET_LABEL)[]).filter(k => num(r.ret?.[k]) > 0);
  return (
    <tr className="click" onClick={() => onOpen(r)}>
      <td className="unit">{r.blok}</td>
      <td><Who name={r.nama} sub={[r.bank, r.notaris && titleCase(r.notaris)].filter(Boolean).join(" · ")} /></td>
      <td className="r"><div className="money-c"><b className="num">{rp(retNilai(r))}</b><span className="sub num">ditahan {(p * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span></div></td>
      <td className="r"><div className="money-c"><b className="num">{sisa ? rp(sisa) : "0"}</b>
        <span className="prog" style={{ justifyContent: "flex-end", marginTop: 4 }} title={nilai ? `Sisa retensi ${(pct * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari nilai KPR ACC bank Rp ${rp(nilai)}` : "Nilai KPR ACC bank belum diisi"}><span className="t"><i style={{ width: (pct * 100).toFixed(0) + "%" }} /></span><span className="sub num" style={{ display: "inline" }}>{nilai ? (pct * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "% dari " + juta(nilai) : "KPR ACC kosong"}</span></span></div></td>
      <td>{komp.length ? <div className="chips">{komp.map(k => { const cs = compSisa(r, k); return <span key={k} className={"chip " + (cs <= 0 ? "acc" : "")} title={`${RET_LABEL[k]}: awal Rp ${rp(num(r.ret?.[k]))}, sisa Rp ${rp(Math.max(0, cs))}`}>{kompShort(k)} {cs <= 0 ? "lunas" : juta(cs)}</span>; })}</div> : <Dash />}</td>
      <td>{hist.length ? <div className="hist">{hist.length > 3 && <span>+{hist.length - 3} pencairan sebelumnya</span>}{shown.map((c, i) => <div key={i}><span className="num">{tgl(c.tgl) || "tanpa tanggal"}</span> · <b className="num">{juta(c.nominal)}</b> <span>{kompShort(c.komponen)}</span></div>)}</div> : <span className="sub">Belum ada</span>}</td>
      <td>{st ? <span className={"pill " + (RET_PILL[st] ?? "p-neu")} title={st}>{st}</span> : <Dash />}</td>
      <td><span className="trunc" title={r.keterangan}>{r.keterangan || <Dash />}</span></td>
      <td><div className="acts">{canEdit && <button className="btn sm pri" disabled={sisa <= 0} title="Catat pencairan retensi" onClick={e => { e.stopPropagation(); onCair(r); }}>+ Cair</button>}
        <button className="icon-btn" aria-label={"Detail " + r.blok} onClick={e => { e.stopPropagation(); onOpen(r); }}><Chev /></button></div></td>
    </tr>
  );
}
