import { useState } from "react";
import { berkasNeed, normUnit, rapikanBank, compSisa, retKomponen, hargaTransaksiOtomatis, jenis, plafondOtomatis, retAwal, retCair, retPersen, retSisa, retStatus, status, totalDiskon } from "../lib/logic";
import { DOC_GROUPS, DOCS, HASIL, isoToday, kompShort, LEGAL, LEGAL_GROUPS, num, RET_LABEL, rp, tgl, titleCase } from "../lib/format";
import type { BankProses, BankRiwayat, Kpr, RetCair, Retensi } from "../lib/types";
import { Datalist, Drawer, Field, Fld, Select } from "./ui";
import { KprPicker } from "./KprPicker";

type Common<T> = { initial: T; isNew: boolean; canEdit: boolean; canDelete: boolean; onClose: () => void; onSave: (r: T) => Promise<void>; onDelete: () => Promise<void> };

function Footer({ isNew, canEdit, canDelete, busy, msg, onSave, onDelete, onClose }: { isNew: boolean; canEdit: boolean; canDelete: boolean; busy: boolean; msg: string; onSave: () => void; onDelete: () => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) return <><span>Hapus data ini secara permanen?</span><span className="sp" /><button className="btn" onClick={() => setConfirm(false)}>Batal</button><button className="btn danger" disabled={busy} onClick={onDelete}>Ya, hapus</button>{msg && <div className="msg">{msg}</div>}</>;
  return (
    <>
      {!isNew && canDelete && <button className="btn danger" onClick={() => setConfirm(true)}>Hapus</button>}
      <span className="sp" />
      <button className="btn" onClick={onClose}>{canEdit ? "Batal" : "Tutup"}</button>
      {canEdit && <button className="btn pri" disabled={busy} onClick={onSave}>{busy ? "Menyimpan…" : "Simpan"}</button>}
      {msg && <div className="msg">{msg}</div>}
    </>
  );
}

function useForm<T>(initial: T, onSave: (r: T) => Promise<void>, onDelete: () => Promise<void>, validate: (r: T) => string) {
  const [rec, setRec] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const patch = (p: Partial<T>) => setRec(r => ({ ...r, ...p }));
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg("");
    try { await fn(); } catch (e) { setBusy(false); setMsg((e as { code?: string })?.code === "42501" ? "Akun Anda tidak punya izin untuk perubahan ini." : "Gagal menyimpan. Coba lagi."); }
  };
  const save = () => { const err = validate(rec); if (err) return setMsg(err); void run(() => onSave(rec)); };
  const del = () => void run(onDelete);
  return { rec, patch, busy, msg, save, del };
}

const numOrUndef = (v: string) => (v === "" ? undefined : num(v));

