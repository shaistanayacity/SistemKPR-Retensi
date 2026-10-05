export type Role = "admin" | "sales" | "pembaca" | "none";

export interface BankProses { bank: string; tgl: string; ket: string; hasil: string }
export interface Pencairan { tgl: string; nominal: number }

export interface Kpr {
  id: string;
  ord: number;
  unit: string;
  nama: string;
  tglUTJ?: string;
  tglSPR?: string;
  caraBayar?: string;
  jenisPekerjaan?: string;
  hargaBank?: number;
  hargaTransaksi?: number;
  utj?: number;
  angsuranUM?: number;
  cashbackUM?: number;
  tum?: number;
  totalUM?: number;
  plafond?: number;
  accBank?: number;
  tglACC?: string;
  berkas?: Partial<Record<"ktp" | "npwp" | "kk" | "akta" | "rk3" | "suket" | "slip" | "rk6" | "nib" | "lapkeu", boolean>>;
  legal?: Record<string, boolean>;
  bankProses?: BankProses[];
  tglAkad?: string;
  tempatAkad?: string;
  notaris?: string;
  pencairan?: Pencairan[];
  progressBangun?: number | string;
  ajb?: boolean;
  tglAJB?: string;
  stu?: boolean;
  tglSTU?: string;
  keterangan?: string;
  promo?: string;
  updatedAt?: string;
}

export const RET_KOMP = ["bangunan", "ajb", "sertifikat", "pbg", "pdam", "listrik", "pajak"] as const;
export type RetKomp = (typeof RET_KOMP)[number];

export interface RetCair { tgl: string; nominal: number; komponen?: string; ket?: string }
export interface Retensi {
  id: string;
  ord: number;
  blok: string;
  nama: string;
  pembayaran?: string;
  persenCair?: number;
  nilaiUM?: number;
  nilaiKPR?: number;
  terimaUM?: number;
  terimaKPR?: number;
  ret?: Partial<Record<RetKomp, number>>;
  cair?: RetCair[];
  status?: string;
  bank?: string;
  notaris?: string;
  catatan?: string;
  updatedAt?: string;
}
