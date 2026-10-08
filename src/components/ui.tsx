import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { hue, initials, titleCase } from "../lib/format";

export const Chev = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
);
export const Dash = () => <span className="dash">–</span>;

export const Avatar = ({ name }: { name: string }) => <span className="av" style={{ ["--h" as string]: hue(name) }}>{initials(name)}</span>;

export function Who({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <div className="who">
      <span className="av" style={{ ["--h" as string]: hue(name) }}>{initials(name)}</span>
      <div style={{ minWidth: 0 }}><b title={name}>{titleCase(name)}</b>{sub && <span className="sub">{sub}</span>}</div>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, footer, children }: { title: string; subtitle?: string; onClose: () => void; footer: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="ovl" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title">
        <div className="dr-h"><h3 id="dr-title">{title}{subtitle && <span>{subtitle}</span>}</h3><button className="x" onClick={onClose} aria-label="Tutup">×</button></div>
        <div className="dr-b">{children}</div>
        <div className="dr-f">{footer}</div>
      </aside>
    </>
  );
}

export function Fld({ label, w2, children }: { label: string; w2?: boolean; children: ReactNode }) {
  return <div className={"fld" + (w2 ? " w2" : "")}><label>{label}{children}</label></div>;
}

const titik = (d: string) => d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Isian angka dengan pemisah ribuan titik (10000000 tampil 10.000.000). onChange menerima digit murni. */
export function NumInput({ value, onChange }: { value: string | number | undefined; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const n0 = value === undefined || value === "" ? NaN : Math.round(Number(value));
  const shown = Number.isFinite(n0) && n0 >= 0 ? titik(String(n0)) : "";
  useLayoutEffect(() => {
    if (caret.current !== null && ref.current && document.activeElement === ref.current) ref.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });
  return <input ref={ref} inputMode="numeric" value={shown} onChange={e => {
    const el = e.target, pos = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, pos).replace(/\D/g, "").length;
    const digits = el.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const f = titik(digits);
    let n = 0, p = 0;
    while (p < f.length && n < before) { if (/\d/.test(f[p])) n++; p++; }
    caret.current = p;
    onChange(digits);
  }} />;
}

export function Field({ label, value, onChange, type = "text", w2, list }: { label: string; value: string | number | undefined; onChange: (v: string) => void; type?: string; w2?: boolean; list?: string }) {
  if (type === "number") return <Fld label={label} w2={w2}><NumInput value={value} onChange={onChange} /></Fld>;
  return <Fld label={label} w2={w2}><input type={type} value={value ?? ""} list={list} onChange={e => onChange(e.target.value)} /></Fld>;
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <Fld label={label}><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></Fld>;
}

export function Datalist({ id, values }: { id: string; values: (string | undefined)[] }) {
  return <datalist id={id}>{[...new Set(values.filter(Boolean) as string[])].sort().map(v => <option key={v} value={v} />)}</datalist>;
}

export function DateTools({ d1, d2, onChange }: { d1: string; d2: string; onChange: (d1: string, d2: string) => void }) {
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const now = new Date();
  const set = (k: "month" | "last" | "30") => {
    if (k === "month") onChange(iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now));
    else if (k === "last") onChange(iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0)));
    else onChange(iso(new Date(now.getTime() - 29 * 864e5)), iso(now));
  };
  return (
    <>
      <input className="sel" type="date" value={d1} aria-label="Dari tanggal" onChange={e => onChange(e.target.value, d2)} />
      <span className="dtl">s/d</span>
      <input className="sel" type="date" value={d2} aria-label="Sampai tanggal" onChange={e => onChange(d1, e.target.value)} />
      <button className="btn sm" onClick={() => set("month")}>Bulan ini</button>
      <button className="btn sm" onClick={() => set("last")}>Bulan lalu</button>
      <button className="btn sm" onClick={() => set("30")}>30 hari</button>
      {(d1 || d2) && <button className="btn sm" onClick={() => onChange("", "")}>Reset tanggal</button>}
    </>
  );
}