// ---------------- KPR ----------------
export function KprForm({ initial, isNew, canEdit, canDelete, onClose, onSave, onDelete, all }: Common<Kpr> & { all: Kpr[] }) {
  const hitung = (x: Kpr): Kpr => ({ ...x, totalDiskon: totalDiskon(x), hargaTransaksi: hargaTransaksiOtomatis(x), plafond: plafondOtomatis(x) });
  const { rec: r, patch, busy, msg, save, del } = useForm({ ...initial, bankProses: rapikanBank(initial.bankProses) }, x => onSave({ ...hitung(x), bankProses: rapikanBank((x.bankProses ?? []).filter(b => b.bank.trim())) }), onDelete, x => (!x.unit?.trim() || !x.nama?.trim() ? "Blok dan nama pembeli wajib diisi." : ""));
  const bp = r.bankProses ?? [];
  const setBp = (i: number, p: Partial<BankProses>) => patch({ bankProses: bp.map((b, j) => (j === i ? { ...b, ...p } : b)) });
  const setPg = (i: number, k: number, p: Partial<BankRiwayat>) => setBp(i, { progres: (bp[i].progres ?? []).map((x, m) => (m === k ? { ...x, ...p } : x)) });
  const need = berkasNeed(r);
  const nf = (k: keyof Kpr) => (v: string) => patch({ [k]: numOrUndef(v) } as Partial<Kpr>);
  const sf = (k: keyof Kpr) => (v: string) => patch({ [k]: v } as Partial<Kpr>);
  const bayarOpts = [...new Set(["KPR", "Hardcash", "Tunai Bertahap", r.caraBayar].filter(Boolean) as string[])];

  return (
    <Drawer title={isNew ? "Tambah unit" : `${r.unit} · ${titleCase(r.nama)}`} subtitle={isNew ? "Isi data pembeli dan berkas KPR" : `${status(r)} · diperbarui ${r.updatedAt ? tgl(r.updatedAt.slice(0, 10)) : "dari rekap Excel"}`} onClose={onClose}
      footer={<Footer isNew={isNew} canEdit={canEdit} canDelete={canDelete} busy={busy} msg={msg} onSave={save} onDelete={del} onClose={onClose} />}>
      <Datalist id="dl-cluster" values={all.map(x => x.cluster)} />
      <Datalist id="dl-tipe" values={all.map(x => x.tipe)} />
      <Datalist id="dl-bank" values={all.flatMap(x => (x.bankProses ?? []).map(b => b.bank))} />
      <Datalist id="dl-tempat" values={all.map(x => x.tempatAkad)} />
      <Datalist id="dl-notaris" values={all.map(x => x.notaris)} />
      <fieldset disabled={!canEdit} style={{ display: "contents" }}>
        <fieldset><legend>Blok &amp; pembeli</legend><div className="grid">
          <Field label="Cluster" value={r.cluster} onChange={sf("cluster")} list="dl-cluster" />
          <Field label="Tipe" value={r.tipe} onChange={sf("tipe")} list="dl-tipe" />
          <Field label="Blok *" value={r.unit} onChange={sf("unit")} />
          <Field label="Nama pembeli *" value={r.nama} onChange={sf("nama")} w2 />
          <Field label="Sales" value={r.sales} onChange={sf("sales")} />
          <Field label="Kantor agent" value={r.kantor} onChange={sf("kantor")} />
          <Select label="Cara bayar" value={r.caraBayar || "KPR"} options={bayarOpts} onChange={sf("caraBayar")} />
          <Select label="Pekerjaan" value={jenis(r)} options={["Karyawan", "Wiraswasta"]} onChange={sf("jenisPekerjaan")} />
          <Field label="Tanggal UTJ" type="date" value={r.tglUTJ} onChange={sf("tglUTJ")} />
          <Field label="Tanggal SPR & PPJB" type="date" value={r.tglSPR} onChange={sf("tglSPR")} />
        </div></fieldset>
        <fieldset><legend>Harga &amp; uang muka</legend><div className="grid">
          <Field label="Harga jual (Rp)" type="number" value={r.hargaJual} onChange={nf("hargaJual")} />
          <Field label="Diskon PPN (Rp)" type="number" value={r.diskonPPN} onChange={nf("diskonPPN")} />
          <Field label="Diskon Tusuk Sate (Rp)" type="number" value={r.diskonTusukSate} onChange={nf("diskonTusukSate")} />
          <Field label="Diskon Khusus (Rp)" type="number" value={r.diskonKhusus} onChange={nf("diskonKhusus")} />
          <Fld label="Total diskon"><div className="calc num">Rp {rp(totalDiskon(r))}</div></Fld>
          <Fld label="Harga transaksi (harga jual − total diskon)"><div className="calc num">Rp {rp(hargaTransaksiOtomatis(r))}</div></Fld>
          <Field label="UTJ (Rp)" type="number" value={r.utj} onChange={nf("utj")} />
          <Field label="Uang muka (Rp)" type="number" value={r.totalUM} onChange={nf("totalUM")} />
          <Fld label="Plafond KPR (harga transaksi − UTJ − uang muka)"><div className="calc num">Rp {rp(plafondOtomatis(r))}</div></Fld>
        </div></fieldset>
        <fieldset><legend>Kelengkapan berkas</legend><div className="checks">
          {DOC_GROUPS.map(([g, keys]) => <span key={g} style={{ display: "contents" }}><span className="grp">{g}</span>
            {keys.map(k => <label className="ck" key={k}><input type="checkbox" checked={!!r.berkas?.[k]} onChange={e => patch({ berkas: { ...r.berkas, [k]: e.target.checked } })} />{DOCS[k]}</label>)}</span>)}
        </div></fieldset>
        <fieldset><legend>Proses bank</legend><div className="rows">
          {bp.map((b, i) => (
            <div className="bankgrp" key={i}>
              <div className="rowf bk">
                <div><label>Bank</label><input list="dl-bank" value={b.bank} onChange={e => setBp(i, { bank: e.target.value })} /></div>
                <button type="button" className="rm" aria-label="Hapus bank beserta riwayatnya" onClick={() => patch({ bankProses: bp.filter((_, j) => j !== i) })}>×</button>
              </div>
              {(b.progres ?? []).map((p, k) => (
                <div className="rowf pg" key={k}>
                  <div><label>Tanggal</label><input type="date" value={p.tgl} onChange={e => setPg(i, k, { tgl: e.target.value })} /></div>
                  <div><label>Hasil</label><select value={p.hasil} onChange={e => setPg(i, k, { hasil: e.target.value })}><option value="">–</option>{HASIL.map(h => <option key={h}>{h}</option>)}</select></div>
                  <div><label>Keterangan</label><input value={p.ket} onChange={e => setPg(i, k, { ket: e.target.value })} /></div>
                  <button type="button" className="rm" aria-label="Hapus progres" onClick={() => setBp(i, { progres: (b.progres ?? []).filter((_, m) => m !== k) })}>×</button>
                </div>))}
              <button type="button" className="btn sm add" onClick={() => setBp(i, { progres: [...(b.progres ?? []), { tgl: isoToday(), hasil: (b.progres ?? []).length ? "Proses" : "Diajukan", ket: "" }] })}>+ Tambah progres</button>
            </div>))}
        </div><button type="button" className="btn sm add" onClick={() => patch({ bankProses: [...bp, { bank: "", tgl: "", ket: "", hasil: "", progres: [{ tgl: isoToday(), hasil: "Diajukan", ket: "" }] }] })}>+ Tambah bank</button></fieldset>
        <fieldset><legend>ACC &amp; akad</legend><div className="grid">
          <Field label="Nominal ACC bank (Rp)" type="number" value={r.accBank} onChange={nf("accBank")} />
          <Field label="TUM (Rp)" type="number" value={r.tum} onChange={nf("tum")} />
          <Field label="Tanggal ACC / SP3K" type="date" value={r.tglACC} onChange={sf("tglACC")} />
          <Field label="Tanggal akad" type="date" value={r.tglAkad} onChange={sf("tglAkad")} />
          <Field label="Tempat akad" value={r.tempatAkad} onChange={sf("tempatAkad")} list="dl-tempat" />
          <Field label="Notaris" value={r.notaris} onChange={sf("notaris")} list="dl-notaris" w2 />
        </div></fieldset>
        <fieldset><legend>Legal &amp; pajak</legend><div className="checks">
          {LEGAL_GROUPS.map(([g, keys]) => <span key={g} style={{ display: "contents" }}><span className="grp">{g}</span>
            {keys.map(k => <label className="ck" key={k}><input type="checkbox" checked={!!r.legal?.[k]} onChange={e => patch({ legal: { ...r.legal, [k]: e.target.checked } })} />{LEGAL[k]}</label>)}</span>)}
        </div></fieldset>
        <fieldset><legend>Serah terima</legend><div className="grid">
          <Field label="Progres bangun (%)" type="number" value={r.progressBangun === undefined || r.progressBangun === "" ? "" : Math.round(num(r.progressBangun) * 100)} onChange={v => patch({ progressBangun: v === "" ? "" : num(v) / 100 })} />
          <Fld label="AJB"><div style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={!!r.ajb} onChange={e => patch({ ajb: e.target.checked })} /><input type="date" value={r.tglAJB ?? ""} onChange={e => patch({ tglAJB: e.target.value })} /></div></Fld>
          <Fld label="STU (serah terima unit)"><div style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={!!r.stu} onChange={e => patch({ stu: e.target.checked })} /><input type="date" value={r.tglSTU ?? ""} onChange={e => patch({ tglSTU: e.target.value })} /></div></Fld>
        </div></fieldset>
      </fieldset>
    </Drawer>
  );
}

