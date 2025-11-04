/* ==================== Core data & utilities ==================== */
const byJenis = { GURU: [], KONTRAK: [], AKP: [] };
let rekodList = JSON.parse(localStorage.getItem('KGAS_REKOD_LIST') || '[]');

const hariMs = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
const fmtHari = dstr => {
  const d = new Date(dstr+'T00:00:00');
  return `${d.toLocaleDateString('ms-MY',{day:'2-digit',month:'long',year:'numeric'})} (${hariMs[d.getDay()]})`;
};
function totalCount(){return byJenis.GURU.length+byJenis.KONTRAK.length+byJenis.AKP.length;}
function getWeek(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const n=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-n);
  const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));
  return Math.ceil((((t-y)/86400000)+1)/7);
}
function normalize(s){ return (s||'').toString().trim().toUpperCase(); }

/* Normalize text to ASCII for jsPDF (avoid weird glyphs) */
function normalizePdfText(s){
  return (s || '')
    .toString()
    // arrows & long dashes to ASCII
    .replace(/[→➔➜➝➞➟]/g, '->')
    .replace(/[–—−]/g, '-')
    // smart quotes to straight
    .replace(/[“”]/g, '"')
    .replace(/[’‘]/g, "'")
    // strip other non-ASCII to space
    .replace(/[^\x20-\x7E]/g, ' ');
}

/* ==================== Logo ==================== */
document.addEventListener('DOMContentLoaded', ()=>{
  const img = document.getElementById('schoolLogo');
  if (img && typeof LOGO_DATAURL === 'string') img.src = LOGO_DATAURL;
});

/* ==================== INIT ==================== */
(function init(){
  const selM=document.getElementById('minggu');
  for(let w=1;w<=53;w++){const o=document.createElement('option');o.value=w;o.textContent='Minggu '+w;selM.appendChild(o);}
  const now=new Date();
  selM.value=getWeek(now);
  document.getElementById('tarikh').value=now.toISOString().slice(0,10);

  const cache=localStorage.getItem('KGAS_EXCEL_CACHE');
  if(cache){
    Object.assign(byJenis, JSON.parse(cache));
    document.getElementById('excelStatus').innerHTML=`<span class="text-success">Data cache dimuat (${totalCount()} nama)</span>`;
    refreshNamaOptions();
  }
  refreshUpdateBtn();

  selM.addEventListener('change', renderGrouped);
  renderGrouped();
  renderAllTable();
  setTimeout(updateCharts, 0);
})();

/* ==================== Buttons & Events ==================== */
function refreshUpdateBtn(){
  const btn = document.getElementById('btnUpdateData');
  if(!btn) return;
  const cache = localStorage.getItem('KGAS_EXCEL_CACHE');
  btn.innerHTML = cache
    ? `Update Data <span class="badge text-bg-success ms-2">${totalCount()} nama</span>`
    : 'Update Data';
}

document.getElementById('tarikh').addEventListener('change', (e)=>{
  const w = getWeek(new Date(e.target.value));
  document.getElementById('minggu').value = w;
  renderGrouped(); renderAllTable(); updateCharts();
});

document.getElementById('btnUpdateData').onclick = ()=> document.getElementById('excelInput').click();

document.getElementById('btnClearCache').onclick=()=>{
  if(confirm('Padam semua cache Excel?')){
    localStorage.removeItem('KGAS_EXCEL_CACHE');
    byJenis.GURU=[];byJenis.KONTRAK=[];byJenis.AKP=[];
    document.getElementById('excelStatus').textContent='Cache dipadam. Sila muat naik fail Excel baru.';
    refreshNamaOptions(); refreshUpdateBtn();
  }
};

document.getElementById('excelInput').addEventListener('change', async e=>{
  const f=e.target.files[0]; if(!f)return;
  const buf=await f.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const aoa=XLSX.utils.sheet_to_json(ws,{header:1});
  parseExcelDynamic(aoa);
  localStorage.setItem('KGAS_EXCEL_CACHE', JSON.stringify(byJenis));
  document.getElementById('excelStatus').innerHTML=`<span class="text-success">Data disimpan (${totalCount()} nama)</span>`;
  refreshUpdateBtn();
  alert('Excel dibaca dan disimpan.');
});

