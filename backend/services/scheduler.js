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
  // Cari tanggal besok
  const besok = new Date();
  besok.setDate(besok.getDate() + 1);
  const hariBesok = besok.getDay(); // 0=Minggu, 1=Senin, ...
  const tanggalBesok = besok.toISOString().split('T')[0]; // YYYY-MM-DD

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
    console.log(`[Scheduler] Reminder terkirim ke ${mentor.nama} (${mentor.no_wa}) - Kelompok: ${kelompok.nama}`);
  }
}

// Manual trigger (untuk testing)
async function triggerManual() {
  await sendReminders();
}

module.exports = { startScheduler, triggerManual };