// ---------------- Retensi ----------------
export function RetForm({ initial, isNew, canEdit, canDelete, onClose, onSave, onDelete, all, addCair, kpr }: Common<Retensi> & { all: Retensi[]; addCair?: boolean; kpr: Kpr[] }) {
  const start = addCair ? { ...initial, cair: [...(initial.cair ?? []), { tgl: isoToday(), nominal: 0, komponen: (Object.keys(RET_LABEL) as string[]).find(k => compSisa(initial, k) > 0) ?? "bangunan", ket: "" }] } : initial;
  const { rec: r, patch, busy, msg, save, del } = useForm(start, onSave, onDelete, x => (!x.blok?.trim() || !x.nama?.trim() ? "Blok dan nama wajib diisi." : ""));
  const cair = r.cair ?? [];
  const setCair = (i: number, p: Partial<RetCair>) => patch({ cair: cair.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const kk = Object.keys(RET_LABEL) as (keyof typeof RET_LABEL)[];
  const withKomp = kk.filter(k => num(r.ret?.[k]) > 0);
  const keys = withKomp.length ? withKomp : kk;
  const awal = retAwal(r), sudah = retCair(r), sisa = retSisa(r);
  const sf = (k: keyof Retensi) => (v: string) => patch({ [k]: v } as Partial<Retensi>);
  const nf = (k: keyof Retensi) => (v: string) => patch({ [k]: num(v) } as Partial<Retensi>);

  return (
    <Drawer title={isNew ? "Tambah retensi" : `${r.blok} · ${titleCase(r.nama)}`} subtitle={isNew ? "Data escrow / retensi bank per unit" : `${retStatus(r) || "Belum ada retensi"} · sisa retensi Rp ${rp(sisa)}`} onClose={onClose}
      footer={<Footer isNew={isNew} canEdit={canEdit} canDelete={canDelete} busy={busy} msg={msg} onSave={save} onDelete={del} onClose={onClose} />}>
      <Datalist id="dl-rcluster" values={all.map(x => x.cluster)} />
      <Datalist id="dl-rtipe" values={all.map(x => x.tipe)} />
      <Datalist id="dl-rbank" values={all.map(x => x.bank)} />
      <Datalist id="dl-rnot" values={all.map(x => x.notaris)} />
      <fieldset disabled={!canEdit} style={{ display: "contents" }}>
        {isNew && canEdit && <KprPicker kpr={kpr} linkedId={r.kprId} sudahAda={new Set(all.map(x => normUnit(x.blok)))}
          onPick={isi => patch(isi)} onClear={() => patch({ kprId: undefined })} />}
        <fieldset><legend>Blok &amp; pemilik</legend><div className="grid">
          <Field label="Cluster" value={r.cluster} onChange={sf("cluster")} list="dl-rcluster" />
          <Field label="Tipe" value={r.tipe} onChange={sf("tipe")} list="dl-rtipe" />
          <Field label="Blok *" value={r.blok} onChange={sf("blok")} />
          <Field label="Nama *" value={r.nama} onChange={v => patch({ nama: v.toUpperCase() })} w2 />
          <Select label="Pembayaran" value={r.pembayaran || "KPR"} options={[...new Set(["KPR", "Tunai", r.pembayaran].filter(Boolean) as string[])]} onChange={sf("pembayaran")} />
          <Field label="Bank KPR" value={r.bank} onChange={sf("bank")} list="dl-rbank" />
          <Field label="Notaris" value={r.notaris} onChange={sf("notaris")} list="dl-rnot" />
          <Field label="Tanggal akad" type="date" value={r.tglAkad} onChange={sf("tglAkad")} />
        </div></fieldset>
        <fieldset><legend>Nilai transaksi &amp; diterima</legend><div className="grid">
          <Field label="Nilai KPR ACC bank (Rp)" type="number" value={r.nilaiKPRAccBank} onChange={nf("nilaiKPRAccBank")} />
          <Field label="Total diterima awal (Rp)" type="number" value={r.totalDiterimAwal} onChange={nf("totalDiterimAwal")} />
          <Fld label="% ditahan bank (otomatis)"><div className="calc num">{(retPersen(r) * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%</div></Fld>
        </div></fieldset>
        <fieldset><legend>Retensi</legend><div className="grid">
          {kk.map(k => <Field key={k} label={RET_LABEL[k] + " (Rp)"} type="number" value={compSisa(r, k) || ""} onChange={v => patch({ ret: { ...r.ret, [k]: num(v) + cair.filter(c => c.komponen === k).reduce((a, c) => a + num(c.nominal), 0) } })} />)}
          <Fld label="Total retensi (berkurang otomatis saat pencairan)"><div className="calc num">Rp {rp(sisa)}</div></Fld>
        </div><p className="sub" style={{ marginTop: 8 }}>Total retensi = nilai KPR ACC bank − total diterima awal − pencairan{num(r.nilaiKPRAccBank) > 0 && num(r.totalDiterimAwal) > 0 ? ` (Rp ${rp(num(r.nilaiKPRAccBank))} − Rp ${rp(num(r.totalDiterimAwal))} = Rp ${rp(awal)} sebelum pencairan)` : ". Isi nilai KPR ACC bank dan total diterima awal agar terhitung otomatis; sebelum itu total memakai jumlah kategori"}. Angka per kategori adalah sisanya setelah pencairan kategori itu.</p>
        {retKomponen(r) > 0 && retKomponen(r) !== awal && <p className="sub" style={{ marginTop: 4 }}>Jumlah rincian kategori Rp {rp(retKomponen(r))}, berbeda Rp {rp(Math.abs(retKomponen(r) - awal))} dari retensi awal di atas.</p>}</fieldset>
        <fieldset><legend>Pencairan retensi</legend><div className="rows">
          {cair.map((c, i) => (
            <div className="rowf cr" key={i}>
              <div><label>Tanggal cair</label><input type="date" value={c.tgl} onChange={e => setCair(i, { tgl: e.target.value })} /></div>
              <div><label>Nominal (Rp)</label><input type="number" step="any" value={c.nominal || ""} onChange={e => setCair(i, { nominal: num(e.target.value) })} /></div>
              <div><label>Komponen</label><select value={c.komponen} onChange={e => setCair(i, { komponen: e.target.value })}>{[...new Set([...keys as string[], c.komponen].filter(Boolean) as string[])].map(k => <option key={k} value={k}>{kompShort(k)}</option>)}</select></div>
              <div><label>Keterangan</label><input value={c.ket ?? ""} placeholder="mis. cair setelah BAST" onChange={e => setCair(i, { ket: e.target.value })} /></div>
              <button type="button" className="rm" aria-label="Hapus baris" onClick={() => patch({ cair: cair.filter((_, j) => j !== i) })}>×</button>
            </div>))}
        </div>
        <button type="button" className="btn sm add" onClick={() => patch({ cair: [...cair, { tgl: isoToday(), nominal: 0, komponen: keys.find(k => compSisa(r, k) > 0) ?? keys[0], ket: "" }] })}>+ Catat pencairan</button>
        <div className="sumrow">
          <Fld label="Retensi awal"><div className="calc num">Rp {rp(awal)}</div></Fld>
          <Fld label="Sudah cair"><div className="calc num">{sudah ? "− Rp " + rp(sudah) : "Rp 0"}</div></Fld>
          <Fld label="Sisa retensi"><div className={"calc num" + (sisa < 0 ? " neg" : "")}>{sisa < 0 ? "Lebih Rp " + rp(-sisa) : sisa ? "Rp " + rp(sisa) : "Lunas"}</div></Fld>
        </div></fieldset>
        <fieldset><legend>Keterangan</legend><div className="grid">
          <Fld label="Keterangan" w2><textarea value={r.keterangan ?? ""} onChange={e => patch({ keterangan: e.target.value })} /></Fld>
        </div></fieldset>
      </fieldset>
    </Drawer>
  );
}
