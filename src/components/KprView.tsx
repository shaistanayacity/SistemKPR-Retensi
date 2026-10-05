import { useMemo, useState } from "react";
import { berkasScore, emptyKprFilter, lastMonths, perMonth, windowEnd, followUp, isBelumAkad, isKPR, jenis, KprFilter, kprBanks, kprBrand, kprRows, status } from "../lib/logic";
import { brand, juta, KPR_PILL, KPR_STAT, num, rp, rpShort, tgl, titleCase } from "../lib/format";
import type { Kpr } from "../lib/types";
import { kprPDF, kprXLS } from "../lib/exportFiles";
import { Avatar, Chev, DateTools, Dash, Who } from "./ui";
import { Icon } from "./Icon";
import { TrendChart } from "./TrendChart";

const STEP_C: Record<string, string> = { Pemberkasan: "var(--s1)", "Proses Bank": "var(--s2)", "ACC Bank": "var(--s3)", "Sudah Akad": "var(--s4)", "Non KPR": "var(--s5)" };
const STEP_ICON = ["file", "clip", "check", "key", "slash"];
const DESC: Record<string, string> = { Pemberkasan: "belum diajukan ke bank", "Proses Bank": "menunggu hasil bank", "ACC Bank": "siap dijadwalkan akad", "Non KPR": "tunai / hardcash" };

