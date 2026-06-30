import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://mvtzcffzqjyracfaihmy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yPbLKjaRMqhQPojtiCihXA_gRjxaChO';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  loadAlerts();
});

async function loadAlerts() {
  const tbody = document.getElementById('alertBody');

  const { data, error } = await supabase
    .from('monev')
    .select(`
      id,
      jumlah_hadir,
      total_mentee,
      persen_kehadiran,
      kendala,
      kondisi_mentee,
      sesi:sesi_id (
        tanggal_sesi,
        kelompok:kelompok_id ( nama ),
        mentor:mentor_id ( nama )
      )
    `)
    .in('kondisi_mentee', ['perlu_perhatian', 'perlu_ditangani_hrd'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadAlerts error:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Gagal memuat data: ${error.message}</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Tidak ada alert saat ini</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(m => {
    const tanggal = m.sesi?.tanggal_sesi
      ? new Date(m.sesi.tanggal_sesi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-';
    const kelompok = m.sesi?.kelompok?.nama || '-';
    const mentor = m.sesi?.mentor?.nama || '-';
    const kehadiran = `${m.jumlah_hadir}/${m.total_mentee} (${m.persen_kehadiran ?? 0}%)`;
    const kondisiLabel = m.kondisi_mentee === 'perlu_ditangani_hrd'
      ? '<span class="badge badge-red">Perlu Ditangani HRD</span>'
      : '<span class="badge badge-yellow">Perlu Perhatian</span>';
    const kendala = m.kendala || '<span style="color:#9ca3af">-</span>';

    return `
      <tr>
        <td>${tanggal}</td>
        <td>${kelompok}</td>
        <td>${mentor}</td>
        <td>${kehadiran}</td>
        <td>${kondisiLabel}</td>
        <td>${kendala}</td>
      </tr>`;
  }).join('');
}
