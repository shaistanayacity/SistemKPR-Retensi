import { useState } from "react";
import { Plan, parseKPRRows, parseRetRows, planKpr, planRet, KprImport, RetImport, Row } from "../lib/importExcel";
import { applyWrites } from "../lib/supabase";
import type { Kpr, Retensi } from "../lib/types";
import { Drawer } from "./ui";

type Found = { type: "kpr"; items: KprImport[]; sheet: string; fileName: string } | { type: "ret"; items: RetImport[]; sheet: string; fileName: string };

export function ImportDrawer({ kind, kpr, ret, onClose, onDone }: { kind: "kpr" | "ret"; kpr: Kpr[]; ret: Retensi[]; onClose: () => void; onDone: (n: number) => void }) {
  const [found, setFound] = useState<Found | null>(null);
  const [ow, setOw] = useState(false);
  const [state, setState] = useState<"idle" | "reading" | "error" | "unknown">("idle");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const plan: Plan | null = found ? (found.type === "kpr" ? planKpr(kpr, found.items, ow) : planRet(ret, found.items, ow)) : null;
  const n = plan?.writes.length ?? 0;

  const read = async (file?: File) => {
    if (!file) return;
    setState("reading"); setFound(null); setMsg("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 }) as Row[];
        const k = kind === "kpr" ? parseKPRRows(rows) : null;
        if (k?.length) { setFound({ type: "kpr", items: k, sheet: name, fileName: file.name }); setState("idle"); return; }
        const r = kind === "ret" ? parseRetRows(rows) : null;
        if (r?.length) { setFound({ type: "ret", items: r, sheet: name, fileName: file.name }); setState("idle"); return; }
      }
      setState("unknown");
    } catch { setState("error"); }
  };

  const apply = async () => {
    if (!plan || !n) return;
    setMsg("");
    setBusy("Menyimpan 0 / " + n + "…");
    const stamp = new Date().toISOString();
    const fail = await applyWrites(plan.writes.map(w => ({ ...w, rec: { ...w.rec, updatedAt: stamp } as Kpr & Retensi })), (d, t) => setBusy(`Menyimpan ${d} / ${t}…`));
    setBusy("");
    if (fail) setMsg(`${n - fail} tersimpan, ${fail} gagal. Muat ulang file ini lalu klik Terapkan lagi untuk mengulang yang gagal.`);
    else onDone(n);
  };

  const list = plan ? [...plan.news, ...plan.upd].slice(0, 14) : [];
  const isK = kind === "kpr";
  return (
    <Drawer title="Unggah Excel" subtitle={isK ? "Perbarui rekap KPR dari file Excel terbaru" : "Perbarui data retensi dari file Excel terbaru"} onClose={onClose}
      footer={<><span className="sp" /><button className="btn" disabled={!!busy} onClick={onClose}>Batal</button><button className="btn pri" disabled={!n || !!busy} onClick={apply}>{busy || (n ? `Terapkan ${n} perubahan` : "Tidak ada perubahan")}</button>{msg && <div className="msg">{msg}</div>}</>}>
      <fieldset><legend>Pilih file</legend>
        <label className="drop"><b>Klik untuk memilih file</b><span>{isK ? "File .xlsx rekap penjualan KPR." : "File .xlsx data retensi."}</span>
          <input className="sr" type="file" accept=".xlsx,.xlsm,.xls" onChange={e => void read(e.target.files?.[0])} /></label>
        <p className="sub" style={{ marginTop: 10 }}>{isK ? "Unit" : "Blok"} yang sudah ada diperbarui, yang baru ditambahkan. Tidak ada data yang dihapus. Anda bisa melihat dan membatalkan sebelum disimpan.</p>
      </fieldset>
      {state === "reading" && <div className="card" style={{ padding: 16 }}><b>Membaca file…</b></div>}
      {state === "unknown" && <div className="card" style={{ padding: 16 }}><b>File ini tidak dikenali</b><p className="sub">{isK ? "Pastikan ada sheet dengan kolom UNIT dan NAMA (rekap KPR)." : "Pastikan ada sheet dengan kolom Blok dan Nama (retensi)."}</p></div>}
      {state === "error" && <div className="card" style={{ padding: 16 }}><b>File tidak bisa dibaca</b><p className="sub">Coba simpan ulang sebagai .xlsx lalu unggah lagi.</p></div>}
      {found && plan && <>
        <fieldset><legend>{isK ? "Rekap KPR" : "Data retensi"} · {found.fileName}</legend>
          <p className="sub" style={{ margin: "0 0 12px" }}>Sheet "{found.sheet}", {found.items.length} baris terbaca.</p>
          <div className="impstat"><div><b className="num">{plan.news.length}</b><span>{isK ? "unit" : "blok"} baru</span></div><div><b className="num">{plan.upd.length}</b><span>diperbarui</span></div><div><b className="num">{plan.same}</b><span>tidak berubah</span></div></div>
          <label className="ck" style={{ marginTop: 12 }}><input type="checkbox" checked={ow} onChange={e => setOw(e.target.checked)} />Timpa juga isian yang kosong di Excel</label>
          <p className="sub" style={{ margin: "6px 0 0" }}>Biarkan tidak dicentang agar kolom kosong di Excel tidak menghapus data yang sudah Anda isi di dashboard.</p>
          {plan.skipped > 0 && <p className="sub" style={{ margin: "8px 0 0" }}>{plan.skipped} unit sudah punya riwayat pencairan retensi, jadi nilai retensinya tidak diubah.</p>}
        </fieldset>
        <fieldset><legend>Perubahan yang akan disimpan</legend>
          {list.length ? <div className="implist">{list.map((x, i) => (
            <div className="impr" key={i}><div className="impr-h"><b>{x.label}</b><span>{x.sub}</span>{x.baru && <span className="pill p-ok">Baru</span>}</div>
              {!x.baru && <div className="chips" style={{ maxWidth: "none" }}>{x.ch.slice(0, 4).map((c, j) => <span className="chip" key={j} title={c.l}>{c.l}{c.a || c.b ? `: ${c.a} → ${c.b}` : ""}</span>)}{x.ch.length > 4 && <span className="chip">+{x.ch.length - 4} lainnya</span>}</div>}</div>))}
            {n > list.length && <p className="sub" style={{ paddingTop: 8 }}>…dan {n - list.length} lainnya.</p>}</div>
            : <p className="none">Tidak ada perbedaan. Data di dashboard sudah sama dengan file ini.</p>}
        </fieldset></>}
    </Drawer>
  );
}
