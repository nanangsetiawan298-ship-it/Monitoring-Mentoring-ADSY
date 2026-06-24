const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { triggerManual } = require('../services/scheduler');

// ===== MENTORS =====
router.get('/mentors', async (req, res) => {
  const { data, error } = await supabase.from('mentors').select('*').order('nama');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/mentors', async (req, res) => {
  const { nama, no_wa } = req.body;
  const no_wa_clean = no_wa.replace(/\D/g, '').replace(/^0/, '62');
  const { data, error } = await supabase.from('mentors').insert({ nama, no_wa: no_wa_clean }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/mentors/:id', async (req, res) => {
  const { nama, no_wa } = req.body;
  const no_wa_clean = no_wa ? no_wa.replace(/\D/g, '').replace(/^0/, '62') : undefined;
  const updates = { nama };
  if (no_wa_clean) updates.no_wa = no_wa_clean;
  const { data, error } = await supabase.from('mentors').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/mentors/:id', async (req, res) => {
  const { error } = await supabase.from('mentors').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== MENTEES =====
router.get('/mentees', async (req, res) => {
  const { data, error } = await supabase.from('mentees').select('*, kelompok(nama)').order('nama');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/mentees', async (req, res) => {
  const { nama, no_wa, kelompok_id } = req.body;
  const no_wa_clean = no_wa ? no_wa.replace(/\D/g, '').replace(/^0/, '62') : null;
  const { data, error } = await supabase.from('mentees').insert({ nama, no_wa: no_wa_clean, kelompok_id }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/mentees/:id', async (req, res) => {
  const { nama, no_wa, kelompok_id } = req.body;
  const no_wa_clean = no_wa ? no_wa.replace(/\D/g, '').replace(/^0/, '62') : null;
  const { data, error } = await supabase.from('mentees').update({ nama, no_wa: no_wa_clean, kelompok_id }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/mentees/:id', async (req, res) => {
  const { error } = await supabase.from('mentees').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== KELOMPOK =====
router.get('/kelompok', async (req, res) => {
  const { data, error } = await supabase
    .from('kelompok')
    .select('*, mentor:mentors(id, nama), mentees(id, nama)')
    .order('nama');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/kelompok', async (req, res) => {
  const { nama, mentor_id, hari_mentoring } = req.body;
  const { data, error } = await supabase.from('kelompok').insert({ nama, mentor_id, hari_mentoring, aktif: true }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.put('/kelompok/:id', async (req, res) => {
  const { nama, mentor_id, hari_mentoring, aktif } = req.body;
  const { data, error } = await supabase.from('kelompok').update({ nama, mentor_id, hari_mentoring, aktif }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/kelompok/:id', async (req, res) => {
  const { error } = await supabase.from('kelompok').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== ADMINS =====
router.get('/admins', async (req, res) => {
  const { data, error } = await supabase.from('admins').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/admins', async (req, res) => {
  const { nama, no_wa } = req.body;
  const no_wa_clean = no_wa.replace(/\D/g, '').replace(/^0/, '62');
  const { data, error } = await supabase.from('admins').insert({ nama, no_wa: no_wa_clean }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/admins/:id', async (req, res) => {
  const { error } = await supabase.from('admins').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== TRIGGER REMINDER MANUAL =====
router.post('/trigger-reminder', async (req, res) => {
  try {
    await triggerManual();
    res.json({ success: true, message: 'Reminder berhasil dikirim' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
