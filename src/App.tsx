import { useCallback, useEffect, useState } from "react";
import { loadAll, myRole, removeRow, saveKpr, saveRetensi, supabase } from "./lib/supabase";
import type { Kpr, Retensi, Role } from "./lib/types";
import { KprView } from "./components/KprView";
import { RetView } from "./components/RetView";
import { KprForm, RetForm } from "./components/Forms";
import { ImportDrawer } from "./components/ImportDrawer";
import { Icon } from "./components/Icon";
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

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr("Email atau kata sandi tidak sesuai.");
  };
  return (
    <form className="card login-box" onSubmit={submit}>
      <h1>Berkas KPR &amp; Retensi</h1>
      <p className="lead">Shaistanaya City</p>
      <div className="fld"><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label></div>
      <div className="fld"><label>Kata sandi<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label></div>
      {err && <p className="none">{err}</p>}
      <button className="btn pri" style={{ justifyContent: "center" }}>Masuk</button>
    </form>
  );
}

type Editing = { type: "import"; kind: "kpr" | "ret" } | { type: "kpr"; rec: Kpr; isNew: boolean; popup?: boolean } | { type: "ret"; rec: Retensi; isNew: boolean; addCair?: boolean; popup?: boolean } | null;

function Dashboard() {
  const [tab, setTab] = useState<"kpr" | "ret">("kpr");
  const [kpr, setKpr] = useState<Kpr[]>([]);
  const [ret, setRet] = useState<Retensi[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Editing>(null);
  const [toast, setToast] = useState("");

  const reload = useCallback(async () => {
    try { const d = await loadAll(); setKpr(d.kpr); setRet(d.retensi); setReady(true); setErr(""); }
    catch { setErr("Data tidak bisa dimuat. Periksa koneksi lalu muat ulang."); }
  }, []);
  useEffect(() => { void myRole().then(r => { setRole(r); if (r !== "none") void reload(); }); }, [reload]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const admin = role === "admin", canKpr = role === "admin" || role === "sales";
  const done = async (m: string) => { setEdit(null); await reload(); say(m); };
  const nextOrd = (a: { ord: number }[]) => a.reduce((m, x) => Math.max(m, x.ord || 0), 0) + 1;
  const newKpr = (popup: boolean): Editing => ({ type: "kpr", isNew: true, popup, rec: { id: "", ord: nextOrd(kpr), unit: "", nama: "", caraBayar: "KPR", berkas: {}, legal: {}, bankProses: [], pencairan: [] } });
  const newRet = (popup: boolean): Editing => ({ type: "ret", isNew: true, popup, rec: { id: "", ord: nextOrd(ret), blok: "", nama: "", pembayaran: "KPR", ret: {}, cair: [], status: "Progress Bangun" } });

  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="brandbox"><span className="mark">SC</span><div><b>Shaistanaya City</b><small>Berkas KPR &amp; Retensi</small></div></div>
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
          <header className="topbar"><span className="crumb"><Icon name="grid" size={17} />Dashboard</span><span className="sep">/</span><span className="here">{tab === "kpr" ? "Berkas KPR" : "Retensi / Escrow"}</span>
            <span className="upd">Diperbarui {tglHariIni()}</span></header>
          <main className="wrap">
            {role === "none" && <div className="card" style={{ padding: 24, maxWidth: 520, margin: "10vh auto" }}><b>Akun ini belum punya akses</b><p className="lead">Hubungi admin untuk diberi peran (admin, sales, atau pembaca), lalu masuk kembali.</p></div>}
            {role !== "none" && err && <p className="none">{err}</p>}
            {role !== "none" && (tab === "kpr"
              ? <KprView all={kpr} canAdd={admin} onImport={() => setEdit({ type: "import", kind: "kpr" })} onOpen={r => setEdit({ type: "kpr", rec: r, isNew: false })} onAdd={() => setEdit(newKpr(false))} onQuickAdd={() => setEdit(newKpr(true))} />
              : <RetView all={ret} canEdit={admin} onImport={() => setEdit({ type: "import", kind: "ret" })} onOpen={r => setEdit({ type: "ret", rec: r, isNew: false })} onCair={r => setEdit({ type: "ret", rec: r, isNew: false, addCair: true })} onAdd={() => setEdit(newRet(false))} onQuickAdd={() => setEdit(newRet(true))} />)}
          </main>
        </div>
      </div>

      {edit?.type === "kpr" && <KprForm key={edit.rec.id || "new"} initial={edit.rec} isNew={edit.isNew} popup={edit.popup} all={kpr} canEdit={canKpr && (!edit.isNew || admin)} canDelete={admin} onClose={() => setEdit(null)}
        onSave={async r => { await saveKpr(r); await done(edit.isNew ? "Data baru tersimpan" : "Perubahan tersimpan"); }}
        onDelete={async () => { await removeRow("kpr", edit.rec.id); await done("Data dihapus"); }} />}
      {edit?.type === "ret" && <RetForm key={(edit.rec.id || "new") + (edit.addCair ? "c" : "")} initial={edit.rec} isNew={edit.isNew} popup={edit.popup} all={ret} addCair={edit.addCair} canEdit={admin} canDelete={admin} onClose={() => setEdit(null)}
        onSave={async r => { await saveRetensi({ ...r, updatedAt: undefined, cair: (r.cair ?? []).filter(c => c.tgl || c.nominal).sort((a, b) => String(a.tgl).localeCompare(String(b.tgl))) }); await done(edit.isNew ? "Data baru tersimpan" : "Perubahan tersimpan"); }}
        onDelete={async () => { await removeRow("retensi", edit.rec.id); await done("Data dihapus"); }} />}
      {edit?.type === "import" && <ImportDrawer kind={edit.kind} kpr={kpr} ret={ret} onClose={() => setEdit(null)} onDone={n => void done(`${n} data berhasil diperbarui`)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
