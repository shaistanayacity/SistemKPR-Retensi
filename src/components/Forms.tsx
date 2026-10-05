import { useState } from "react";
import { berkasNeed, compSisa, jenis, retAwal, retCair, retSisa, retStatus, status } from "../lib/logic";
import { DOC_GROUPS, DOCS, HASIL, isoToday, kompShort, LEGAL, LEGAL_GROUPS, num, RET_LABEL, RET_STATUS, rp, rpShort, tgl, titleCase } from "../lib/format";
import type { BankProses, Kpr, Pencairan, RetCair, Retensi } from "../lib/types";
import { Datalist, Drawer, Field, Fld, Select } from "./ui";

type Common<T> = { initial: T; isNew: boolean; popup?: boolean; canEdit: boolean; canDelete: boolean; onClose: () => void; onSave: (r: T) => Promise<void>; onDelete: () => Promise<void> };

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
export function KprForm({ initial, isNew, popup, canEdit, canDelete, onClose, onSave, onDelete, all }: Common<Kpr> & { all: Kpr[] }) {
  const { rec: r, patch, busy, msg, save, del } = useForm(initial, onSave, onDelete, x => (!x.unit?.trim() || !x.nama?.trim() ? "Unit dan nama pembeli wajib diisi." : ""));
  const bp = r.bankProses ?? [], pc = r.pencairan ?? [];
  const setBp = (i: number, p: Partial<BankProses>) => patch({ bankProses: bp.map((b, j) => (j === i ? { ...b, ...p } : b)) });
  const setPc = (i: number, p: Partial<Pencairan>) => patch({ pencairan: pc.map((b, j) => (j === i ? { ...b, ...p } : b)) });
  const need = berkasNeed(r);
  const nf = (k: keyof Kpr) => (v: string) => patch({ [k]: numOrUndef(v) } as Partial<Kpr>);
  const sf = (k: keyof Kpr) => (v: string) => patch({ [k]: v } as Partial<Kpr>);
  const bayarOpts = [...new Set(["KPR", "Hardcash", "Tunai Bertahap", r.caraBayar].filter(Boolean) as string[])];

  return (
    <Drawer modal={popup} title={isNew ? "Tambah unit" : `${r.unit} · ${titleCase(r.nama)}`} subtitle={isNew ? "Isi data pembeli dan berkas KPR" : `${status(r)} · diperbarui ${r.updatedAt ? tgl(r.updatedAt.slice(0, 10)) : "dari rekap Excel"}`} onClose={onClose}
      footer={<Footer isNew={isNew} canEdit={canEdit} canDelete={canDelete} busy={busy} msg={msg} onSave={save} onDelete={del} onClose={onClose} />}>
      <Datalist id="dl-bank" values={all.flatMap(x => (x.bankProses ?? []).map(b => b.bank))} />
      <Datalist id="dl-tempat" values={all.map(x => x.tempatAkad)} />
      <Datalist id="dl-notaris" values={all.map(x => x.notaris)} />
      <fieldset disabled={!canEdit} style={{ display: "contents" }}>
        <fieldset><legend>Unit &amp; pembeli</legend><div className="grid">
          <Field label="Unit *" value={r.unit} onChange={sf("unit")} />
          <Field label="Nama pembeli *" value={r.nama} onChange={sf("nama")} w2 />
          <Select label="Cara bayar" value={r.caraBayar || "KPR"} options={bayarOpts} onChange={sf("caraBayar")} />
          <Select label="Pekerjaan" value={jenis(r)} options={["Karyawan", "Wiraswasta"]} onChange={sf("jenisPekerjaan")} />
          <Field label="Tanggal UTJ" type="date" value={r.tglUTJ} onChange={sf("tglUTJ")} />
          <Field label="Tanggal SPR & PPJB" type="date" value={r.tglSPR} onChange={sf("tglSPR")} />
        </div></fieldset>
        <fieldset><legend>Harga &amp; uang muka</legend><div className="grid">
          <Field label="Harga bank (Rp)" type="number" value={r.hargaBank} onChange={nf("hargaBank")} />
          <Field label="Harga transaksi (Rp)" type="number" value={r.hargaTransaksi} onChange={nf("hargaTransaksi")} />
          <Field label="UTJ (Rp)" type="number" value={r.utj} onChange={nf("utj")} />
          <Field label="Angsuran UM (Rp)" type="number" value={r.angsuranUM} onChange={nf("angsuranUM")} />
          <Field label="Cashback UM (Rp)" type="number" value={r.cashbackUM} onChange={nf("cashbackUM")} />
          <Field label="Total uang muka (Rp)" type="number" value={r.totalUM} onChange={nf("totalUM")} />
          <Field label="Plafond KPR (Rp)" type="number" value={r.plafond} onChange={nf("plafond")} />
          <Field label="TUM (Rp)" type="number" value={r.tum} onChange={nf("tum")} />
        </div></fieldset>
        <fieldset><legend>Kelengkapan berkas</legend><div className="checks">
          {DOC_GROUPS.map(([g, keys]) => <span key={g} style={{ display: "contents" }}><span className="grp">{g}</span>
            {keys.map(k => <label className="ck" key={k}><input type="checkbox" checked={!!r.berkas?.[k]} onChange={e => patch({ berkas: { ...r.berkas, [k]: e.target.checked } })} />{DOCS[k]}{need.includes(k) ? "" : " (opsional)"}</label>)}</span>)}
        </div></fieldset>
        <fieldset><legend>Proses bank</legend><div className="rows">
          {bp.map((b, i) => (
            <div className="rowf bp" key={i}>
              <div><label>Bank</label><input list="dl-bank" value={b.bank} onChange={e => setBp(i, { bank: e.target.value })} /></div>
              <div><label>Tanggal</label><input type="date" value={b.tgl} onChange={e => setBp(i, { tgl: e.target.value })} /></div>
              <div><label>Hasil</label><select value={b.hasil} onChange={e => setBp(i, { hasil: e.target.value })}><option value="">–</option>{HASIL.map(h => <option key={h}>{h}</option>)}</select></div>
              <div><label>Keterangan</label><input value={b.ket} onChange={e => setBp(i, { ket: e.target.value })} /></div>
              <button type="button" className="rm" aria-label="Hapus baris" onClick={() => patch({ bankProses: bp.filter((_, j) => j !== i) })}>×</button>
            </div>))}
        </div><button type="button" className="btn sm add" onClick={() => patch({ bankProses: [...bp, { bank: "", tgl: "", ket: "", hasil: "Diajukan" }] })}>+ Tambah bank</button></fieldset>
        <fieldset><legend>ACC &amp; akad</legend><div className="grid">
          <Field label="Nominal ACC bank (Rp)" type="number" value={r.accBank} onChange={nf("accBank")} />
          <Field label="Tanggal ACC / SP3K" type="date" value={r.tglACC} onChange={sf("tglACC")} />
          <Field label="Tanggal akad" type="date" value={r.tglAkad} onChange={sf("tglAkad")} />
          <Field label="Tempat akad" value={r.tempatAkad} onChange={sf("tempatAkad")} list="dl-tempat" />
          <Field label="Notaris" value={r.notaris} onChange={sf("notaris")} list="dl-notaris" w2 />
        </div></fieldset>
        <fieldset><legend>Legal, pajak &amp; berkas akad</legend><div className="checks">
          {LEGAL_GROUPS.map(([g, keys]) => <span key={g} style={{ display: "contents" }}><span className="grp">{g}</span>
            {keys.map(k => <label className="ck" key={k}><input type="checkbox" checked={!!r.legal?.[k]} onChange={e => patch({ legal: { ...r.legal, [k]: e.target.checked } })} />{LEGAL[k]}</label>)}</span>)}
        </div></fieldset>
        <fieldset><legend>Pencairan KPR</legend><div className="rows">
          {pc.map((p, i) => (
            <div className="rowf pc" key={i}>
              <span className="ix">{i + 1}</span>
              <div><label>Tanggal</label><input type="date" value={p.tgl} onChange={e => setPc(i, { tgl: e.target.value })} /></div>
              <div><label>Nominal (Rp)</label><input type="number" step="any" value={p.nominal || ""} onChange={e => setPc(i, { nominal: num(e.target.value) })} /></div>
              <span />
              <button type="button" className="rm" aria-label="Hapus baris" onClick={() => patch({ pencairan: pc.filter((_, j) => j !== i) })}>×</button>
            </div>))}
        </div><button type="button" className="btn sm add" onClick={() => patch({ pencairan: [...pc, { tgl: "", nominal: 0 }] })}>+ Tambah pencairan</button></fieldset>
        <fieldset><legend>Serah terima</legend><div className="grid">
          <Field label="Progres bangun (%)" type="number" value={r.progressBangun === undefined || r.progressBangun === "" ? "" : Math.round(num(r.progressBangun) * 100)} onChange={v => patch({ progressBangun: v === "" ? "" : num(v) / 100 })} />
          <Fld label="AJB"><div style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={!!r.ajb} onChange={e => patch({ ajb: e.target.checked })} /><input type="date" value={r.tglAJB ?? ""} onChange={e => patch({ tglAJB: e.target.value })} /></div></Fld>
          <Fld label="STU (serah terima unit)"><div style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={!!r.stu} onChange={e => patch({ stu: e.target.checked })} /><input type="date" value={r.tglSTU ?? ""} onChange={e => patch({ tglSTU: e.target.value })} /></div></Fld>
        </div></fieldset>
        <fieldset><legend>Catatan</legend><div className="grid">
          <Fld label="Keterangan" w2><textarea value={r.keterangan ?? ""} onChange={e => patch({ keterangan: e.target.value })} /></Fld>
          <Fld label="Promo & souvenir" w2><textarea value={r.promo ?? ""} onChange={e => patch({ promo: e.target.value })} /></Fld>
        </div></fieldset>
      </fieldset>
    </Drawer>
  );
}