export function KprView({ all, canAdd, onOpen, onAdd, onQuickAdd, onImport }: { all: Kpr[]; canAdd: boolean; onOpen: (r: Kpr) => void; onAdd: () => void; onQuickAdd: () => void; onImport: () => void }) {
  const [dl, setDl] = useState("");
  const [f, setF] = useState<KprFilter>(emptyKprFilter);
  const set = (p: Partial<KprFilter>) => setF(x => ({ ...x, ...p }));
  const kprAll = all.filter(isKPR);

  const by = useMemo(() => {
    const m: Record<string, { n: number; v: number }> = {};
    KPR_STAT.forEach(s => (m[s] = { n: 0, v: 0 }));
    all.forEach(r => { const s = status(r); m[s].n++; m[s].v += isKPR(r) ? num(r.plafond) : num(r.hargaTransaksi); });
    return m;
  }, [all]);
  const belum = by["Pemberkasan"].n + by["Proses Bank"].n + by["ACC Bank"].n;
  const sumPlAll = kprAll.reduce((a, r) => a + num(r.plafond), 0);

  const rank: Record<string, number> = { "ACC Bank": 0, "Proses Bank": 1, Pemberkasan: 2 };
  const fu = all.filter(isBelumAkad).sort((a, b) => rank[status(a)] - rank[status(b)] || String(a.tglUTJ ?? "9").localeCompare(String(b.tglUTJ ?? "9")));

  const bankCnt: Record<string, number> = {};
  kprAll.forEach(r => { const b = kprBrand(r); if (b) bankCnt[b] = (bankCnt[b] ?? 0) + 1; });
  const topBanks = Object.entries(bankCnt).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxBank = topBanks[0]?.[1] ?? 1;

  const months = useMemo(() => lastMonths(12, windowEnd(all.flatMap(r => [r.tglUTJ, r.tglAkad]))), [all]);
  const rows = kprRows(all, f);
  const run = async (k: "pdf" | "xls") => {
    if (!rows.length) { alert("Tidak ada data pada filter ini."); return; }
    setDl(k);
    try { await (k === "pdf" ? kprPDF(rows, f) : kprXLS(rows, f)); } catch { alert("Gagal menyiapkan file. Periksa koneksi lalu coba lagi."); }
    setDl("");
  };
  const sumPl = rows.reduce((a, r) => a + (isKPR(r) ? num(r.plafond) : 0), 0);
  const years = [...new Set(all.map(r => String(r.tglUTJ ?? "").slice(0, 4)).filter(Boolean))].sort().reverse();
  const banks = [...new Set(all.flatMap(kprBanks))].sort();
  const bayar = [...new Set(all.map(r => (r.caraBayar ?? "").toUpperCase()).filter(Boolean))].sort();
  const segs: [string, string, number][] = [["", "Semua", all.length], ["belum", "Belum akad", belum], ...KPR_STAT.map(s => [s, s, by[s].n] as [string, string, number])];

  return (
    <section className="view">
      <div className="ph">
        <div>
          <p className="eyebrow">Kelengkapan berkas &amp; proses bank</p>
          <h1>Berkas KPR</h1>
          <p className="lead"><b className="num">{all.length}</b> unit terjual · <b className="num">{belum}</b> belum akad · total plafond KPR <b className="num">{rpShort(sumPlAll)}</b></p>
        </div>
        {canAdd && <div className="acts"><button className="btn pri" onClick={onAdd}>+ Tambah Unit</button><button className="btn plus" onClick={onQuickAdd} aria-label="Tambah unit lewat pop-up" title="Tambah cepat (pop-up)">+</button></div>}
      </div>

      <div className="stats">
        {KPR_STAT.map((s, i) => {
          const share = s === "Non KPR" ? (all.length ? by[s].n / all.length : 0) : (kprAll.length ? by[s].n / kprAll.length : 0);
          return (
            <button key={s} className="card stat" aria-pressed={f.status === s} onClick={() => set({ status: f.status === s ? "" : s })}>
              <span className="st-l">
                <span className="lbl">{s}</span>
                <span className="v num">{by[s].n}</span>
                <span className="s">{s === "Sudah Akad" ? "plafond " + rpShort(by[s].v) : DESC[s]}</span>
                <span className="t"><i style={{ width: (share * 100).toFixed(1) + "%" }} /></span>
              </span>
              <span className="st-r"><span className="tile"><Icon name={STEP_ICON[i]} size={22} /></span></span>
            </button>
          );
        })}
      </div>

      <div className="row2">
        <div className="card">
          <div className="card-h"><h2>Tren bulanan</h2><span className="sub">12 bulan hingga {months[11].label} {months[11].key.slice(0, 4)}</span></div>
          <div className="card-b"><TrendChart labels={months.map(m => m.label)} format={n => String(n)} series={[{ name: "Akad", values: perMonth(all.map(r => ({ tgl: r.tglAkad })), months), area: true }, { name: "UTJ masuk", values: perMonth(all.map(r => ({ tgl: r.tglUTJ })), months), dashed: true }]} empty="Belum ada tanggal UTJ atau akad pada rentang ini." /></div>
        </div>
        <div className="card">
          <div className="card-h"><h2>Perlu ditindaklanjuti</h2><span className="sub">{fu.length ? `${fu.length} unit belum akad` : ""}</span></div>
          <div className="card-b"><div className="fu">
            {fu.length ? fu.slice(0, 5).map(r => { const st = status(r); return (
              <button key={r.id} className="fu-i" onClick={() => onOpen(r)}>
                <Avatar name={r.nama} />
                <span style={{ minWidth: 0 }}><b><em>{r.unit}</em>{titleCase(r.nama)}</b><span className="why" title={followUp(r)}>{followUp(r)}</span></span>
                <span className={"pill " + KPR_PILL[st]}>{st}</span>
              </button>); }) : <p className="none">Semua unit KPR sudah akad.</p>}
            {fu.length > 5 && <div style={{ paddingTop: 10, borderTop: "1px solid var(--line-2)" }}><button className="link" onClick={() => set({ status: "belum" })}>Lihat semua {fu.length} unit belum akad <Chev /></button></div>}
          </div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h2>Bank KPR</h2><span className="sub">unit ACC &amp; akad</span></div>
        <div className="card-b"><div className="bars two">
          {topBanks.length ? topBanks.map(([b, n]) => (
            <div className="bar" key={b}><span className="bn">{b}</span><span className="bt"><i style={{ width: (n / maxBank * 100).toFixed(1) + "%" }} /></span><span className="bc num"><b>{n}</b> unit</span></div>
          )) : <p className="none">Belum ada unit yang ACC atau akad.</p>}
        </div></div>
      </div>

      <div className="card panel">
        <div className="seg" aria-label="Filter status">
          {segs.map(([v, l, n]) => <button key={v} aria-pressed={f.status === v} onClick={() => set({ status: v })}>{l} <span className="k num">{n}</span></button>)}
        </div>
        <div className="tools">
          <label className="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" placeholder="Cari nama atau unit" aria-label="Cari nama atau unit" value={f.q} onChange={e => set({ q: e.target.value })} /></label>
          <select className="sel" aria-label="Tahun UTJ" value={f.year} onChange={e => set({ year: e.target.value })}><option value="">Semua tahun UTJ</option>{years.map(y => <option key={y}>{y}</option>)}</select>
          <select className="sel" aria-label="Bank" value={f.bank} onChange={e => set({ bank: e.target.value })}><option value="">Semua bank</option>{banks.map(y => <option key={y}>{y}</option>)}</select>
          <select className="sel" aria-label="Cara bayar" value={f.bayar} onChange={e => set({ bayar: e.target.value })}><option value="">Semua cara bayar</option>{bayar.map(y => <option key={y}>{y}</option>)}</select>
          <select className="sel" aria-label="Urutan" value={f.sort} onChange={e => set({ sort: e.target.value })}>
            <option value="baru">Berkas terbaru dulu</option><option value="lama">Berkas terlama dulu</option><option value="diubah">Terakhir diubah</option><option value="unit">Unit A–Z</option>
          </select>
          <span className="sp" />
          {canAdd && <button className="btn pri" onClick={onImport}>Unggah Excel</button>}
          <button className="btn" disabled={!!dl} onClick={() => void run("pdf")}>{dl === "pdf" ? "Menyiapkan…" : "Unduh PDF"}</button>
          <button className="btn" disabled={!!dl} onClick={() => void run("xls")}>{dl === "xls" ? "Menyiapkan…" : "Unduh Excel"}</button>
        </div>
        <div className="tools dt">
          <span className="dtl">Tanggal</span>
          <select className="sel" aria-label="Jenis tanggal" value={f.dtb} onChange={e => set({ dtb: e.target.value })}>
            <option value="utj">Tanggal UTJ</option><option value="spr">Tanggal SPR &amp; PPJB</option><option value="bank">Tanggal proses bank</option><option value="acc">Tanggal ACC</option><option value="akad">Tanggal akad</option><option value="cair">Tanggal pencairan KPR</option>
          </select>
          <DateTools d1={f.d1} d2={f.d2} onChange={(d1, d2) => set({ d1, d2 })} />
        </div>
        <p className="meta">Menampilkan <b className="num">{rows.length}</b> dari {all.length} unit{sumPl ? <> · plafond <b className="num">{rpShort(sumPl)}</b></> : null}</p>
        <div className="tbl"><table>
          <thead><tr><th>Unit</th><th>Pembeli</th><th className="r">Nilai</th><th>Proses Bank</th><th>ACC &amp; Akad</th><th>Berkas</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length ? rows.map(r => <KprRow key={r.id} r={r} onOpen={onOpen} />) : <tr><td colSpan={8}><div className="empty"><b>Tidak ada data yang cocok</b>Ubah filter, atau klik Tambah untuk mengisi data baru.</div></td></tr>}
          </tbody>
        </table></div>
      </div>
    </section>
  );
}

