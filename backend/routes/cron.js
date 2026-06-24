const express = require('express');
const router = express.Router();
const { triggerManual } = require('../services/scheduler');

// Vercel Cron memanggil endpoint ini setiap hari 00:00 UTC (07:00 WIB)
// Vercel otomatis tambah header Authorization: Bearer {CRON_SECRET}
router.get('/reminder', async (req, res) => {
  const authHeader = req.headers.authorization;
  const secret = process.env.CRON_SECRET;

  // Verifikasi secret (skip jika CRON_SECRET tidak di-set, untuk local testing)
  if (secret && authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Trigger reminder otomatis dari Vercel Cron');
    await triggerManual();
    res.json({ success: true, message: 'Reminder terkirim', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Cron] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
