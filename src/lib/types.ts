export type Role = "admin" | "sales" | "pembaca" | "none";

export interface BankRiwayat { tgl: string; hasil: string; ket: string }
export interface BankProses { bank: string; tgl: string; ket: string; hasil: string; riwayat?: BankRiwayat[] }

export interface Kpr {
  id: string;
  ord: number;
  unit: string;
  nama: string;
  sales?: string;
  kantor?: string;
  tglUTJ?: string;
  tglSPR?: string;
  caraBayar?: string;
  jenisPekerjaan?: string;
  hargaJual?: number;
  diskonPPN?: number;
  diskonTusukSate?: number;
  diskonKhusus?: number;
  totalDiskon?: number;
  hargaTransaksi?: number;
  utj?: number;
  totalUM?: number;
  plafond?: number;
  accBank?: number;
  tglACC?: string;
  tum?: number;
  berkas?: Partial<Record<"ktp" | "npwp" | "kk" | "akta" | "rk3" | "suket" | "slip3" | "rk6" | "nibSkdu" | "lapkeu", boolean>>;
  legal?: Record<string, boolean>;
  bankProses?: BankProses[];
  tglAkad?: string;
  tempatAkad?: string;
  notaris?: string;
  progressBangun?: number | string;
  ajb?: boolean;
  tglAJB?: string;
  stu?: boolean;
  tglSTU?: string;
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
  tglAkad?: string;
  kprId?: string;
  nilaiKPRAccBank?: number;
  totalDiterimAwal?: number;
  ret?: Partial<Record<RetKomp, number>>;
  cair?: RetCair[];
  bank?: string;
  notaris?: string;
  keterangan?: string;
  updatedAt?: string;
}
