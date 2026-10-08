import { useMemo, useState } from "react";
import { kprBrand, kprKeRetensi, normUnit, status } from "../lib/logic";
import { KPR_PILL, natural, titleCase } from "../lib/format";
import type { Kpr, Retensi } from "../lib/types";

/** Pilih blok dari daftar KPR untuk mengisi form Retensi. Opsional: semua kolom tetap bisa diisi manual. */
export function KprPicker({ kpr, sudahAda, linkedId, onPick, onClear }: { kpr: Kpr[]; sudahAda: Set<string>; linkedId?: string; onPick: (p: Partial<Retensi>, kosong: string[]) => void; onClear: () => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<string[] | null>(null);
  const linked = kpr.find(k => k.id === linkedId);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...kpr]
      .filter(k => !s || `${k.unit} ${k.nama}`.toLowerCase().includes(s))
      .sort((a, b) => natural(a.unit, b.unit));
  }, [kpr, q]);

  const pilih = (k: Kpr) => {
    const { kosong, ...isi } = kprKeRetensi(k);
    onPick(isi, kosong);
    setInfo(kosong);
    setOpen(false); setQ("");
  };

  return (
    <fieldset className="picker">
      <legend>Ambil dari data KPR <span className="opt">(opsional)</span></legend>
      {linked ? (
        <div className="pk-linked">
          <span className="pill p-ok">Terhubung</span>
          <span><b>{linked.unit}</b> · {titleCase(linked.nama)}</span>
          <button type="button" className="btn sm" onClick={() => { onClear(); setInfo(null); }}>Lepas</button>
        </div>
      ) : (
        <div className="pk-box">
          <input className="pk-in" type="search" placeholder={kpr.length ? "Cari blok atau nama pembeli di data KPR" : "Data KPR belum ada, isi manual di bawah"} disabled={!kpr.length}
            value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} aria-label="Cari blok di data KPR" />
          {open && kpr.length > 0 && (
            <div className="pk-list" role="listbox">
              {hasil.length ? hasil.map(k => {
                const dipakai = sudahAda.has(normUnit(k.unit)), st = status(k);
                return (
                  <button type="button" key={k.id} role="option" aria-selected="false" className="pk-i" disabled={dipakai} onClick={() => pilih(k)}>
                    <b>{k.unit}</b><span className="pk-n">{titleCase(k.nama)}</span>
                    <span className="pk-m">{kprBrand(k) || "–"}</span>
                    {dipakai ? <span className="pill p-neu">Sudah ada di Retensi</span> : <span className={"pill " + KPR_PILL[st]}>{st}</span>}
                  </button>
                );
              }) : <p className="none" style={{ padding: "10px 12px" }}>Tidak ada blok yang cocok. Isi manual di bawah.</p>}
            </div>
          )}
        </div>
      )}
      <p className="sub" style={{ marginTop: 8 }}>
        {linked || info
          ? <>Terisi dari KPR: <b>{["nama", "cluster", "tipe", "cara bayar", "bank", "notaris", "nilai KPR ACC bank", "tanggal akad"].filter(l => !(info ?? []).includes(l)).join(", ")}</b>. Semuanya masih bisa diubah.{info && info.length ? <> Kosong di KPR, isi manual: <b>{info.join(", ")}</b>.</> : null}</>
          : <>Tidak ada di daftar? Langsung isi kolom di bawah secara manual.</>}
      </p>
    </fieldset>
  );
}
