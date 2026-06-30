import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://mvtzcffzqjyracfaihmy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yPbLKjaRMqhQPojtiCihXA_gRjxaChO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cek sesi sebelum halaman dipakai. Kalau belum login, lempar ke login.html
export async function requireAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return null;
  }
  return data.session;
}

// Pasang tombol logout + tampilkan email user di sidebar (opsional, dipanggil manual)
export function mountLogoutButton(containerSelector = '.sidebar') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:auto; padding:16px; border-top:1px solid rgba(255,255,255,0.1);';
  wrap.innerHTML = `
    <div id="userEmail" style="font-size:12px; color:#9ca3af; margin-bottom:8px; word-break:break-all;"></div>
    <button id="logoutBtn" class="btn btn-outline" style="width:100%; font-size:13px;">Keluar</button>
  `;
  container.appendChild(wrap);

  supabase.auth.getUser().then(({ data }) => {
    const el = document.getElementById('userEmail');
    if (el && data.user) el.textContent = data.user.email;
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
}
