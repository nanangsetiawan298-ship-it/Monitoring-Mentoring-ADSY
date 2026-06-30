import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://mvtzcffzqjyracfaihmy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yPbLKjaRMqhQPojtiCihXA_gRjxaChO';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Kalau sudah login, langsung lempar ke admin panel
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    window.location.href = 'admin.html';
  }
});

const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const data = Object.fromEntries(new FormData(form));

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    errorBox.textContent = error.message === 'Invalid login credentials'
      ? 'Email atau password salah.'
      : error.message;
    errorBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Masuk';
    return;
  }

  window.location.href = 'admin.html';
});
