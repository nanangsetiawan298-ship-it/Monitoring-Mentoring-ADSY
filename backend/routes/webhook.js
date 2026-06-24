const express = require('express');
const router = express.Router();
const { handleIncoming } = require('../services/bot');

// Fonnte mengirim POST ke webhook ini saat ada pesan masuk
router.post('/', async (req, res) => {
  try {
    const { sender, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Format nomor: hilangkan karakter non-digit, pastikan format 628xxx
    const no_wa = sender.replace(/\D/g, '').replace(/^0/, '62');

    console.log(`[Webhook] Pesan dari ${no_wa}: ${message}`);

    // Proses pesan tanpa blocking response ke Fonnte
    handleIncoming(no_wa, message).catch(err => {
      console.error('[Webhook] Error handle pesan:', err.message);
    });

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
