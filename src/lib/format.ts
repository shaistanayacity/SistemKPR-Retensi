export const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const rp = (n: number) => (n ? Math.round(n).toLocaleString("id-ID") : "–");
export const rpShort = (v: unknown) => {
  const n = num(v);
  if (Math.abs(n) >= 1e9) return "Rp " + (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " M";
  if (Math.abs(n) >= 1e6) return "Rp " + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
};
export const juta = (n: unknown) => rpShort(n).replace("Rp ", "");

const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const tgl = (s?: string) => {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : s;
};
export const isoToday = () => new Date().toISOString().slice(0, 10);

export const initials = (s?: string) =>
  (s ?? "?").replace(/[^A-Za-z\s]/g, "").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
export const hue = (s: string) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
export const titleCase = (s?: string) =>
  String(s ?? "").split(",").map((p, i) => i === 0 ? p.toLowerCase().replace(/(^|[\s.'(-])([a-z])/g, (_m, a, b) => a + b.toUpperCase()) : p).join(",");
export const natural = (a: string, b: string) => String(a).localeCompare(String(b), "id", { numeric: true, sensitivity: "base" });

const BANKS = ["BTN SYARIAH", "BSI", "BRI", "BTN", "BNI", "MANDIRI", "BSN", "BCA", "CIMB", "DANAMON", "PERMATA", "OCBC", "MAYBANK", "JATIM", "MEGA", "PANIN"];
export const brand = (s?: string) => {
  const u = String(s ?? "").toUpperCase();
  if (!u.trim()) return "";
  for (const b of BANKS) if (u.includes(b)) return b === "BTN SYARIAH" ? "BTN Syariah" : b;
  const w = u.split(/[\s-]+/).filter(Boolean);
  return w[0] === "BANK" && w[1] ? w[1] : w[0];
};

/** Apakah teks menyebut nama bank (bukan, misalnya, "Kantor Notaris"). */
export const isBankName = (s?: string) => { const u = String(s ?? "").toUpperCase(); return BANKS.some(b => u.includes(b)); };

export const DOCS = { ktp: "KTP", npwp: "NPWP", kk: "KK", akta: "Akta nikah / belum nikah", rk3: "RK 3 bln", suket: "Suket kerja", slip: "Slip gaji", rk6: "RK 6 bln", nib: "NIB", lapkeu: "Lapkeu" } as const;
export const DOC_GROUPS: [string, (keyof typeof DOCS)[]][] = [["Data diri", ["ktp", "npwp", "kk", "akta"]], ["Data pekerjaan (karyawan)", ["rk3", "suket", "slip"]], ["Data usaha (wiraswasta)", ["rk6", "nib", "lapkeu"]]];
export const LEGAL = { potongPokok: "Potong pokok", roya: "Roya", ambilSertifikat: "Ambil sertifikat", verifikasi: "Verifikasi", validasi: "Validasi", lunasDP: "S. lunas DP", siLPP: "SI LPP", feeKPR: "S. fee KPR", pbg: "PBG" } as const;
export const LEGAL_GROUPS: [string, (keyof typeof LEGAL)[]][] = [["SHGB", ["potongPokok", "roya", "ambilSertifikat"]], ["Pajak", ["verifikasi", "validasi"]], ["Berkas akad", ["lunasDP", "siLPP", "feeKPR", "pbg"]]];
export const HASIL = ["Diajukan", "Proses", "ACC", "Ditolak", "Batal"];
export const RET_LABEL = { bangunan: "Bangunan", ajb: "AJB", sertifikat: "Sertifikat balik nama", pbg: "PBG", pdam: "PDAM", listrik: "Listrik", pajak: "Pajak" } as const;
export const kompShort = (k?: string) => (RET_LABEL[k as keyof typeof RET_LABEL] ?? k ?? "").replace(" balik nama", "");
export const RET_STATUS = ["Progress Bangun", "Menunggu AJB dan Balik Nama dari Notaris", "Disiapkan", "Sudah diajukan", "Bisa dicairkan", "Belum bisa dicairkan"];
export const RET_PILL: Record<string, string> = { "Progress Bangun": "p-neu", "Menunggu AJB dan Balik Nama dari Notaris": "p-warn", Disiapkan: "p-vio", "Sudah diajukan": "p-info", "Bisa dicairkan": "p-ok", "Belum bisa dicairkan": "p-bad", Lunas: "p-acc" };
export const RET_SHORT: Record<string, string> = { "Menunggu AJB dan Balik Nama dari Notaris": "Menunggu AJB & BN" };
export const KPR_STAT = ["Pemberkasan", "Proses Bank", "ACC Bank", "Sudah Akad", "Non KPR"] as const;
export const KPR_PILL: Record<string, string> = { Pemberkasan: "p-neu", "Proses Bank": "p-warn", "ACC Bank": "p-info", "Sudah Akad": "p-ok", "Non KPR": "p-vio" };