// ---------------- Retensi ----------------
export function RetForm({ initial, isNew, popup, canEdit, canDelete, onClose, onSave, onDelete, all, addCair }: Common<Retensi> & { all: Retensi[]; addCair?: boolean }) {
  const start = addCair ? { ...initial, cair: [...(initial.cair ?? []), { tgl: isoToday(), nominal: 0, komponen: (Object.keys(RET_LABEL) as string[]).find(k => compSisa(initial, k) > 0) ?? "bangunan", ket: "" }] } : initial;
  const { rec: r, patch, busy, msg, save, del } = useForm(start, onSave, onDelete, x => (!x.blok?.trim() || !x.nama?.trim() ? "Blok dan nama wajib diisi." : ""));
  const cair = r.cair ?? [];
  const setCair = (i: number, p: Partial<RetCair>) => patch({ cair: cair.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const kk = Object.keys(RET_LABEL) as (keyof typeof RET_LABEL)[];
  const withKomp = kk.filter(k => num(r.ret?.[k]) > 0);
  const keys = withKomp.length ? withKomp : kk;
  const awal = retAwal(r), sudah = retCair(r), sisa = retSisa(r);
  const stOpts = [...new Set([...RET_STATUS, r.status].filter(Boolean) as string[])];
  const sf = (k: keyof Retensi) => (v: string) => patch({ [k]: v } as Partial<Retensi>);
  const nf = (k: keyof Retensi) => (v: string) => patch({ [k]: num(v) } as Partial<Retensi>);

  return (
    <Drawer modal={popup} title={isNew ? "Tambah retensi" : `${r.blok} · ${titleCase(r.nama)}`} subtitle={isNew ? "Data escrow / retensi bank per unit" : `${retStatus(r) || "Tanpa status"} · sisa retensi Rp ${rp(sisa)}`} onClose={onClose}
      footer={<Footer isNew={isNew} canEdit={canEdit} canDelete={canDelete} busy={busy} msg={msg} onSave={save} onDelete={del} onClose={onClose} />}>
      <Datalist id="dl-rbank" values={all.map(x => x.bank)} />
      <Datalist id="dl-rnot" values={all.map(x => x.notaris)} />
      <fieldset disabled={!canEdit} style={{ display: "contents" }}>
        <fieldset><legend>Unit &amp; pemilik</legend><div className="grid">
          <Field label="Blok *" value={r.blok} onChange={sf("blok")} />
          <Field label="Nama *" value={r.nama} onChange={v => patch({ nama: v.toUpperCase() })} w2 />
          <Select label="Pembayaran" value={r.pembayaran || "KPR"} options={[...new Set(["KPR", "Tunai", r.pembayaran].filter(Boolean) as string[])]} onChange={sf("pembayaran")} />
          <Field label="Bank KPR" value={r.bank} onChange={sf("bank")} list="dl-rbank" />
          <Field label="Notaris" value={r.notaris} onChange={sf("notaris")} list="dl-rnot" />
        </div></fieldset>
        <fieldset><legend>Nilai transaksi &amp; diterima</legend><div className="grid">
          <Field label="Nilai UTJ / UM (Rp)" type="number" value={r.nilaiUM} onChange={nf("nilaiUM")} />
          <Field label="Nilai KPR (Rp)" type="number" value={r.nilaiKPR} onChange={nf("nilaiKPR")} />
          <Fld label="Total nilai"><div className="calc num">Rp {rp(num(r.nilaiUM) + num(r.nilaiKPR))}</div></Fld>
          <Field label="Diterima UTJ / UM (Rp)" type="number" value={r.terimaUM} onChange={nf("terimaUM")} />
          <Field label="Diterima KPR (Rp)" type="number" value={r.terimaKPR} onChange={nf("terimaKPR")} />
          <Fld label="Total diterima + retensi cair"><div className="calc num">Rp {rp(num(r.terimaUM) + num(r.terimaKPR) + sudah)}</div></Fld>
          <Field label="% pencairan KPR dari bank" type="number" value={r.persenCair == null ? "" : +(num(r.persenCair) * 100).toFixed(2)} onChange={v => patch({ persenCair: v === "" ? 0 : num(v) / 100 })} />
        </div></fieldset>
        <fieldset><legend>Retensi awal (ditahan bank)</legend><div className="grid">
          {kk.map(k => <Field key={k} label={RET_LABEL[k] + " (Rp)"} type="number" value={r.ret?.[k] || ""} onChange={v => patch({ ret: { ...r.ret, [k]: num(v) } })} />)}
          <Fld label="Total retensi awal"><div className="calc num">Rp {rp(awal)}</div></Fld>
        </div></fieldset>
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
        </div>
        <div className="compline">{kk.filter(k => num(r.ret?.[k]) > 0 || cair.some(c => c.komponen === k && c.nominal)).map(k => { const cs = compSisa(r, k); return <span key={k} className={"chip " + (cs < 0 ? "no" : cs === 0 ? "acc" : "")}>{kompShort(k)}: {cs === 0 ? "lunas" : cs < 0 ? "lebih " + rpShort(-cs) : "sisa " + rpShort(cs)}</span>; })}</div></fieldset>
        <fieldset><legend>Status &amp; catatan</legend><div className="grid">
          <Select label="Status" value={r.status || "Progress Bangun"} options={stOpts} onChange={sf("status")} />
          <Fld label="Catatan" w2><textarea value={r.catatan ?? ""} onChange={e => patch({ catatan: e.target.value })} /></Fld>
        </div></fieldset>
      </fieldset>
    </Drawer>
  );
}
