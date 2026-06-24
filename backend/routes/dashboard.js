const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// Helper: format bulan ke range tanggal
function getBulanRange(bulan, tahun) {
  const start = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const end = new Date(tahun, bulan, 0).toISOString().split('T')[0]; // last day of month
  return { start, end };
}

// ===== SUMMARY OVERVIEW =====
router.get('/summary', async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    const now = new Date();
    const b = parseInt(bulan) || now.getMonth() + 1;
    const t = parseInt(tahun) || now.getFullYear();
    const { start, end } = getBulanRange(b, t);

    // Total sesi bulan ini
    const { data: sesiAll } = await supabase
      .from('sesi_mentoring')
      .select('id, status')
      .gte('tanggal_sesi', start)
      .lte('tanggal_sesi', end);

    const totalSesi = sesiAll?.length || 0;
    const sesiTerlaksana = sesiAll?.filter(s => s.status === 'terlaksana').length || 0;
    const sesiPending = sesiAll?.filter(s => s.status === 'pending').length || 0;
    const sesiDijadwalUlang = sesiAll?.filter(s => s.status === 'dijadwal_ulang').length || 0;

    // Rata-rata kehadiran bulan ini
    const sesiIds = sesiAll?.filter(s => s.status === 'terlaksana').map(s => s.id) || [];
    let avgKehadiran = 0;
    if (sesiIds.length > 0) {
      const { data: monevData } = await supabase
        .from('monev')
        .select('persen_kehadiran')
        .in('sesi_id', sesiIds);
      if (monevData?.length) {
        avgKehadiran = Math.round(monevData.reduce((acc, m) => acc + (m.persen_kehadiran || 0), 0) / monevData.length);
      }
    }

    // Alert: mentee perlu ditangani HRD bulan ini
    let alertCount = 0;
    if (sesiIds.length > 0) {
      const { data: alerts } = await supabase
        .from('monev')
        .select('id')
        .in('sesi_id', sesiIds)
        .eq('kondisi_mentee', 'perlu_ditangani_hrd');
      alertCount = alerts?.length || 0;
    }

    // Total mentor & mentee
    const { count: totalMentor } = await supabase.from('mentors').select('*', { count: 'exact', head: true });
    const { count: totalMentee } = await supabase.from('mentees').select('*', { count: 'exact', head: true });

    res.json({
      periode: { bulan: b, tahun: t, start, end },
      totalSesi,
      sesiTerlaksana,
      sesiPending,
      sesiDijadwalUlang,
      avgKehadiran,
      alertCount,
      totalMentor,
      totalMentee
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LAPORAN PER MENTOR =====
router.get('/laporan-mentor', async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    const now = new Date();
    const b = parseInt(bulan) || now.getMonth() + 1;
    const t = parseInt(tahun) || now.getFullYear();
    const { start, end } = getBulanRange(b, t);

    const { data: sesiData, error } = await supabase
      .from('sesi_mentoring')
      .select(`
        id, status, tanggal_sesi,
        kelompok(id, nama, mentees(id)),
        mentor:mentors(id, nama, no_wa),
        monev(jumlah_hadir, total_mentee, persen_kehadiran, kondisi_mentee, kendala)
      `)
      .gte('tanggal_sesi', start)
      .lte('tanggal_sesi', end)
      .order('tanggal_sesi', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Group by mentor
    const byMentor = {};
    for (const sesi of sesiData || []) {
      const mentorId = sesi.mentor?.id;
      if (!mentorId) continue;

      if (!byMentor[mentorId]) {
        byMentor[mentorId] = {
          mentor: sesi.mentor,
          kelompok: sesi.kelompok?.nama || '-',
          totalMentee: sesi.kelompok?.mentees?.length || 0,
          totalSesi: 0,
          sesiTerlaksana: 0,
          avgKehadiran: 0,
          kehadiranData: [],
          alerts: 0,
          kendalaList: [],
          sesiList: []
        };
      }

      const m = byMentor[mentorId];
      m.totalSesi++;
      m.sesiList.push({
        tanggal: sesi.tanggal_sesi,
        status: sesi.status,
        monev: sesi.monev?.[0] || null
      });

      if (sesi.status === 'terlaksana' && sesi.monev?.[0]) {
        m.sesiTerlaksana++;
        m.kehadiranData.push(sesi.monev[0].persen_kehadiran || 0);
        if (sesi.monev[0].kondisi_mentee === 'perlu_ditangani_hrd') m.alerts++;
        if (sesi.monev[0].kendala && sesi.monev[0].kendala.toUpperCase() !== 'TIDAK ADA') {
          m.kendalaList.push(sesi.monev[0].kendala);
        }
      }
    }

    // Hitung rata-rata kehadiran & responsibility
    const result = Object.values(byMentor).map(m => {
      const avgKehadiran = m.kehadiranData.length
        ? Math.round(m.kehadiranData.reduce((a, b) => a + b, 0) / m.kehadiranData.length)
        : 0;
      const responsibility = m.totalSesi > 0 ? Math.round((m.sesiTerlaksana / m.totalSesi) * 100) : 0;
      return { ...m, avgKehadiran, responsibility, kehadiranData: undefined };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ALERT MENTEE PERLU DITANGANI =====
router.get('/alerts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('monev')
      .select(`
        id, kondisi_mentee, kendala, created_at,
        sesi:sesi_mentoring(tanggal_sesi, kelompok(nama, mentor:mentors(nama, no_wa)))
      `)
      .eq('kondisi_mentee', 'perlu_ditangani_hrd')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== TREND KEHADIRAN (chart) =====
router.get('/trend', async (req, res) => {
  try {
    const { tahun } = req.query;
    const t = parseInt(tahun) || new Date().getFullYear();

    const { data, error } = await supabase
      .from('monev')
      .select('persen_kehadiran, created_at, sesi:sesi_mentoring(tanggal_sesi)')
      .order('created_at');

    if (error) return res.status(500).json({ error: error.message });

    // Group by bulan
    const byBulan = Array(12).fill(null).map((_, i) => ({ bulan: i + 1, values: [] }));
    for (const m of data || []) {
      const tgl = m.sesi?.tanggal_sesi;
      if (!tgl) continue;
      const d = new Date(tgl);
      if (d.getFullYear() !== t) continue;
      byBulan[d.getMonth()].values.push(m.persen_kehadiran || 0);
    }

    const result = byBulan.map(b => ({
      bulan: b.bulan,
      avg: b.values.length ? Math.round(b.values.reduce((a, c) => a + c, 0) / b.values.length) : null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