/* ==================== Excel Parsing ==================== */
function parseExcelDynamic(aoa){
  byJenis.GURU=[];byJenis.KONTRAK=[];byJenis.AKP=[];
  let section=null, stop=false, akpHasData=false;
  const isRowBlank = row => (row||[]).every(v => String(v??'').trim()==='');

  for(let r=0;r<aoa.length;r++){
    if(stop) break;
    const row=aoa[r]||[];
    const cellA=(row[0]||'').toString().trim().toUpperCase();
    const cellC=(row[2]||'').toString().trim();
    const nonEmpty=row.filter(v=>String(v||'').trim()!=='');
    if(nonEmpty.length===1 && cellA!==''){
      if(cellA.includes('GURU') || cellA.includes('PERJAWATAN')) section='GURU';
      else if(cellA.includes('KONTRAK') || cellA.includes('SAMBILAN') || cellA.includes('SEMENTARA') || cellA.includes('INTERIM')) section='KONTRAK';
      else if(cellA.includes('ANGGOTA') || cellA.includes('PELAKSANA') || cellA.includes('AKP')){ section='AKP'; akpHasData=false; }
      continue;
    }
    if(isRowBlank(row)){
      if(section==='AKP' && akpHasData){ stop=true; break; }
      continue;
    }
    if(!section) continue;

    if(cellC && !/^NAMA/.test(cellC.toUpperCase())){
      if(section==='AKP') akpHasData = true;
      byJenis[section].push(cellC.toUpperCase());
    }
  }
  ['GURU','KONTRAK','AKP'].forEach(k=> byJenis[k]=[...new Set(byJenis[k])].sort());
  refreshNamaOptions();
}

/* ==================== Form ==================== */
document.getElementById('jenis').addEventListener('change', refreshNamaOptions);
function refreshNamaOptions(){
  const jenis=document.getElementById('jenis').value;
  const sel=document.getElementById('nama');
  const list=byJenis[jenis]||[];
  sel.innerHTML=list.length
    ? `<option value="">— pilih nama —</option>`+list.map(n=>`<option>${n}</option>`).join('')
    : `<option>— tiada data —</option>`;
}

document.getElementById('rekodForm').addEventListener('submit', e => {
  e.preventDefault();
  const tarikh = document.getElementById('tarikh').value;
  const minggu = getWeek(new Date(tarikh));
  const jenis  = document.getElementById('jenis').value;
  const nama   = document.getElementById('nama').value;
  const sebab  = document.getElementById('sebab').value;
  if (!nama) return alert('Sila pilih nama.');

  rekodList.push({ minggu, tarikh, jenis, nama, sebab });
  localStorage.setItem('KGAS_REKOD_LIST', JSON.stringify(rekodList));

  document.getElementById('minggu').value = minggu;
  renderGrouped(); renderAllTable(); updateCharts();
  e.target.reset();
  const now = new Date(); document.getElementById('tarikh').value = now.toISOString().slice(0,10);
  document.getElementById('minggu').value = getWeek(now);
  refreshNamaOptions();
});

