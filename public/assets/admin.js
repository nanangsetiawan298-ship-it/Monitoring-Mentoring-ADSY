import { supabase, requireAuth, mountLogoutButton } from './auth-guard.js';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let currentTab = 'mentor';
let editingId = null;
let mentorList = [], menteeList = [], kelompokList = [], adminList = [];

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  if (!session) return;
  mountLogoutButton();
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
  const { data, error } = await supabase.from('mentors').select('*').order('created_at', { ascending: true });
  if (error) { console.error('loadMentors error:', error); return; }
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
}

// ===== MENTEES =====
async function loadMentees() {
  const { data, error } = await supabase
    .from('mentees')
    .select('*, kelompok:kelompok_id(nama)')
    .order('created_at', { ascending: true });
  if (error) { console.error('loadMentees error:', error); return; }
  menteeList = data;
  renderMenteeTable(menteeList);
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
  const { data, error } = await supabase
    .from('kelompok')
    .select('*, mentor:mentor_id(id, nama), mentees(id)')
    .order('created_at', { ascending: true });
  if (error) { console.error('loadKelompok error:', error); return; }
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
}

// ===== ADMINS =====
async function loadAdmins() {
  const { data, error } = await supabase.from('admins').select('*').order('created_at', { ascending: true });
  if (error) { console.error('loadAdmins error:', error); return; }
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
  const type = document.getElementById('formFields').dataset.type;
  const data = Object.fromEntries(new FormData(form));

  if (data.aktif !== undefined) data.aktif = data.aktif === 'true';
  if (data.hari_mentoring !== undefined) data.hari_mentoring = parseInt(data.hari_mentoring);
  if (data.no_wa) data.no_wa = data.no_wa.replace(/^0/, '62');
  if (data.kelompok_id === '') data.kelompok_id = null;

  const table = type === 'admin' ? 'admins' : type === 'kelompok' ? 'kelompok' : type + 's';

  let result;
  if (editingId) {
    result = await supabase.from(table).update(data).eq('id', editingId).select();
  } else {
    result = await supabase.from(table).insert(data).select();
  }

  if (result.error) {
    console.error('submitForm error:', result.error);
    alert('Error: ' + result.error.message);
    return;
  }

  closeModalForm();
  if (type === 'mentor') loadMentors();
  else if (type === 'mentee') loadMentees();
  else if (type === 'kelompok') loadKelompok();
  else if (type === 'admin') loadAdmins();
}

// ===== HAPUS =====
async function hapus(table, id, reloadFn) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) { console.error('hapus error:', error); alert('Error: ' + error.message); return; }
  reloadFn();
}

// ===== TRIGGER REMINDER =====
async function triggerReminder() {
  if (!confirm('Kirim reminder manual ke semua mentor yang jadwal mentoringnya besok?')) return;
  try {
    const res = await fetch('/api/admin/trigger-reminder', { method: 'POST' });
    const result = await res.json();
    alert(result.success ? 'Reminder berhasil dikirim!' : 'Gagal: ' + result.error);
  } catch (err) {
    alert('Fitur reminder belum tersedia (backend belum dibuat).');
  }
}

// ===== UTILS =====
function formatWa(no) {
  if (!no) return '<span style="color:#9ca3af">-</span>';
  return no.replace(/^62/, '0');
}

window.switchTab = switchTab;
window.openModal = openModal;
window.closeModalForm = closeModalForm;
window.submitForm = submitForm;
window.hapus = hapus;
window.triggerReminder = triggerReminder;
window.filterMentee = filterMentee;
