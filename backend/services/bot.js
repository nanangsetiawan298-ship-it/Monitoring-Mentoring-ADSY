const supabase = require('./supabase');
const { sendMessage } = require('./fonnte');

// State machine states:
// awaiting_confirmation → hadir_count → kendala → kondisi → done
// awaiting_reschedule → done

async function getSession(no_wa) {
  const { data } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('no_wa', no_wa)
    .maybeSingle();
  return data;
}

async function setSession(no_wa, state, data = {}) {
  await supabase
    .from('bot_sessions')
    .upsert({ no_wa, state, data, updated_at: new Date().toISOString() }, { onConflict: 'no_wa' });
}

async function clearSession(no_wa) {
  await supabase.from('bot_sessions').delete().eq('no_wa', no_wa);
}

async function getMentorByWa(no_wa) {
  const { data } = await supabase
    .from('mentors')
    .select('*, kelompok(*, mentees(*))')
    .eq('no_wa', no_wa)
    .maybeSingle();
  return data;
}

async function getPendingSesiByMentor(mentor_id) {
  const { data } = await supabase
    .from('sesi_mentoring')
    .select('*, kelompok(nama, mentees(id))')
    .eq('mentor_id', mentor_id)
    .eq('status', 'pending')
    .order('tanggal_sesi', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

async function handleIncoming(no_wa, message) {
  const msg = message.trim();
  const session = await getSession(no_wa);

  // === No active session → cek apakah mentor ada pending sesi ===
  if (!session) {
    const mentor = await getMentorByWa(no_wa);
    if (!mentor) return; // bukan mentor, abaikan

    const sesi = await getPendingSesiByMentor(mentor.id);
    if (!sesi) {
      await sendMessage(no_wa, `Wa'alaikumsalam, Mas/Mbak ${mentor.nama}. Saat ini tidak ada sesi mentoring yang perlu dilaporkan. Jazakallah khair 🙏`);
      return;
    }

    // Simpan session dengan sesi_id
    await setSession(no_wa, 'awaiting_confirmation', { sesi_id: sesi.id, mentor_id: mentor.id, total_mentee: sesi.kelompok?.mentees?.length || 0, kelompok_nama: sesi.kelompok?.nama });
    await sendMessage(no_wa,
      `Wa'alaikumsalam, Mas/Mbak ${mentor.nama}!\n\nApakah sesi mentoring kelompok *${sesi.kelompok?.nama}* sudah terlaksana?\n\nBalas:\n*SUDAH* - jika sudah dilaksanakan\n*BELUM* - jika belum dilaksanakan`
    );
    return;
  }

  // === State: awaiting_confirmation ===
  if (session.state === 'awaiting_confirmation') {
    const upper = msg.toUpperCase();

    if (upper === 'SUDAH') {
      await setSession(no_wa, 'awaiting_hadir_count', session.data);
      await sendMessage(no_wa,
        `Alhamdulillah! 🎉\n\nDari *${session.data.total_mentee} mentee*, berapa yang hadir?\n\n(Ketik angka, contoh: *8*)`
      );
    } else if (upper === 'BELUM') {
      await setSession(no_wa, 'awaiting_reschedule', session.data);
      await sendMessage(no_wa,
        `Baik, kapan rencana pelaksanaan sesi mentoring?\n\n(Contoh: *Kamis, 26 Juni*)`
      );
    } else {
      await sendMessage(no_wa, `Maaf, balas dengan *SUDAH* atau *BELUM* ya, Mas/Mbak 🙏`);
    }
    return;
  }

  // === State: awaiting_hadir_count ===
  if (session.state === 'awaiting_hadir_count') {
    const jumlah = parseInt(msg);
    if (isNaN(jumlah) || jumlah < 0) {
      await sendMessage(no_wa, `Mohon ketik angka jumlah mentee yang hadir, Mas/Mbak.\n(Contoh: *8*)`);
      return;
    }

    const total = session.data.total_mentee;
    const persen = total > 0 ? Math.round((jumlah / total) * 100) : 0;
    const newData = { ...session.data, jumlah_hadir: jumlah, persen_kehadiran: persen };

    await setSession(no_wa, 'awaiting_kendala', newData);
    await sendMessage(no_wa,
      `Tercatat *${jumlah} dari ${total} mentee* hadir (*${persen}%*) ✅\n\nAdakah kendala dalam sesi mentoring kali ini?\n\n(Ceritakan kendalanya, atau ketik *TIDAK ADA* jika tidak ada kendala)`
    );
    return;
  }

  // === State: awaiting_kendala ===
  if (session.state === 'awaiting_kendala') {
    const kendala = msg;
    const newData = { ...session.data, kendala };

    await setSession(no_wa, 'awaiting_kondisi', newData);
    await sendMessage(no_wa,
      `Terima kasih informasinya 🙏\n\nBagaimana kondisi mentee secara umum?\n\n*1* - Baik semua\n*2* - Ada yang perlu perhatian lebih\n*3* - Ada yang perlu ditangani HRD`
    );
    return;
  }

  // === State: awaiting_kondisi ===
  if (session.state === 'awaiting_kondisi') {
    const kondisiMap = {
      '1': 'baik',
      '2': 'perlu_perhatian',
      '3': 'perlu_ditangani_hrd'
    };
    const kondisiLabel = {
      '1': 'Baik semua',
      '2': 'Ada yang perlu perhatian lebih',
      '3': 'Ada yang perlu ditangani HRD'
    };

    if (!kondisiMap[msg]) {
      await sendMessage(no_wa, `Balas dengan angka *1*, *2*, atau *3* ya, Mas/Mbak 🙏`);
      return;
    }

    const kondisi = kondisiMap[msg];
    const { sesi_id, jumlah_hadir, persen_kehadiran, kendala, total_mentee } = session.data;

    // Simpan ke DB
    await supabase.from('sesi_mentoring').update({ status: 'terlaksana' }).eq('id', sesi_id);
    await supabase.from('monev').insert({
      sesi_id,
      jumlah_hadir,
      total_mentee,
      persen_kehadiran,
      kendala,
      kondisi_mentee: kondisi
    });

    await clearSession(no_wa);
    await sendMessage(no_wa,
      `Jazakallah khair, Mas/Mbak! 🌟\n\nLaporan mentoring telah tercatat:\n✅ Kehadiran: *${jumlah_hadir}/${total_mentee} (${persen_kehadiran}%)*\n📝 Kendala: ${kendala}\n❤️ Kondisi mentee: *${kondisiLabel[msg]}*\n\nSemoga dimudahkan dalam mendampingi mentee-mentee terbaik. Aamiin 🤲`
    );

    // Jika kondisi perlu ditangani HRD, beri flag
    if (kondisi === 'perlu_ditangani_hrd') {
      await notifyAdminAlert(sesi_id, session.data);
    }
    return;
  }

  // === State: awaiting_reschedule ===
  if (session.state === 'awaiting_reschedule') {
    const { sesi_id } = session.data;

    await supabase.from('sesi_mentoring').update({
      status: 'dijadwal_ulang',
      catatan_reschedule: msg
    }).eq('id', sesi_id);

    await clearSession(no_wa);
    await sendMessage(no_wa,
      `Baik, rencana reschedule *${msg}* sudah dicatat 📅\n\nInsyaAllah akan ada reminder kembali. Jazakallah khair, Mas/Mbak 🙏`
    );
    return;
  }
}

// Notif ke admin jika ada mentee perlu ditangani HRD
async function notifyAdminAlert(sesi_id, data) {
  const { data: admins } = await supabase.from('admins').select('no_wa');
  if (!admins?.length) return;

  const { data: sesi } = await supabase
    .from('sesi_mentoring')
    .select('*, kelompok(nama, mentor:mentors(nama))')
    .eq('id', sesi_id)
    .maybeSingle();

  const msg = `🚨 *ALERT HRD*\n\nMentor *${sesi?.kelompok?.mentor?.nama}* melaporkan ada mentee yang perlu ditangani HRD.\n\nKelompok: *${sesi?.kelompok?.nama}*\nTanggal sesi: ${sesi?.tanggal_sesi}\n\nSilakan tindak lanjut segera.`;

  for (const admin of admins) {
    await sendMessage(admin.no_wa, msg);
  }
}

module.exports = { handleIncoming };