/* ==================== Grouped Weekly (selected week) ==================== */
function renderGrouped(){
  const wSel = Number(document.getElementById('minggu').value);
  document.getElementById('rekodTitle').textContent = `Rekod Keberadaan (Minggu ${wSel})`;

  const wrap = document.getElementById('rekodWrap'); wrap.innerHTML = '';
  const data = rekodList.filter(r => getWeek(new Date(r.tarikh)) === wSel)
                        .sort((a,b)=> b.tarikh.localeCompare(a.tarikh) || a.nama.localeCompare(b.nama));

  if(data.length===0){ wrap.innerHTML = `<div class="text-muted">Tiada rekod untuk minggu ini.</div>`; return; }

  const byDate = {}; data.forEach(r => { (byDate[r.tarikh] ||= []).push(r); });

  Object.keys(byDate).forEach(t=>{
    const list = byDate[t];
    const sec = document.createElement('div');
    sec.className = 'mb-3';
    sec.innerHTML = `
      <div class="date-head">Rekod untuk ${fmtHari(t)}</div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-2 kgas-table">
          <colgroup><col class="col-bil"><col class="col-nama"><col class="col-jawat"><col class="col-sebab"><col class="col-tind"></colgroup>
          <thead><tr><th>Bil.</th><th>Nama</th><th>Jawatan</th><th>Sebab</th><th class="text-end">Tindakan</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    const tb = sec.querySelector('tbody');
    list.forEach((r,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${i+1}</td>
        <td>${r.nama}</td>
        <td><span class="badge bg-light text-dark border badge-small">${r.jenis}</span></td>
        <td>${r.sebab}</td>
        <td class="text-end"><button class="btn btn-sm btn-danger">Padam</button></td>`;
      tr.querySelector('button').onclick=()=>{
        if(confirm('Padam rekod ini?')){
          const idx=rekodList.findIndex(x=>x.minggu==r.minggu&&x.tarikh==r.tarikh&&x.nama==r.nama&&x.jenis==r.jenis&&x.sebab==r.sebab);
          if(idx>-1){ rekodList.splice(idx,1); localStorage.setItem('KGAS_REKOD_LIST',JSON.stringify(rekodList));
            renderGrouped(); renderAllTable(); updateCharts(); }
        }
      };
      tb.appendChild(tr);
    });
    wrap.appendChild(sec);
  });
}

/* ==================== All Records (Filter + Table) ==================== */
function getAllFiltered(){
  const qNama = normalize(document.getElementById('allNama').value);
  const jaw   = document.getElementById('allJawatan').value;
  const wStr  = document.getElementById('allMinggu').value;
  const wSel  = wStr ? Number(wStr) : null;
  const dFrom = document.getElementById('allTarikhFrom').value || null;
  const dTo   = document.getElementById('allTarikhTo').value || null;

  let rows = rekodList.slice();
  if (jaw) rows = rows.filter(r => r.jenis === jaw);
  if (wSel) rows = rows.filter(r => getWeek(new Date(r.tarikh)) === wSel);
  if (qNama) rows = rows.filter(r => normalize(r.nama).includes(qNama));
  if (dFrom) rows = rows.filter(r => r.tarikh >= dFrom);
  if (dTo)   rows = rows.filter(r => r.tarikh <= dTo);

  rows.sort((a,b)=> b.tarikh.localeCompare(a.tarikh) || a.nama.localeCompare(b.nama));
  return rows;
}

