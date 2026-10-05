import { useCallback, useEffect, useState } from "react";
import { loadAll, myRole, removeRow, saveKpr, saveRetensi, supabase } from "./lib/supabase";
import type { Kpr, Retensi, Role } from "./lib/types";
import { KprView } from "./components/KprView";
import { RetView } from "./components/RetView";
import { KprForm, RetForm } from "./components/Forms";

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

type Editing = { type: "kpr"; rec: Kpr; isNew: boolean } | { type: "ret"; rec: Retensi; isNew: boolean; addCair?: boolean } | null;

function Dashboard() {
  const [tab, setTab] = useState<"kpr" | "ret">("kpr");
  const [kpr, setKpr] = useState<Kpr[]>([]);
  const [ret, setRet] = useState<Retensi[]>([]);
  const [role, setRole] = useState<Role>("pembaca");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Editing>(null);
  const [toast, setToast] = useState("");

  const reload = useCallback(async () => {
    try { const d = await loadAll(); setKpr(d.kpr); setRet(d.retensi); setReady(true); setErr(""); }
    catch { setErr("Data tidak bisa dimuat. Periksa koneksi lalu muat ulang."); }
  }, []);
  useEffect(() => { void reload(); void myRole().then(setRole); }, [reload]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const admin = role === "admin", canKpr = role === "admin" || role === "sales";
  const done = async (m: string) => { setEdit(null); await reload(); say(m); };
  const nextOrd = (a: { ord: number }[]) => a.reduce((m, x) => Math.max(m, x.ord || 0), 0) + 1;

  return (
    <>
      <header className="top"><div className="top-in">
        <div className="brand"><span className="mark">SC</span><div>Berkas KPR &amp; Retensi<small>Shaistanaya City</small></div></div>
        <nav className="nav" role="tablist">
          <button role="tab" aria-selected={tab === "kpr"} onClick={() => setTab("kpr")}>Berkas KPR <span className="cnt num">{kpr.length}</span></button>
          <button role="tab" aria-selected={tab === "ret"} onClick={() => setTab("ret")}>Retensi / Escrow <span className="cnt num">{ret.length}</span></button>
        </nav>
        <div className="sync"><span className={"dot" + (ready ? " on" : "")} /><span>{ready ? role : "Menghubungkan…"}</span> · <button className="link" style={{ color: "inherit" }} onClick={() => supabase.auth.signOut()}>Keluar</button></div>
      </div></header>
      <main className="wrap">
        {err && <p className="none">{err}</p>}
        {tab === "kpr"
          ? <KprView all={kpr} canAdd={admin} onOpen={r => setEdit({ type: "kpr", rec: r, isNew: false })} onAdd={() => setEdit({ type: "kpr", isNew: true, rec: { id: "", ord: nextOrd(kpr), unit: "", nama: "", caraBayar: "KPR", berkas: {}, legal: {}, bankProses: [], pencairan: [] } })} />
          : <RetView all={ret} canEdit={admin} onOpen={r => setEdit({ type: "ret", rec: r, isNew: false })} onCair={r => setEdit({ type: "ret", rec: r, isNew: false, addCair: true })} onAdd={() => setEdit({ type: "ret", isNew: true, rec: { id: "", ord: nextOrd(ret), blok: "", nama: "", pembayaran: "KPR", ret: {}, cair: [], status: "Progress Bangun" } })} />}
      </main>

      {edit?.type === "kpr" && <KprForm key={edit.rec.id || "new"} initial={edit.rec} isNew={edit.isNew} all={kpr} canEdit={canKpr && (!edit.isNew || admin)} canDelete={admin} onClose={() => setEdit(null)}
        onSave={async r => { await saveKpr(r); await done(edit.isNew ? "Data baru tersimpan" : "Perubahan tersimpan"); }}
        onDelete={async () => { await removeRow("kpr", edit.rec.id); await done("Data dihapus"); }} />}
      {edit?.type === "ret" && <RetForm key={(edit.rec.id || "new") + (edit.addCair ? "c" : "")} initial={edit.rec} isNew={edit.isNew} all={ret} addCair={edit.addCair} canEdit={admin} canDelete={admin} onClose={() => setEdit(null)}
        onSave={async r => { await saveRetensi({ ...r, updatedAt: undefined, cair: (r.cair ?? []).filter(c => c.tgl || c.nominal).sort((a, b) => String(a.tgl).localeCompare(String(b.tgl))) }); await done(edit.isNew ? "Data baru tersimpan" : "Perubahan tersimpan"); }}
        onDelete={async () => { await removeRow("retensi", edit.rec.id); await done("Data dihapus"); }} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
