const API = '';
const BULAN_NAMA = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let chartTrend, chartStatus;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const selBulan = document.getElementById('selBulan');
  const selTahun = document.getElementById('selTahun');

  selBulan.value = now.getMonth() + 1;
  for (let y = now.getFullYear(); y >= 2024; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    selTahun.appendChild(opt);
  }
  selTahun.value = now.getFullYear();

  selBulan.addEventListener('change', loadAll);
  selTahun.addEventListener('change', loadAll);
  loadAll();
});

function getPeriode() {
  return {
    bulan: document.getElementById('selBulan').value,
    tahun: document.getElementById('selTahun').value
  };
}

async function loadAll() {
  await Promise.all([loadSummary(), loadMentorTable(), loadTrend()]);
}

// ===== SUMMARY =====
async function loadSummary() {
  const { bulan, tahun } = getPeriode();
  const res = await fetch(`${API}/api/dashboard/summary?bulan=${bulan}&tahun=${tahun}`);
  const d = await res.json();

  document.getElementById('statTerlaksana').textContent = d.sesiTerlaksana;
  document.getElementById('statTotalSesi').textContent = d.totalSesi;
  document.getElementById('statKehadiran').textContent = d.avgKehadiran + '%';
  document.getElementById('statAlert').textContent = d.alertCount;

  const responsibility = d.totalSesi > 0 ? Math.round((d.sesiTerlaksana / d.totalSesi) * 100) : 0;
  document.getElementById('statResponsibility').textContent = responsibility + '%';

  // Status chart
  if (chartStatus) chartStatus.destroy();
  const ctx2 = document.getElementById('chartStatus').getContext('2d');
  chartStatus = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Terlaksana', 'Dijadwal Ulang', 'Pending'],
      datasets: [{
        data: [d.sesiTerlaksana, d.sesiDijadwalUlang, d.sesiPending],
        backgroundColor: ['#38a169', '#d97706', '#9ca3af'],
        borderWidth: 0
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } },
      cutout: '65%'
    }
  });
}

// ===== TREND CHART =====
async function loadTrend() {
  const { tahun } = getPeriode();
  const res = await fetch(`${API}/api/dashboard/trend?tahun=${tahun}`);
  const data = await res.json();

  const labels = data.map(d => BULAN_NAMA[d.bulan].slice(0, 3));
  const values = data.map(d => d.avg);

  if (chartTrend) chartTrend.destroy();
  const ctx = document.getElementById('chartTrend').getContext('2d');
  chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Rata-rata Kehadiran (%)',
        data: values,
        borderColor: '#3182ce',
        backgroundColor: 'rgba(49,130,206,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#3182ce'
      }]
    },
    options: {
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ===== MENTOR TABLE =====
async function loadMentorTable() {
  const { bulan, tahun } = getPeriode();
  const res = await fetch(`${API}/api/dashboard/laporan-mentor?bulan=${bulan}&tahun=${tahun}`);
  const data = await res.json();

  const tbody = document.getElementById('tblMentorBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Tidak ada data</td></tr>';
    return;
  }

  tbody.innerHTML = data.slice(0, 10).map(m => {
    const rClass = m.responsibility >= 80 ? 'green' : m.responsibility >= 50 ? 'yellow' : 'red';
    const kClass = m.avgKehadiran >= 75 ? 'green' : m.avgKehadiran >= 50 ? 'yellow' : 'red';
    return `
      <tr>
        <td><strong>${m.mentor.nama}</strong></td>
        <td>${m.kelompok}</td>
        <td>${m.totalMentee}</td>
        <td>${m.sesiTerlaksana} / ${m.totalSesi}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress progress-${rClass}" style="width:60px">
              <div class="progress-bar" style="width:${m.responsibility}%"></div>
            </div>
            <span>${m.responsibility}%</span>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress progress-${kClass}" style="width:60px">
              <div class="progress-bar" style="width:${m.avgKehadiran}%"></div>
            </div>
            <span>${m.avgKehadiran}%</span>
          </div>
        </td>
        <td>${m.alerts > 0 ? `<span class="badge badge-red">⚠ ${m.alerts} alert</span>` : '<span class="badge badge-green">Aman</span>'}</td>
      </tr>`;
  }).join('');
}