function KprRow({ r, onOpen }: { r: Kpr; onOpen: (r: Kpr) => void }) {
  const st = status(r), sc = berkasScore(r), kpr = isKPR(r), pct = sc.need ? sc.have / sc.need : 0;
  return (
    <tr className="click" onClick={() => onOpen(r)}>
      <td className="unit">{r.unit}</td>
      <td><Who name={r.nama} sub={<>{[kpr ? jenis(r) : "", r.tglUTJ ? "UTJ " + tgl(r.tglUTJ) : ""].filter(Boolean).join(" · ")}<span className="sub num" style={{ display: "block" }}>SPR &amp; PPJB {r.tglSPR ? tgl(r.tglSPR) : "belum"}</span></>} /></td>
      <td className="r"><div className="money-c"><b className="num">{rp(num(r.hargaTransaksi))}</b>
        {kpr ? <span className="sub num">UM {num(r.totalUM) > 0 ? juta(r.totalUM) : "–"} · KPR {num(r.plafond) ? juta(r.plafond) : "–"}</span> : <span className="sub">{titleCase(r.caraBayar)}</span>}</div></td>
      <td>{(r.bankProses ?? []).length ? <div className="bpl">{(r.bankProses ?? []).map((b, i) => { const h = b.hasil || "Diajukan", cls = h === "ACC" ? "acc" : h === "Ditolak" || h === "Batal" ? "no" : ""; return (
        <div key={i}><div className="bph"><span className={"chip " + cls} title={b.bank}>{brand(b.bank) || b.bank}</span><span className="bpm">{[b.tgl ? tgl(b.tgl) : "", h].filter(Boolean).join(" · ")}</span></div>{b.ket && <div className="bpk" title={b.ket}>{b.ket}</div>}</div>); })}</div> : kpr ? <span className="sub">Belum diajukan</span> : <Dash />}</td>
      <td>{r.tglAkad ? <div className="akad"><b className="num">Akad {tgl(r.tglAkad)}</b><span className="sub trunc" title={r.tempatAkad}>{r.tempatAkad}</span><span className="sub trunc">{titleCase(r.notaris)}</span></div>
        : st === "ACC Bank" ? <div className="akad"><b className="num">ACC{num(r.accBank) ? " " + rpShort(r.accBank) : ""}</b><span className="sub">{r.tglACC ? tgl(r.tglACC) : "tanggal ACC belum diisi"}</span><span className="sub">belum akad</span></div> : <Dash />}</td>
      <td><span className="prog" title={sc.missing.length ? "Kurang: " + sc.missing.join(", ") : "Lengkap"}><span className="t"><i className={pct < 1 ? "part" : ""} style={{ width: (pct * 100).toFixed(0) + "%" }} /></span><span className="num">{sc.have}/{sc.need}</span></span>{sc.missing.length > 0 && <span className="sub trunc" style={{ maxWidth: 120 }}>kurang {sc.missing.length} dok</span>}</td>
      <td><span className={"pill " + KPR_PILL[st]}>{st}</span></td>
      <td><button className="icon-btn" aria-label={"Detail " + r.unit} onClick={e => { e.stopPropagation(); onOpen(r); }}><Chev /></button></td>
    </tr>
  );
}
