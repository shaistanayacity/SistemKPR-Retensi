/* ---------- import excel ---------- */
const UP_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4m-4 4 4-4 4 4M5 15v4h14v-4"/></svg>`;
const BULAN = {januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,agust:8,september:9,oktober:10,november:11,desember:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,agu:8,agt:8,sep:9,okt:10,nov:11,des:12};
const p2 = n => String(n).padStart(2,"0");
function xd(v){
  if (v == null || v === "") return "";
  if (typeof v === "number") { if (v > 30000 && v < 60000) return new Date(Date.UTC(1899,11,30) + Math.floor(v)*86400000).toISOString().slice(0,10); return ""; }
  const s = String(v).trim(); let m;
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s))) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/.exec(s))) return `20${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s)) && BULAN[m[2].toLowerCase()]) return `${m[3]}-${p2(BULAN[m[2].toLowerCase()])}-${p2(m[1])}`;
  return "";
}
const xn = v => (typeof v === "number" && Number.isFinite(v)) ? (Number.isInteger(v) ? v : Math.round(v*100)/100) : 0;
const xt = v => { if (v == null) return ""; const s = String(v).trim(); return (s === "-" || s === "#DIV/0!") ? "" : s; };
const xc = v => v != null && !["","-","x","X"].includes(String(v).trim());
const normUnit = s => String(s||"").replace(/\s*-\s*/g,"-").replace(/\s+/g," ").trim().toUpperCase();
const normBank = s => String(s||"").replace(/\s+/g," ").trim().toUpperCase();

function parseKPRRows(rows){
  const h = rows.findIndex(r => String(r?.[1] ?? "").trim().toUpperCase() === "UNIT");
  if (h < 0) return null;
  const out = []; let n = 0;
  for (const r of rows.slice(h + 2)) {
    if (!r) continue;
    const unit = String(r[1] ?? "").replace(/\s*-\s*/g,"-").trim(), nama = xt(r[2]);
    if (!unit || !nama) continue;
    n++;
    const bankNames = [25,26,27,28].map(c => xt(r[c])).filter(Boolean);
    const bankProses = bankNames.map(b => ({bank:b, tgl:"", ket:"", hasil:""}));
    if (bankProses.length && xt(r[29])) bankProses[bankProses.length-1].ket = xt(r[29]);
    const promoParts = [["Subsidi asuransi: ",68],["Bonus: ",69],["Subsidi angsuran: ",70],["Diskon PPN: ",71]].filter(([,c]) => xt(r[c])).map(([l,c]) => l + xt(r[c]));
    out.push({ ord: typeof r[0] === "number" ? r[0] : n, unit, nama, tglUTJ:xd(r[3]), tglSPR:xd(r[4]), caraBayar:xt(r[5]),
      hargaBank:xn(r[6]), hargaTransaksi:xn(r[7]), utj:xn(r[8]), angsuranUM:xn(r[9]), cashbackUM:xn(r[10]), totalUM:xn(r[11]),
      plafond:xn(r[12]), accBank:xn(r[13]), tum:xn(r[14]),
      berkas:Object.fromEntries(["ktp","npwp","kk","akta","rk3","suket","slip","rk6","nib","lapkeu"].map((k,i) => [k, xc(r[15+i])])),
      bankProses,
      legal:Object.fromEntries(["potongPokok","roya","ambilSertifikat","verifikasi","validasi","lunasDP","siLPP","feeKPR","pbg"].map((k,i) => [k, xc(r[30+i])])),
      tglAkad:xd(r[39]), tempatAkad:xt(r[40]), notaris:xt(r[41]),
      pencairan:[42,45,48,51,54].filter(c => xn(r[c+1]) || xd(r[c])).map(c => ({tgl:xd(r[c]), nominal:xn(r[c+1])})),
      progressBangun:xn(r[62]), ajb:xc(r[63]), tglAJB:xd(r[64]), stu:xc(r[65]), tglSTU:xd(r[66]),
      keterangan:xt(r[67]), promo:promoParts.join("; ") });
  }
  return out;
}
function parseRetRows(rows){
  const h = rows.findIndex(r => String(r?.[0] ?? "").trim().toLowerCase() === "blok");
  if (h < 0) return null;
  const out = [];
  for (const r of rows.slice(h + 1)) {
    if (!r) continue;
    const blok = xt(r[0]), nama = xt(r[1]);
    if (!blok || !nama) continue;
    out.push({ blok, nama, pembayaran:xt(r[2]), nilaiUM:xn(r[3]), nilaiKPR:xn(r[4]), terimaUM:xn(r[6]), terimaKPR:xn(r[7]), persenCair:xn(r[9]),
      ret:{bangunan:Math.round(xn(r[10])), ajb:xn(r[11]), sertifikat:xn(r[12]), pbg:xn(r[13]), pdam:xn(r[14]), listrik:xn(r[15]), pajak:xn(r[16])},
      status:xt(r[18]), bank:xt(r[19]), notaris:xt(r[20]), catatan:[xt(r[21]), xt(r[22])].filter(Boolean).join("; ") });
  }
  return out;
}

const FL_KPR = {unit:"Unit",nama:"Nama",tglUTJ:"Tgl UTJ",tglSPR:"Tgl SPR",caraBayar:"Cara bayar",hargaBank:"Harga bank",hargaTransaksi:"Harga transaksi",utj:"UTJ",angsuranUM:"Angsuran UM",cashbackUM:"Cashback UM",totalUM:"Uang muka",plafond:"Plafond",accBank:"Nominal ACC",tum:"TUM",tglAkad:"Tgl akad",tempatAkad:"Tempat akad",notaris:"Notaris",progressBangun:"Progres bangun",ajb:"AJB",tglAJB:"Tgl AJB",stu:"STU",tglSTU:"Tgl STU",keterangan:"Keterangan",promo:"Promo",berkas:"Berkas",legal:"Legal & pajak",pencairan:"Pencairan KPR",bankProses:"Bank"};
const FL_RET = {nama:"Nama",pembayaran:"Pembayaran",nilaiUM:"Nilai UM",nilaiKPR:"Nilai KPR",terimaUM:"Diterima UM",terimaKPR:"Diterima KPR",persenCair:"% cair",ret:"Retensi",status:"Status",bank:"Bank",notaris:"Notaris",catatan:"Catatan"};
const isEmptyV = v => v === "" || v == null || v === 0 || v === false;
function nz(v){
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  if (v && typeof v === "object") { const e = Object.entries(v).filter(([,x]) => !isEmptyV(x)).sort(([a],[b]) => a < b ? -1 : 1); return e.length ? JSON.stringify(e) : null; }
  return isEmptyV(v) ? null : v;
}
const diffKeys = (a, b, labels) => Object.keys(labels).filter(k => nz(a[k]) !== nz(b[k]));
function fv(k, v){
  if (v == null || v === "" || v === 0 || v === false) return "kosong";
  if (v === true) return "ya";
  if (typeof v === "number") return k === "persenCair" || k === "progressBangun" ? Math.round(v*100) + "%" : (Math.abs(v) >= 1e6 ? juta(v) : String(v));
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return tgl(v);
  if (typeof v === "string") return v.length > 28 ? v.slice(0,27) + "…" : v;
  return "";
}
function mergeKPR(old, x, ow){
  const m = clone(old);
  ["unit","nama","tglUTJ","tglSPR","caraBayar","hargaBank","hargaTransaksi","utj","angsuranUM","cashbackUM","totalUM","plafond","accBank","tum","tglAkad","tempatAkad","notaris","progressBangun","tglAJB","tglSTU","keterangan","promo"].forEach(k => { if (ow || !isEmptyV(x[k])) m[k] = x[k]; });
  if (ow || x.ajb) m.ajb = x.ajb; if (ow || x.stu) m.stu = x.stu;
  ["berkas","legal"].forEach(g => { m[g] = ow ? {...x[g]} : Object.fromEntries(Object.keys(x[g]).map(k => [k, !!(old[g]?.[k] || x[g][k])])); });
  if (ow || x.pencairan.length) m.pencairan = x.pencairan;
  const have = new Set((m.bankProses||[]).map(b => normBank(b.bank)));
  m.bankProses = [...(m.bankProses||[])];
  x.bankProses.forEach(b => { if (!have.has(normBank(b.bank))) { m.bankProses.push({...b}); have.add(normBank(b.bank)); } });
  if (!m.ord) m.ord = x.ord;
  return m;
}
function mergeRet(old, x, ow){
  const m = clone(old), hasCair = (old.cair||[]).length > 0;
  ["nama","pembayaran","nilaiUM","nilaiKPR","terimaUM","terimaKPR","persenCair","status","bank","notaris","catatan"].forEach(k => { if (ow || !isEmptyV(x[k])) m[k] = x[k]; });
  let skipped = false;
  if (!hasCair) m.ret = {...x.ret}; else if (nz(old.ret) !== nz(x.ret)) skipped = true;
  return {m, skipped};
}

function planImport(){
  const imp = S.imp, ow = !!$("#imp-ow")?.checked;
  const plan = {news:[], upd:[], same:0, skipped:0, writes:[]};
  if (imp.type === "kpr") {
    const idx = new Map(S.kpr.map(r => [normUnit(r.unit), r])), seen = new Map(imp.items.map(x => [normUnit(x.unit), x]));
    seen.forEach(x => {
      const old = idx.get(normUnit(x.unit));
      if (!old) { plan.news.push({label:x.unit, sub:titleCase(x.nama)}); plan.writes.push({col:"kpr", id:null, rec:{...x, tglACC:""}}); return; }
      const m = mergeKPR(old, x, ow), ch = diffKeys(old, m, FL_KPR);
      if (!ch.length) { plan.same++; return; }
      plan.upd.push({label:old.unit, sub:titleCase(m.nama), ch:ch.map(k => ({k, l:FL_KPR[k], a:fv(k, old[k]), b:fv(k, m[k])}))});
      const {id, ...rest} = m; plan.writes.push({col:"kpr", id:old.id, rec:rest});
    });
  } else {
    const idx = new Map(S.ret.map(r => [String(r.blok).trim().toUpperCase(), r])), seen = new Map(imp.items.map(x => [x.blok.trim().toUpperCase(), x]));
    seen.forEach((x, key) => {
      const old = idx.get(key);
      if (!old) { plan.news.push({label:x.blok, sub:titleCase(x.nama)}); plan.writes.push({col:"retensi", id:null, rec:{...x, cair:[], ord:S.ret.length + plan.news.length}}); return; }
      const {m, skipped} = mergeRet(old, x, ow); if (skipped) plan.skipped++;
      const ch = diffKeys(old, m, FL_RET);
      if (!ch.length) { plan.same++; return; }
      plan.upd.push({label:old.blok, sub:titleCase(m.nama), ch:ch.map(k => ({k, l:FL_RET[k], a:k === "ret" ? "" : fv(k, old[k]), b:k === "ret" ? "" : fv(k, m[k])}))});
      const {id, ...rest} = m; plan.writes.push({col:"retensi", id:old.id, rec:rest});
    });
  }
  return plan;
}

function openImport(){
  S.edit = {type:"import"}; S.imp = null; S.plan = null;
  $("#dr-title").innerHTML = `Unggah Excel<span>Perbarui data dari file Excel terbaru</span>`;
  $("#dr-form").innerHTML = `
    <fieldset><legend>Pilih file</legend>
      <label class="drop" for="imp-file"><b>Klik untuk memilih file, atau seret ke sini</b><span>File .xlsx rekap penjualan KPR atau data retensi. Jenisnya dikenali otomatis.</span></label>
      <input class="sr" id="imp-file" type="file" accept=".xlsx,.xlsm,.xls">
      <p class="sub" style="margin-top:10px">Unit yang sudah ada diperbarui, unit baru ditambahkan. Tidak ada data yang dihapus. Anda bisa melihat dan membatalkan sebelum disimpan.</p>
    </fieldset>
    <div id="imp-out"></div>`;
  $("#dr-foot").innerHTML = `<span class="sp"></span><button class="btn" id="dr-cancel">Batal</button><button class="btn pri" id="imp-apply" disabled>Terapkan</button><div class="msg" id="dr-msg"></div>`;
  showDrawer(true);
}
async function handleImportFile(file){
  const out = $("#imp-out"); if (!file || !out) return;
  out.innerHTML = `<div class="card" style="padding:16px"><b>Membaca ${esc(file.name)}…</b></div>`;
  try {
    await loadScript(XLSXJS);
    const wb = XLSX.read(await file.arrayBuffer(), {type:"array"});
    let found = null;
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1});
      const k = parseKPRRows(rows); if (k && k.length) { found = {type:"kpr", items:k, sheet:name}; break; }
      const r = parseRetRows(rows); if (r && r.length) { found = {type:"ret", items:r, sheet:name}; break; }
    }
    if (!found) { out.innerHTML = `<div class="card" style="padding:16px"><b>File ini tidak dikenali</b><p class="sub">Pastikan ada sheet dengan kolom UNIT dan NAMA (rekap KPR) atau kolom Blok dan Nama (retensi).</p></div>`; return; }
    S.imp = {...found, fileName:file.name};
    renderImport();
  } catch (err) { out.innerHTML = `<div class="card" style="padding:16px"><b>File tidak bisa dibaca</b><p class="sub">Coba simpan ulang sebagai .xlsx lalu unggah lagi.</p></div>`; }
}
function renderImport(){
  const imp = S.imp, out = $("#imp-out"); if (!imp || !out) return;
  const ow = !!$("#imp-ow")?.checked;
  const plan = S.plan = planImport(), n = plan.writes.length;
  const isK = imp.type === "kpr";
  const rows = [...plan.news.map(x => ({...x, baru:true})), ...plan.upd].slice(0, 14);
  out.innerHTML = `
    <fieldset><legend>${isK ? "Rekap KPR" : "Data retensi"} · ${esc(imp.fileName)}</legend>
      <p class="sub" style="margin:0 0 12px">Sheet "${esc(imp.sheet)}", ${imp.items.length} baris terbaca.</p>
      <div class="impstat"><div><b class="num">${plan.news.length}</b><span>unit baru</span></div><div><b class="num">${plan.upd.length}</b><span>diperbarui</span></div><div><b class="num">${plan.same}</b><span>tidak berubah</span></div></div>
      <label class="ck" style="margin-top:12px"><input type="checkbox" id="imp-ow"${ow ? " checked" : ""}>Timpa juga isian yang kosong di Excel</label>
      <p class="sub" style="margin:6px 0 0">Biarkan tidak dicentang agar kolom kosong di Excel tidak menghapus data yang sudah Anda isi di dashboard.</p>
      ${plan.skipped ? `<p class="sub" style="margin:8px 0 0;color:var(--warn-fg)">${plan.skipped} unit sudah punya riwayat pencairan retensi, jadi nilai retensinya tidak diubah.</p>` : ""}
    </fieldset>
    <fieldset><legend>Perubahan yang akan disimpan</legend>
      ${rows.length ? `<div class="implist">${rows.map(x => `<div class="impr"><div class="impr-h"><b>${esc(x.label)}</b><span>${esc(x.sub)}</span>${x.baru ? `<span class="pill p-ok">Baru</span>` : ""}</div>${x.baru ? "" : `<div class="chips" style="max-width:none">${x.ch.slice(0,4).map(c => `<span class="chip" title="${esc(c.l)}">${esc(c.l)}${c.a || c.b ? `: ${esc(c.a)} → ${esc(c.b)}` : ""}</span>`).join("")}${x.ch.length > 4 ? `<span class="chip">+${x.ch.length-4} lainnya</span>` : ""}</div>`}</div>`).join("")}${n > rows.length ? `<p class="sub" style="padding-top:8px">…dan ${n - rows.length} unit lainnya.</p>` : ""}</div>` : `<p class="none">Tidak ada perbedaan. Data di dashboard sudah sama dengan file ini.</p>`}
    </fieldset>`;
  const btn = $("#imp-apply"); btn.disabled = n === 0; btn.textContent = n ? `Terapkan ${n} perubahan` : "Tidak ada perubahan";
}
async function applyImport(btn){
  const plan = S.plan; if (!plan || !plan.writes.length || !S.db) return;
  const msg = $("#dr-msg"); msg.textContent = "";
  btn.disabled = true; $("#dr-cancel").disabled = true;
  const stampNow = new Date().toISOString(), q = plan.writes.map(w => ({...w, rec:{...w.rec, updatedAt:stampNow}})), total = q.length;
  let done = 0, fail = 0;
  const put = it => { const c = S.db.collection(it.col); return (it.id ? c.doc(it.id) : c.doc()).set(it.rec); };
  const worker = async () => { while (q.length) { const it = q.shift(); try { await put(it); } catch (e) { if (e?.code === "resource_exhausted" || e?.code === "unavailable") { await new Promise(r => setTimeout(r, 900)); try { await put(it); } catch { fail++; } } else fail++; } done++; btn.textContent = `Menyimpan ${done} / ${total}…`; } };
  await Promise.all([worker(), worker(), worker()]);
  $("#dr-cancel").disabled = false;
  if (fail) { btn.disabled = false; btn.textContent = "Coba lagi"; msg.textContent = `${total - fail} unit tersimpan, ${fail} gagal. Muat ulang file ini lalu klik Terapkan lagi untuk mengulang yang gagal.`; return; }
  toast(`${total} unit berhasil diperbarui`); showDrawer(false);
}

