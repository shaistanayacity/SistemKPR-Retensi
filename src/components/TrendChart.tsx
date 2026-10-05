import { useState } from "react";

export interface Series { name: string; values: number[]; dashed?: boolean; area?: boolean }

const W = 640, H = 230, L = 40, R = 12, T = 12, B = 28;

// Kurva halus (monotone) antar titik.
function path(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}
const niceMax = (v: number) => { if (v <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

export function TrendChart({ labels, series, format = (n: number) => String(n), empty = "Belum ada data untuk ditampilkan." }: { labels: string[]; series: Series[]; format?: (n: number) => string; empty?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap(s => s.values);
  if (!all.some(v => v > 0)) return <p className="none" style={{ padding: "40px 0", textAlign: "center" }}>{empty}</p>;
  const max = niceMax(Math.max(...all)), ticks = [0, 1, 2, 3, 4].map(i => (max / 4) * i);
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, labels.length - 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const pts = (s: Series) => s.values.map((v, i) => [x(i), y(v)] as [number, number]);
  const desc = labels.map((l, i) => `${l}: ${series.map(s => `${s.name} ${format(s.values[i])}`).join(", ")}`).join("; ");

  return (
    <div className="chart">
      <div className="legend">{series.map(s => <span key={s.name}><i className={s.dashed ? "dsh" : "sol"} />{s.name}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} onMouseLeave={() => setHover(null)}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#bdbdbd" strokeWidth="1" /></pattern>
        </defs>
        {ticks.map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ececec" /><text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="ax">{format(Math.round(t))}</text></g>)}
        {labels.map((l, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="ax">{l}</text>)}
        {series.filter(s => s.area).map(s => { const p = pts(s); return <path key={"a" + s.name} d={`${path(p)} L${x(p.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#hatch)" opacity=".7" />; })}
        {series.map(s => <path key={s.name} d={path(pts(s))} fill="none" stroke={s.dashed ? "#111" : "#9a9a9a"} strokeWidth="2" strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinecap="round" />)}
        {hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#111" strokeOpacity=".25" />{series.map(s => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4" fill="#fff" stroke={s.dashed ? "#111" : "#8f8f8f"} strokeWidth="2" />)}</g>}
        {labels.map((_, i) => <rect key={i} x={x(i) - (W - L - R) / (labels.length * 2)} y={T} width={(W - L - R) / labels.length} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />)}
      </svg>
      {hover !== null && <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}><b>{labels[hover]}</b>{series.map(s => <span key={s.name}>{s.name}: <b className="num">{format(s.values[hover])}</b></span>)}</div>}
    </div>
  );
}
