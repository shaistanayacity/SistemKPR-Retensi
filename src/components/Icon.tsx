// Ikon garis sederhana (24x24), monokrom.
const P: Record<string, string> = {
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  wallet: "M3 7a2 2 0 0 1 2-2h12v4M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14.5h.01",
  clip: "M9 4h6l1 2h3v14H5V6h3zM9 12l2 2 4-4",
  bank: "M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  key: "M15 8.5a3.5 3.5 0 1 1-3.4 4.4L4 20.5V17h3v-2h2v-2h1.6A3.5 3.5 0 0 1 15 8.5z",
  slash: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.7-2.5.7-2.5 1.7 1 1.7 2.5 1.7 2.5-.7 2.5-1.7",
  down: "M12 4v12m-5-5 5 5 5-5M5 20h14",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  out: "M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9",
  panel: "M4 5h16v14H4zM9 5v14",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
};
export function Icon({ name, size = 16 }: { name: keyof typeof P | string; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name] ?? ""} /></svg>;
}
