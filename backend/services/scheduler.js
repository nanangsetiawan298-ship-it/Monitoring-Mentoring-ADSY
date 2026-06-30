const cron = require('node-cron');
const supabase = require('./supabase');
const { sendMessage } = require('./fonnte');

// Nama hari dalam Bahasa Indonesia
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Jalankan setiap hari jam 07:00 pagi
function startScheduler() {
  cron.schedule('0 7 * * *', async () => {
    console.log('[Scheduler] Cek reminder H-1...');
    await sendReminders();
  }, { timezone: 'Asia/Jakarta' });

  console.log('[Scheduler] Aktif — cek reminder setiap hari 07:00 WIB');
}

async function sendReminders() {
  // Cari tanggal besok, dihitung dalam timezone Asia/Jakarta (WIB)
  // agar tidak bergeser saat server berjalan di UTC.
  const nowJakarta = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
  );
  const besok = new Date(nowJakarta);
  besok.setDate(besok.getDate() + 1);

  const hariBesok = besok.getDay(); // 0=Minggu, 1=Senin, ...
  const tanggalBesok = `${besok.getFullYear()}-${String(besok.getMonth() + 1).padStart(2, '0')}-${String(besok.getDate()).padStart(2, '0')}`; // YYYY-MM-DD

  // Debug log — tampilkan nilai yang dihitung server agar mudah dilacak
  console.log('[Scheduler][DEBUG] Server UTC time:', new Date().toISOString());
  console.log('[Scheduler][DEBUG] Jakarta time now:', nowJakarta.toString());
  console.log('[Scheduler][DEBUG] Tanggal besok (Jakarta):', tanggalBesok);
  console.log('[Scheduler][DEBUG] hariBesok (0=Minggu...6=Sabtu):', hariBesok, '->', HARI[hariBesok]);

  // Ambil semua kelompok yang jadwal mentoringnya besok
  const { data: kelompoks, error } = await supabase
    .from('kelompok')
    .select('*, mentor:mentors(id, nama, no_wa), mentees(id)')
    .eq('hari_mentoring', hariBesok)
    .eq('aktif', true);

  if (error) {
    console.error('[Scheduler] Error fetch kelompok:', error.message);
    return;
  }

  console.log('[Scheduler][DEBUG] Jumlah kelompok ditemukan:', kelompoks?.length || 0);

  if (!kelompoks?.length) {
    console.log('[Scheduler] Tidak ada mentoring besok');
    return;
  }

  for (const kelompok of kelompoks) {
    const mentor = kelompok.mentor;
    if (!mentor?.no_wa) continue;

    const totalMentee = kelompok.mentees?.length || 0;

    // Buat record sesi_mentoring untuk besok (cek dulu apakah sudah ada)
    const { data: existingSesi } = await supabase
      .from('sesi_mentoring')
      .select('id')
      .eq('kelompok_id', kelompok.id)
      .eq('tanggal_sesi', tanggalBesok)
      .maybeSingle();

    let sesiId;
    if (!existingSesi) {
      const { data: newSesi } = await supabase
        .from('sesi_mentoring')
        .insert({
          kelompok_id: kelompok.id,
          mentor_id: mentor.id,
          tanggal_sesi: tanggalBesok,
          status: 'pending'
        })
        .select()
        .single();
      sesiId = newSesi?.id;
    } else {
      sesiId = existingSesi.id;
    }

    // Log reminder
    await supabase.from('reminder_log').insert({
      sesi_id: sesiId,
      no_wa: mentor.no_wa,
      tanggal_kirim: new Date().toISOString()
    });

    // Kirim WA reminder
    const namaHari = HARI[hariBesok];
    const tglFormatted = besok.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const pesan =
      `Assalamu'alaikum, Mas/Mbak *${mentor.nama}*! 👋\n\n` +
      `Ini adalah reminder bahwa *sesi mentoring* kelompok *${kelompok.nama}* ` +
      `dijadwalkan *${namaHari}, ${tglFormatted}*.\n\n` +
      `Total mentee: *${totalMentee} orang*\n\n` +
      `Semoga dimudahkan dalam pelaksanaannya. ` +
      `Setelah sesi selesai, mohon balas pesan ini untuk mengisi laporan ya 🙏\n\n` +
      `_Balas pesan ini setelah sesi selesai._`;

    await sendMessage(mentor.no_wa, pesan);
    console.log(`[Scheduler] Reminder terkirim ke ${mentor.nama} (${mentor.no_wa}) — Kelompok: ${kelompok.nama}`);
  }
}

// Manual trigger (untuk testing)
async function triggerManual() {
  await sendReminders();
}

module.exports = { startScheduler, triggerManual };
