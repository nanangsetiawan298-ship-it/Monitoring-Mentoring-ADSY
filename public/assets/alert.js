const API = '';

document.addEventListener('DOMContentLoaded', loadAlerts);

async function loadAlerts() {
  const res = await fetch(`${API}/api/dashboard/alerts`);
  const data = await res.json();
  const container = document.getElementById('alertList');

  if (!data.length) {
    container.innerHTML = '<div class="empty" style="padding:40px;text-align:center;color:#6b7280">Alhamdulillah, tidak ada alert saat ini 🎉</div>';
    return;
  }

  container.innerHTML = data.map(a => {
    const tgl = a.sesi?.tanggal_sesi
      ? new Date(a.sesi.tanggal_sesi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-';
    return `
      <div class="alert-card">
        <div class="alert-card-header">
          <div class="alert-card-title">⚠ Perlu Penanganan HRD</div>
          <div class="alert-card-date">${tgl}</div>
        </div>
        <div class="alert-card-body">
          <strong>Mentor:</strong> ${a.sesi?.kelompok?.mentor?.nama || '-'}<br/>
          <strong>Kelompok:</strong> ${a.sesi?.kelompok?.nama || '-'}<br/>
          <strong>Kendala:</strong> ${a.kendala || '-'}
        </div>
      </div>`;
  }).join('');
}
