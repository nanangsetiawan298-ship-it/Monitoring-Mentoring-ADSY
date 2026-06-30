const API = '';
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let currentTab = 'mentor';
let editingId = null;
let mentorList = [], menteeList = [], kelompokList = [], adminList = [];

document.addEventListener('DOMContentLoaded', () => {
  loadAll();
});

async function loadAll() {
  await Promise.all([loadMentors(), loadMentees(), loadKelompok(), loadAdmins()]);
}

// ===== TABS =====
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  event.target.classList.add('active');
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
}

// ===== MENTORS =====
async function loadMentors() {
  try {
    const res = await fetch(`${API}/api/admin/mentors`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal memuat mentor');
    mentorList = data;
    const tbody = document.getElementById('mentorBody');
    if (!mentorList.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada mentor</td></tr>'; return; }
    tbody.innerHTML = mentorList.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.nama}</strong></td>
        <td>${formatWa(m.no_wa)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openModal('mentor','${m.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="hapus('mentors','${m.id}', loadMentors)">Hapus</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    document.getElementById('mentorBody').innerHTML = `<tr><td colspan="4" class="empty" style="color:#ef4444">Error: ${err.message}</td></tr>`;
  }
}

// ===== MENTEES =====
async function loadMentees() {
  try {
    const res = await fetch(`${API}/api/admin/mentees`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal memuat mentee');
    menteeList = data;
    renderMenteeTable(menteeList);
  } catch (err) {
    document.getElementById('menteeBody').innerHTML = `<tr><td colspan="5" class="empty" style="color:#ef4444">Error: ${err.message}</td></tr>`;
  }
}

function renderMenteeTable(data) {
  const tbody = document.getElementById('menteeBody');
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">Belum ada mentee</td></tr>'; return; }
  tbody.innerHTML = data.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${m.nama}</strong></td>
      <td>${formatWa(m.no_wa)}</td>
      <td>${m.kelompok?.nama || '<span style="color:#9ca3af">-</span>'}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openModal('mentee','${m.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="hapus('mentees','${m.id}', loadMentees)">Hapus</button>
      </td>
    </tr>`).join('');
}

function filterMentee() {
  const q = document.getElementById('searchMentee').value.toLowerCase();
  renderMenteeTable(menteeList.filter(m => m.nama.toLowerCase().includes(q)));
}

// ===== KELOMPOK =====
async function loadKelompok() {
  try {
    const res = await fetch(`${API}/api/admin/kelompok`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal memuat kelompok');
    kelompokList = data;
    const tbody = document.getElementById('kelompokBody');
    if (!kelompokList.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">Belum ada kelompok</td></tr>'; return; }
    tbody.innerHTML = kelompokList.map((k, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${k.nama}</strong></td>
        <td>${k.mentor?.nama || '-'}</td>
        <td>${HARI[k.hari_mentoring] || '-'}</td>
        <td>${k.mentees?.length || 0} orang</td>
        <td>${k.aktif ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Nonaktif</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openModal('kelompok','${k.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="hapus('kelompok','${k.id}', loadKelompok)">Hapus</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    document.getElementById('kelompokBody').innerHTML = `<tr><td colspan="7" class="empty" style="color:#ef4444">Error: ${err.message}</td></tr>`;
  }
}

// ===== ADMINS =====
async function loadAdmins() {
  try {
    const res = await fetch(`${API}/api/admin/admins`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal memuat admin');
    adminList = data;
    const tbody = document.getElementById('adminBody');
    if (!adminList.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada admin</td></tr>'; return; }
    tbody.innerHTML = adminList.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${a.nama}</strong></td>
        <td>${formatWa(a.no_wa)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="hapus('admins','${a.id}', loadAdmins)">Hapus</button></td>
      </tr>`).join('');
  } catch (err) {
    document.getElementById('adminBody').innerHTML = `<tr><td colspan="4" class="empty" style="color:#ef4444">Error: ${err.message}</td></tr>`;
  }
}

// ===== MODAL FORM =====
function openModal(type, id = null) {
  editingId = id;
  const modal = document.getElementById('modalForm');
  const title = document.getElementById('modalFormTitle');
  const fields = document.getElementById('formFields');
  fields.dataset.type = type;

  if (type === 'mentor') {
    title.textContent = id ? 'Edit Mentor' : 'Tambah Mentor';
    const m = id ? mentorList.find(x => x.id === id) : null;
    fields.innerHTML = `
      ${field('Nama Lengkap', 'nama', 'text', m?.nama, true)}
      ${field('No. WhatsApp', 'no_wa', 'text', m?.no_wa ? '0' + m.no_wa.replace(/^62/, '') : '', true, '08xxxxxxxxxx')}`;
  } else if (type === 'mentee') {
    title.textContent = id ? 'Edit Mentee' : 'Tambah Mentee';
    const m = id ? menteeList.find(x => x.id === id) : null;
    const kelompokOpts = kelompokList.map(k => `<option value="${k.id}" ${m?.kelompok_id === k.id ? 'selected' : ''}>${k.nama} — ${k.mentor?.nama || ''}</option>`).join('');
    fields.innerHTML = `
      ${field('Nama Lengkap', 'nama', 'text', m?.nama, true)}
      ${field('No. WhatsApp (opsional)', 'no_wa', 'text', m?.no_wa ? '0' + m.no_wa.replace(/^62/, '') : '', false, '08xxxxxxxxxx')}
      <div class="form-group">
        <label>Kelompok</label>
        <select name="kelompok_id">
          <option value="">— Pilih Kelompok —</option>
          ${kelompokOpts}
        </select>
      </div>`;
  } else if (type === 'kelompok') {
    title.textContent = id ? 'Edit Kelompok' : 'Tambah Kelompok';
    const k = id ? kelompokList.find(x => x.id === id) : null;
    const mentorOpts = mentorList.map(m => `<option value="${m.id}" ${k?.mentor?.id === m.id ? 'selected' : ''}>${m.nama}</option>`).join('');
    const hariOpts = HARI.map((h, i) => `<option value="${i}" ${k?.hari_mentoring === i ? 'selected' : ''}>${h}</option>`).join('');
    fields.innerHTML = `
      ${field('Nama Kelompok', 'nama', 'text', k?.nama, true)}
      <div class="form-group">
        <label>Mentor</label>
        <select name="mentor_id" required>
          <option value="">— Pilih Mentor —</option>
          ${mentorOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Hari Mentoring (mingguan)</label>
        <select name="hari_mentoring" required>
          ${hariOpts}
        </select>
      </div>
      ${id ? `<div class="form-group">
        <label>Status</label>
        <select name="aktif">
          <option value="true" ${k?.aktif ? 'selected' : ''}>Aktif</option>
          <option value="false" ${!k?.aktif ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>` : ''}`;
  } else if (type === 'admin') {
    title.textContent = 'Tambah Admin HRD';
    fields.innerHTML = `
      ${field('Nama', 'nama', 'text', '', true)}
      ${field('No. WhatsApp', 'no_wa', 'text', '', true, '08xxxxxxxxxx')}`;
  }

  modal.classList.remove('hidden');
}

function field(label, name, type, value = '', required = false, placeholder = '') {
  return `
    <div class="form-group">
      <label>${label}${required ? ' *' : ''}</label>
      <input type="${type}" name="${name}" value="${value || ''}" placeholder="${placeholder}" ${required ? 'required' : ''} />
    </div>`;
}

function closeModalForm() {
  document.getElementById('modalForm').classList.add('hidden');
  editingId = null;
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const type = document.getElementById('formFields').dataset.type;
  const data = Object.fromEntries(new FormData(form));

  // Sanitasi tipe data
  if (data.aktif !== undefined) data.aktif = data.aktif === 'true';
  if (data.hari_mentoring !== undefined) data.hari_mentoring = parseInt(data.hari_mentoring);
  // Kosongkan string → null untuk ID relasi
  if (data.kelompok_id === '') data.kelompok_id = null;
  if (data.mentor_id === '') data.mentor_id = null;

  const endpoint = type === 'admin' ? 'admins' : type === 'kelompok' ? 'kelompok' : type + 's';
  const url = editingId ? `${API}/api/admin/${endpoint}/${editingId}` : `${API}/api/admin/${endpoint}`;
  const method = editingId ? 'PUT' : 'POST';

  // Loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';

  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await res.json();

    if (!res.ok || result.error) {
      alert('Gagal menyimpan: ' + (result.error || 'Terjadi kesalahan'));
      return;
    }

    closeModalForm();
    if (type === 'mentor') loadMentors();
    else if (type === 'mentee') loadMentees();
    else if (type === 'kelompok') loadKelompok();
    else if (type === 'admin') loadAdmins();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan';
  }
}

// ===== HAPUS =====
async function hapus(endpoint, id, reloadFn) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  try {
    const res = await fetch(`${API}/api/admin/${endpoint}/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok || result.error) {
      alert('Gagal menghapus: ' + (result.error || 'Terjadi kesalahan'));
      return;
    }
    reloadFn();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// ===== TRIGGER REMINDER =====
async function triggerReminder() {
  if (!confirm('Kirim reminder manual ke semua mentor yang jadwal mentoringnya besok?')) return;
  try {
    const res = await fetch(`${API}/api/admin/trigger-reminder`, { method: 'POST' });
    const result = await res.json();
    alert(result.success ? 'Reminder berhasil dikirim!' : 'Gagal: ' + result.error);
  } catch (err) {
    alert('Gagal kirim reminder: ' + err.message);
  }
}

// ===== UTILS =====
function formatWa(no) {
  if (!no) return '<span style="color:#9ca3af">-</span>';
  return no.replace(/^62/, '0');
}
