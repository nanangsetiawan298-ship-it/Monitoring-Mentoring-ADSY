const API = '';
const BULAN_NAMA = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let allData = [];

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const selBulan = document.getElementById('selBulan');
  const selTahun = document.getElementById('selTahun');
  selBulan.value = now.getMonth() + 1;
  for (let y = now.getFullYear(); y >= 2024; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y; selTahun.appendChild(opt);
  }
  selTahun.value = now.getFullYear();
  selBulan.addEventListener('change', loadLaporan);
  selTahun.addEventListener('change', loadLaporan);
  loadLaporan();
});

async function loadLaporan() {
  const bulan = document.getElementById('selBulan').value;
  const tahun = document.getElementById('selTahun').value;
  const res = await fetch(`${API}/api/dashboard/laporan-mentor?bulan=${bulan}&tahun=${tahun}`);
  allData = await res.json();
  renderTable(allData);
}

function renderTable(data) {
  const tbody = document.getElementById('tblBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">Tidak ada data untuk periode ini</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((m, i) => {
    const rClass = m.responsibility >= 80 ? 'green' : m.responsibility >= 50 ? 'yellow' : 'red';
    const kClass = m.avgKehadiran >= 75 ? 'green' : m.avgKehadiran >= 50 ? 'yellow' : 'red';
    const kondisiLabel = m.alerts > 0 ? `<span class="badge badge-red">⚠ ${m.alerts} HRD</span>` : '<span class="badge badge-green">Baik</span>';
    const kendala = m.kendalaList?.length ? m.kendalaList[0].substring(0, 40) + (m.kendalaList[0].length > 40 ? '...' : '') : '<span style="color:#9ca3af">-</span>';
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.mentor.nama}</strong></td>
        <td>${m.kelompok}</td>
        <td>${m.totalMentee}</td>
        <td>${m.sesiTerlaksana} / ${m.totalSesi}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress progress-${rClass}" style="width:60px">
              <div class="progress-bar" style="width:${m.responsibility}%"></div>
            </div>
            <strong>${m.responsibility}%</strong>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress progress-${kClass}" style="width:60px">
              <div class="progress-bar" style="width:${m.avgKehadiran}%"></div>
            </div>
            <strong>${m.avgKehadiran}%</strong>
          </div>
        </td>
        <td style="max-width:160px">${kendala}</td>
        <td>${kondisiLabel}</td>
        <td><button class="btn btn-sm btn-outline" onclick="showDetail(${i})">Detail</button></td>
      </tr>`;
  }).join('');
}

function showDetail(idx) {
  const m = allData[idx];
  document.getElementById('modalTitle').textContent = `Detail — ${m.mentor.nama}`;
  document.getElementById('modalContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="card card-blue" style="padding:14px">
        <div class="card-label">Responsibility</div>
        <div class="card-value">${m.responsibility}%</div>
      </div>
      <div class="card card-green" style="padding:14px">
        <div class="card-label">Avg Kehadiran</div>
        <div class="card-value">${m.avgKehadiran}%</div>
      </div>
    </div>
    <h3 style="font-size:14px;margin-bottom:10px">Riwayat Sesi</h3>
    ${m.sesiList.map(s => `
      <div class="sesi-item">
        <span>${formatTgl(s.tanggal)}</span>
        ${s.status === 'terlaksana'
          ? `<span class="badge badge-green">Terlaksana</span>
             ${s.monev ? `<span style="font-size:12px;color:#6b7280">${s.monev.jumlah_hadir}/${s.monev.total_mentee} hadir (${s.monev.persen_kehadiran}%)</span>` : ''}`
          : s.status === 'dijadwal_ulang'
          ? `<span class="badge badge-yellow">Dijadwal Ulang</span>`
          : `<span class="badge badge-gray">Pending</span>`}
      </div>`).join('')}
    ${m.kendalaList.length ? `
      <h3 style="font-size:14px;margin:16px 0 10px">Kendala yang Dilaporkan</h3>
      ${m.kendalaList.map(k => `<div style="padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:13px;margin-bottom:6px;color:#374151">${k}</div>`).join('')}
    ` : ''}`;
  document.getElementById('modalDetail').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalDetail').classList.add('hidden');
}

function formatTgl(tgl) {
  if (!tgl) return '-';
  const d = new Date(tgl);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function exportCSV() {
  const bulan = document.getElementById('selBulan').value;
  const tahun = document.getElementById('selTahun').value;
  const bNama = BULAN_NAMA[bulan];

  const headers = ['No','Mentor','Kelompok','Total Mentee','Sesi Terlaksana','Total Sesi','Responsibility (%)','Avg Kehadiran (%)','Alert HRD'];
  const rows = allData.map((m, i) => [
    i + 1, m.mentor.nama, m.kelompok, m.totalMentee,
    m.sesiTerlaksana, m.totalSesi, m.responsibility, m.avgKehadiran, m.alerts
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `laporan-mentoring-${bNama}-${tahun}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
