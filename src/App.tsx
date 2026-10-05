import { useCallback, useEffect, useState } from "react";
import { loadAll, myRole, removeRow, saveKpr, saveRetensi, supabase } from "./lib/supabase";
import type { Kpr, Retensi, Role } from "./lib/types";
import { KprView } from "./components/KprView";
import { RetView } from "./components/RetView";
import { KprForm, RetForm } from "./components/Forms";
import { ImportDrawer } from "./components/ImportDrawer";
import { Icon } from "./components/Icon";
import { Login } from "./components/Login";
import { tgl } from "./lib/format";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", sales: "Sales", pembaca: "Pembaca", none: "Tanpa akses" };
const tglHariIni = () => tgl(new Date().toISOString().slice(0, 10));

export function App() {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === null) return <p className="none" style={{ padding: 24 }}>Memuat…</p>;
  return session ? <Dashboard /> : <Login />;
}

type Editing = { type: "import"; kind: "kpr" | "ret" } | { type: "kpr"; rec: Kpr; isNew: boolean } | { type: "ret"; rec: Retensi; isNew: boolean; addCair?: boolean } | null;

function Dashboard() {
  const [tab, setTab] = useState<"kpr" | "ret">("kpr");
  const [kpr, setKpr] = useState<Kpr[]>([]);
  const [ret, setRet] = useState<Retensi[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Editing>(null);
  const [toast, setToast] = useState("");
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem("side-hidden") === "1"; } catch { return false; } });
  const toggleSide = () => setHidden(h => { const n = !h; try { localStorage.setItem("side-hidden", n ? "1" : "0"); } catch { /* abaikan */ } return n; });

  const reload = useCallback(async () => {
    try { const d = await loadAll(); setKpr(d.kpr); setRet(d.retensi); setReady(true); setErr(""); }
    catch { setErr("Data tidak bisa dimuat. Periksa koneksi lalu muat ulang."); }
  }, []);
  useEffect(() => { void myRole().then(r => { setRole(r); if (r !== "none") void reload(); }); }, [reload]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const admin = role === "admin", canKpr = role === "admin" || role === "sales";
  const done = async (m: string) => { setEdit(null); await reload(); say(m); };
  const nextOrd = (a: { ord: number }[]) => a.reduce((m, x) => Math.max(m, x.ord || 0), 0) + 1;

  return (
    <>
      <div className={"shell" + (hidden ? " no-side" : "")}>
        <aside className="side">
          <div className="brandbox"><img className="logo" src="/logo.png" alt="Shaistanaya City" width="34" height="34" /><div><b>Shaistanaya City</b><small>Berkas KPR &amp; Retensi</small></div></div>
          <nav className="snav" role="tablist" aria-label="Menu">
            <button role="tab" aria-selected={tab === "kpr"} onClick={() => setTab("kpr")}><Icon name="file" size={17} />Berkas KPR <span className="cnt num">{kpr.length}</span></button>
            <button role="tab" aria-selected={tab === "ret"} onClick={() => setTab("ret")}><Icon name="wallet" size={17} />Retensi / Escrow <span className="cnt num">{ret.length}</span></button>
          </nav>
          <div className="sidefoot">
            <div className="usercard">
              <span className="dot on" /><div><b>{role ? ROLE_LABEL[role] : "Menghubungkan…"}</b><small>{ready ? "Data tersambung" : "Memuat data…"}</small></div>
              <button className="icon-btn" aria-label="Keluar" title="Keluar" onClick={() => supabase.auth.signOut()}><Icon name="out" size={15} /></button>
            </div>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <button className="icon-btn" aria-label={hidden ? "Buka menu samping" : "Tutup menu samping"} title={hidden ? "Buka menu samping" : "Tutup menu samping"} aria-expanded={!hidden} onClick={toggleSide}><Icon name="panel" size={16} /></button>
            <span className="crumb"><Icon name="grid" size={17} />Dashboard</span><span className="sep">/</span><span className="here">{tab === "kpr" ? "Berkas KPR" : "Retensi / Escrow"}</span>
            {hidden && <div className="tabs-mini" role="tablist" aria-label="Menu">
              <button role="tab" aria-selected={tab === "kpr"} onClick={() => setTab("kpr")}>Berkas KPR <span className="num">{kpr.length}</span></button>
              <button role="tab" aria-selected={tab === "ret"} onClick={() => setTab("ret")}>Retensi / Escrow <span className="num">{ret.length}</span></button>
            </div>}
            <span className="upd">Diperbarui {tglHariIni()}</span>
            {hidden && <button className="icon-btn" aria-label="Keluar" title={"Keluar (" + (role ? ROLE_LABEL[role] : "") + ")"} onClick={() => supabase.auth.signOut()}><Icon name="out" size={15} /></button>}
          </header>
          <main className="wrap">
            {role === "none" && <div className="card" style={{ padding: 24, maxWidth: 520, margin: "10vh auto" }}><b>Akun ini belum punya akses</b><p className="lead">Hubungi admin untuk diberi peran (admin, sales, atau pembaca), lalu masuk kembali.</p></div>}
            {role !== "none" && err && <p className="none">{err}</p>}
            {role !== "none" && (tab === "kpr"
              ? <KprView all={kpr} canAdd={admin} onImport={() => setEdit({ type: "import", kind: "kpr" })} onOpen={r => setEdit({ type: "kpr", rec: r, isNew: false })} onAdd={() => setEdit({ type: "kpr", isNew: true, rec: { id: "", ord: nextOrd(kpr), unit: "", nama: "", caraBayar: "KPR", berkas: {}, legal: {}, bankProses: [], pencairan: [] } })} />
              : <RetView all={ret} canEdit={admin} onImport={() => setEdit({ type: "import", kind: "ret" })} onOpen={r => setEdit({ type: "ret", rec: r, isNew: false })} onCair={r => setEdit({ type: "ret", rec: r, isNew: false, addCair: true })} onAdd={() => setEdit({ type: "ret", isNew: true, rec: { id: "", ord: nextOrd(ret), blok: "", nama: "", pembayaran: "KPR", ret: {}, cair: [], status: "Progress Bangun" } })} />)}
          </main>
        </div>
      </div>

      {edit?.type === "kpr" && <KprForm key={edit.rec.id || "new"} initial={edit.rec} isNew={edit.isNew} all={kpr} canEdit={canKpr && (!edit.isNew || admin)} canDelete={admin} onClose={() => setEdit(null)}
        onSave={async r => { await saveKpr(r); await done(edit.isNew ? "Data baru tersimpan" : "Perubahan tersimpan"); }}
        onDelete={async () => { await removeRow("kpr", edit.rec.id); await done("Data dihapus"); }} />}
      {edit?.type === "ret" && <RetForm key={(edit.rec.id || "new") + (edit.addCair ? "c" : "")} initial={edit.rec} isNew={edit.isNew} all={ret} addCair={edit.addCair} canEdit={admin} canDelete={admin} onClose={() => setEdit(null)}
        onSave={async r => { await saveRetensi({ ...r, updatedAt: undefined, cair: (r.cair ?? []).filter(c => c.tgl || c.nominal).sort((a, b) => String(a.tgl).localeCompare(String(b.tgl))) }); await done(edit.isNew ? "Data baru tersimpan" : "Perubahan tersimpan"); }}
        onDelete={async () => { await removeRow("retensi", edit.rec.id); await done("Data dihapus"); }} />}
      {edit?.type === "import" && <ImportDrawer kind={edit.kind} kpr={kpr} ret={ret} onClose={() => setEdit(null)} onDone={n => void done(`${n} data berhasil diperbarui`)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
