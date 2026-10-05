import { useEffect, useState } from "react";
import { loadAll, myRole, supabase } from "./lib/supabase";
import { retAwal, retCair, retSisa, status } from "./lib/logic";
import type { Kpr, Retensi, Role } from "./lib/types";

export function App() {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === null) return <p className="note">Memuat…</p>;
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
    <form className="login card" onSubmit={submit}>
      <h1>Berkas KPR &amp; Retensi</h1>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Kata sandi" value={password} onChange={e => setPassword(e.target.value)} required />
      {err && <p className="err">{err}</p>}
      <button className="btn pri">Masuk</button>
    </form>
  );
}

const rp = (n: number) => (n ? Math.round(n).toLocaleString("id-ID") : "–");

function Dashboard() {
  const [tab, setTab] = useState<"kpr" | "ret">("kpr");
  const [kpr, setKpr] = useState<Kpr[]>([]);
  const [ret, setRet] = useState<Retensi[]>([]);
  const [role, setRole] = useState<Role>("pembaca");
  const [err, setErr] = useState("");
  useEffect(() => {
    loadAll().then(d => { setKpr(d.kpr); setRet(d.retensi); }).catch(() => setErr("Data tidak bisa dimuat."));
    myRole().then(setRole);
  }, []);
  return (
    <>
      <header className="top">
        <b>Berkas KPR &amp; Retensi</b>
        <nav>
          <button aria-selected={tab === "kpr"} onClick={() => setTab("kpr")}>Berkas KPR ({kpr.length})</button>
          <button aria-selected={tab === "ret"} onClick={() => setTab("ret")}>Retensi / Escrow ({ret.length})</button>
        </nav>
        <span className="who">{role} · <button className="link" onClick={() => supabase.auth.signOut()}>Keluar</button></span>
      </header>
      <main className="wrap">
        {err && <p className="err">{err}</p>}
        {tab === "kpr" ? (
          <table><thead><tr><th>Unit</th><th>Pembeli</th><th>Cara bayar</th><th>Status</th></tr></thead>
            <tbody>{kpr.map(r => <tr key={r.id}><td>{r.unit}</td><td>{r.nama}</td><td>{r.caraBayar}</td><td><span className="pill">{status(r)}</span></td></tr>)}</tbody></table>
        ) : (
          <table><thead><tr><th>Blok</th><th>Pemilik</th><th className="r">Retensi awal</th><th className="r">Cair</th><th className="r">Sisa</th></tr></thead>
            <tbody>{ret.map(r => <tr key={r.id}><td>{r.blok}</td><td>{r.nama}</td><td className="r">{rp(retAwal(r))}</td><td className="r">{rp(retCair(r))}</td><td className="r">{rp(retSisa(r))}</td></tr>)}</tbody></table>
        )}
      </main>
    </>
  );
}
