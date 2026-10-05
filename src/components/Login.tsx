import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const SLIDES = [
  { h: "Berkas KPR rapi. Retensi terpantau.", p: "Satu tempat untuk memantau kelengkapan berkas, proses bank, dan pencairan retensi setiap unit." },
  { h: "Dari pemberkasan sampai akad.", p: "Lihat posisi tiap unit: pemberkasan, proses bank, ACC, hingga akad, tanpa membuka banyak file." },
  { h: "Sisa retensi selalu jelas.", p: "Catat pencairan per tanggal dan komponen. Sisa dan status dihitung otomatis." },
];
const SLIDE_MS = 6000;

const Eye = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}
  </svg>
);

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const hero = useRef<HTMLDivElement>(null);

  // Warna latar halaman ikut biru tua selama di halaman masuk, supaya tidak ada tepi terang.
  useEffect(() => {
    const html = document.documentElement, body = document.body, prev = [html.style.background, body.style.background];
    html.style.background = body.style.background = "#0a1224";
    return () => { html.style.background = prev[0]; body.style.background = prev[1]; };
  }, []);

  // Ganti teks otomatis; berhenti saat disorot atau jika pengguna meminta gerakan dikurangi.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [slide, paused]);

  // Paralaks halus mengikuti kursor.
  const onMove = (e: React.MouseEvent) => {
    const el = hero.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty("--my", String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setErr("Email atau kata sandi tidak sesuai."); setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="auth-hero" ref={hero} onMouseMove={onMove} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <svg className="auth-art" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0a1224" /><stop offset="1" stopColor="#1a2a4c" /></linearGradient>
            <linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5f7bb0" stopOpacity=".55" /><stop offset="1" stopColor="#1e3157" stopOpacity=".15" /></linearGradient>
            <linearGradient id="gB" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8aa2d0" stopOpacity=".38" /><stop offset="1" stopColor="#14213d" stopOpacity=".1" /></linearGradient>
            <radialGradient id="gold" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#f0c75e" stopOpacity=".34" /><stop offset="1" stopColor="#f0c75e" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="1200" height="800" fill="url(#bg)" />
          <g className="px p1"><g className="dr d1"><circle cx="330" cy="560" r="330" fill="url(#gold)" /></g></g>
          <g className="px p2"><g className="dr d2"><polygon points="-40,140 430,-20 590,400 -40,560" fill="url(#gA)" /></g></g>
          <g className="px p3"><g className="dr d3"><polygon points="400,60 790,190 720,640 530,430" fill="url(#gB)" /></g></g>
          <g className="px p2"><g className="dr d4"><polygon points="700,-20 1240,-20 1240,430 900,310" fill="url(#gA)" /></g></g>
          <g className="px p3"><g className="dr d5"><polygon points="480,520 900,380 1240,520 1240,840 560,840" fill="url(#gB)" /></g></g>
          <g className="px p1" stroke="#fff" strokeOpacity=".1" strokeWidth="1" fill="none"><g className="dr d6"><path d="M-40 140 L590 400 M430 -20 L530 430 M790 190 L900 310 M720 640 L560 840 M900 380 L700 -20" /></g></g>
        </svg>
        <div className="auth-shade" />

        <div className="auth-brand"><img src="/logo.png?v=2" alt="" width="40" height="40" /><span>Shaistanaya City</span></div>

        <div className="auth-copy" aria-live="polite">
          {SLIDES.map((s, i) => (
            <div key={i} className={"slide" + (i === slide ? " on" : "")} aria-hidden={i !== slide}>
              <h2>{s.h}</h2><p>{s.p}</p>
            </div>
          ))}
          <div className="dots" role="tablist" aria-label="Pilih pesan">
            {SLIDES.map((_, i) => <button key={i} role="tab" aria-selected={i === slide} aria-label={`Pesan ${i + 1}`} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} />)}
          </div>
        </div>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <img className="auth-mini" src="/logo.png?v=2" alt="Shaistanaya City" width="48" height="48" />
        <h1>Selamat Datang</h1>
        <p className="sub-lead">Masuk untuk memantau berkas KPR dan retensi.</p>

        <label className="af">Email
          <input type="email" autoComplete="username" inputMode="email" placeholder="nama@perusahaan.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="af">Kata sandi
          <span className="pw">
            <input type={show ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" className="eye" aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={show} onClick={() => setShow(s => !s)}><Eye off={show} /></button>
          </span>
        </label>

        {err && <p className="auth-err" role="alert">{err}</p>}
        <button className="auth-go" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>

        <p className="auth-foot">Belum punya akun atau lupa kata sandi? <b>Hubungi admin.</b></p>
      </form>
    </div>
  );
}