function renderAllTable(){
  const tbody=document.getElementById('allTbody');
  const badge=document.getElementById('allCount');
  if(!tbody||!badge)return;

  const data=getAllFiltered();
  badge.textContent=`${data.length} rekod`; tbody.innerHTML='';
  if(data.length===0){tbody.innerHTML='<tr><td colspan="7" class="text-muted">Tiada rekod padanan.</td></tr>'; updateAnalyticsRangeLabel(); return;}

  data.forEach((r,i)=>{
    const minggu=getWeek(new Date(r.tarikh));
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${i+1}</td><td>${minggu}</td><td>${fmtHari(r.tarikh)}</td><td>${r.nama}</td>
      <td><span class="badge bg-light text-dark border badge-small">${r.jenis}</span></td>
      <td>${r.sebab}</td><td class="text-center"><button class="btn-delete" title="Padam rekod"><i class="bi bi-trash"></i></button></td>`;
    tr.querySelector('button').onclick=()=>{
      if(confirm('Padam rekod ini?')){
        const idx=rekodList.findIndex(x=>x.minggu==r.minggu&&x.tarikh==r.tarikh&&x.nama==r.nama&&x.jenis==r.jenis&&x.sebab==r.sebab);
        if(idx>-1){ rekodList.splice(idx,1); localStorage.setItem('KGAS_REKOD_LIST',JSON.stringify(rekodList));
          renderGrouped(); renderAllTable(); updateCharts(); }
      }
    };
    tbody.appendChild(tr);
  });
  updateAnalyticsRangeLabel();
}

['allNama','allJawatan','allMinggu','allTarikhFrom','allTarikhTo'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el)return;
  el.addEventListener('input',()=>{renderAllTable();updateCharts();});
  el.addEventListener('change',()=>{renderAllTable();updateCharts();});
});
document.getElementById('allReset').onclick=()=>{
  ['allNama','allJawatan','allMinggu','allTarikhFrom','allTarikhTo']
    .forEach(id=>document.getElementById(id).value='');
  renderAllTable(); updateCharts();
};

/* ==================== Dashboard Charts (Chart.js) ==================== */
let chartSebabMini=null, chartJawatanMini=null;
function destroyChart(c){ if(c && typeof c.destroy==='function') c.destroy(); }

function groupCount(rows,key){
  const m=new Map(); rows.forEach(r=>{
    const k=(key==='minggu')?String(getWeek(new Date(r.tarikh))):r[key];
    m.set(k,(m.get(k)||0)+1);
  });
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
}

function updateAnalyticsRangeLabel(){
  const badge=document.getElementById('analitikRangeLabel');
  const dFrom=document.getElementById('allTarikhFrom').value||null;
  const dTo=document.getElementById('allTarikhTo').value||null;
  let txt;
  if(!dFrom&&!dTo){txt='Semua tarikh';}
  else{
    const f=dFrom?new Date(dFrom).toLocaleDateString('ms-MY'):'-';
    const t=dTo?new Date(dTo).toLocaleDateString('ms-MY'):'-';
    txt=`Julat: ${f} -> ${t}`;
  }
  if(badge)badge.textContent=txt;
  const kpiRange=document.getElementById('kpiRange');
  if(kpiRange)kpiRange.textContent=txt;
}

function updateCharts(){
  const rows=getAllFiltered();

  /* KPIs */
  document.getElementById('kpiTotal').textContent=rows.length;
  const uniq=new Set(rows.map(r=>r.nama));
  document.getElementById('kpiNama').textContent=uniq.size;
  updateAnalyticsRangeLabel();

  const sebabPairs=groupCount(rows,'sebab');
  const jawPairs=groupCount(rows,'jenis');

  const ctxSebab=document.getElementById('chartSebabMini')?.getContext('2d');
  const ctxJaw=document.getElementById('chartJawatanMini')?.getContext('2d');

  destroyChart(chartSebabMini); destroyChart(chartJawatanMini);

  if(ctxSebab && sebabPairs.length){
    chartSebabMini=new Chart(ctxSebab,{
      type:'doughnut',
      data:{labels:sebabPairs.map(x=>x[0]),datasets:[{data:sebabPairs.map(x=>x[1])}]},
      options:{
        responsive:true,maintainAspectRatio:false,resizeDelay:150,animation:{duration:0},
        plugins:{
          legend:{display:true,position:'bottom',labels:{boxWidth:10,usePointStyle:true}},
          tooltip:{enabled:true}
        },
        cutout:'55%'
      }
    });
  }

  if(ctxJaw && jawPairs.length){
    chartJawatanMini=new Chart(ctxJaw,{
      type:'bar',
      data:{labels:jawPairs.map(x=>x[0]),datasets:[{label:'Bil.',data:jawPairs.map(x=>x[1])}]},
      options:{
        responsive:true,maintainAspectRatio:false,resizeDelay:150,animation:{duration:0},
        scales:{
          y:{beginAtZero:true,ticks:{precision:0,maxTicksLimit:4},grid:{display:false}},
          x:{grid:{display:false}}
        },
        plugins:{legend:{display:false},tooltip:{enabled:true}},
        categoryPercentage:0.6,barPercentage:0.7
      }
    });
  }
}

/* expose for debugging (optional) */
window.updateCharts=updateCharts;
window.getAllFiltered=getAllFiltered;

/* ==================== FAB & Modal PDF ==================== */
let pdfModal; // bootstrap.Modal instance
document.addEventListener('DOMContentLoaded', ()=>{
  const modalEl = document.getElementById('pdfModal');
  if (modalEl && window.bootstrap) {
    pdfModal = new bootstrap.Modal(modalEl);
  }
  const fab = document.getElementById('fabPdf');
  if (fab) fab.onclick = ()=> pdfModal?.show();

  // switch mode UI
  document.querySelectorAll('input[name="pdfMode"]').forEach(r=>{
    r.addEventListener('change', syncPdfModeUI);
  });
  syncPdfModeUI();

  const genBtn = document.getElementById('btnGeneratePdf');
  if (genBtn) genBtn.onclick = handleGeneratePdf;
});

function syncPdfModeUI(){
  const mode = getPdfMode();
  toggle('#pdfWeekRange', mode==='week-range');
  toggle('#pdfDateRange', mode==='date-range');
  toggle('#pdfWeeksExact', mode==='weeks-exact');
}
function getPdfMode(){
  return document.querySelector('input[name="pdfMode"]:checked')?.value || 'week-range';
}
function toggle(sel, show){
  const el=document.querySelector(sel);
  if(!el) return;
  el.classList.toggle('d-none', !show);
}

/* Kumpul rekod ikut pilihan user */
function collectPdfRecords(){
  const mode = getPdfMode();
  let rows = rekodList.slice();

  if (mode==='week-range'){
    const wFrom = Number(document.getElementById('pdfWeekFrom').value || 1);
    const wTo   = Number(document.getElementById('pdfWeekTo').value   || 53);
    const lo = Math.max(1, Math.min(wFrom, wTo));
    const hi = Math.min(53, Math.max(wFrom, wTo));
    rows = rows.filter(r=>{
      const w = getWeek(new Date(r.tarikh));
      return w>=lo && w<=hi;
    });
    return {rows, title:`Julat Minggu: ${lo} -> ${hi}`};
  }

  if (mode==='date-range'){
    const dFrom = document.getElementById('pdfDateFrom').value || '0000-01-01';
    const dTo   = document.getElementById('pdfDateTo').value   || '9999-12-31';
    const lo = dFrom<=dTo ? dFrom : dTo;
    const hi = dFrom<=dTo ? dTo   : dFrom;
    rows = rows.filter(r=> r.tarikh>=lo && r.tarikh<=hi);
    const toMs = s=> s ? new Date(s).toLocaleDateString('ms-MY') : '-';
    return {rows, title:`Julat Tarikh: ${toMs(lo)} -> ${toMs(hi)}`};
  }

  // weeks-exact
  const list = (document.getElementById('pdfWeeksList').value || '')
    .split(',').map(s=>s.trim()).filter(Boolean)
    .map(n=>Number(n)).filter(n=>Number.isInteger(n) && n>=1 && n<=53);
  const uniq = Array.from(new Set(list)).sort((a,b)=>a-b);
  if (uniq.length===0) return {rows:[], title:'Minggu: (tiada)'};
  const set = new Set(uniq);
  rows = rows.filter(r=> set.has(getWeek(new Date(r.tarikh))));
  return {rows, title:`Minggu: ${uniq.join(', ')}`};
}

function handleGeneratePdf(){
  const {rows, title} = collectPdfRecords();
  if (!rows || rows.length===0){
    alert('Tiada rekod dalam julat yang dipilih.');
    return;
  }
  pdfModal?.hide();
  exportPdfRange(rows, title);
}

/* ==================== Export PDF (range/multi-week) ==================== */
function exportPdfRange(data, titleLine){
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('Ralat: jsPDF tidak dimuat.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const page = { w: 210, h: 297 };
  const marginX = 12, headerY = 12, logoSize = 30;

  // Header + logo
  const logoData = (typeof LOGO_DATAURL === 'string') ? LOGO_DATAURL : null;
  if (logoData) doc.addImage(logoData, 'PNG', marginX, headerY, logoSize, logoSize);
  doc.setFont('helvetica','bold');
  doc.setFontSize(18);
  doc.text(
    normalizePdfText('LAPORAN KEBERADAAN GURU & AKP'),
    marginX + (logoData ? logoSize + 6 : 0),
    headerY + 7
  );
  doc.setFontSize(12);
  doc.text(
    normalizePdfText(titleLine || 'Julat: -'),
    marginX + (logoData ? logoSize + 6 : 0),
    headerY + 16
  );

  let y = headerY + Math.max(logoSize, 22) + 6;

  // Group by date (menaik)
  const byDate = {};
  data.forEach(r => { (byDate[r.tarikh] ||= []).push(r); });
  const datesAsc = Object.keys(byDate).sort((a,b)=> a.localeCompare(b));

  const head = ['Bil.', 'Nama', 'Jawatan', 'Sebab'];
  for (const t of datesAsc) {
    const list = byDate[t].slice().sort((a,b)=> a.nama.localeCompare(b.nama));
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    y += 3;
    doc.text(normalizePdfText(`Rekod untuk ${fmtHari(t)}`), marginX, y);

    const rows = list.map((r,i)=> [i+1, r.nama, r.jenis, r.sebab]);
    const avail = page.w - marginX*2 - 0.6;
    const wBil=11.5, wJaw=26.5, wSeb=29.5;
    const wNama = Math.max(90, avail - (wBil+wJaw+wSeb));

    doc.autoTable({
      startY: y + 2,
      head: [head],
      body: rows,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: {
        font: 'helvetica', fontSize: 10.5,
        cellPadding: { horizontal: 2, vertical: 2 },
        overflow: 'linebreak', lineColor: [200,200,200], lineWidth: 0.3,
        halign: 'left', valign: 'middle'
      },
      headStyles: { fillColor: [37,99,235], textColor: 255, fontStyle: 'bold', fontSize: 11.5 },
      columnStyles: {
        0:{cellWidth:wBil,halign:'center'},
        1:{cellWidth:wNama},
        2:{cellWidth:wJaw,halign:'center'},
        3:{cellWidth:wSeb}
      },
      tableWidth: avail,
      showHead: 'everyPage',
      didDrawPage: (ctx)=>{
        if (ctx.pageNumber > 1) {
          doc.setFont('helvetica','bold'); doc.setFontSize(13);
          doc.text(
            normalizePdfText('LAPORAN KEBERADAAN GURU & AKP'),
            page.w/2, headerY + 6, { align:'center' }
          );
          doc.setFont('helvetica','normal'); doc.setFontSize(11);
          doc.text(
            normalizePdfText(titleLine || ''),
            page.w/2, headerY + 13, { align:'center' }
          );
        }
      }
    });

    y = doc.lastAutoTable.finalY + 6;
    if (y > page.h - 50) { doc.addPage(); y = headerY + Math.max(logoSize, 24) + 6; }
  }

  // Tandatangan
  const signData   = (typeof SIGNATURE_DATAURL === 'string') ? SIGNATURE_DATAURL : null;
  const afterTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : y + 12;
  let ySig = afterTableY;
  if (ySig + 34 > page.h - 15) { doc.addPage(); ySig = headerY + (logoData ? Math.max(18, logoSize*0.6) : 0) + 12; }

  doc.setFont('helvetica','normal'); doc.setFontSize(12);
  doc.text(normalizePdfText('Disediakan oleh,'), marginX, ySig);
  if (signData) { doc.addImage(signData, 'PNG', marginX, ySig + 2, 40, 17);}
  doc.text(normalizePdfText('RAZILAH BINTI OTHMAN'), marginX, ySig + 20);
  doc.text(normalizePdfText('PENGETUA'),            marginX, ySig + 27);
  doc.text(normalizePdfText('SMK SEKSYEN 27'),      marginX, ySig + 34);

  // Nama fail
  const safeTitle = normalizePdfText(titleLine || 'Julat')
    .replace(/[^\w\-(),\s]/g,'')
    .replace(/\s+/g,'_');
  doc.save(`Laporan_Keberadaan_${safeTitle}.pdf`);
}
