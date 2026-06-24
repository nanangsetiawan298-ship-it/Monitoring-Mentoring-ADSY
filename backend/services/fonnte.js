const axios = require('axios');
require('dotenv').config();

async function sendMessage(target, message) {
  try {
    const response = await axios.post(
      'https://api.fonnte.com/send',
      {
        target,
        message,
        device: process.env.FONNTE_DEVICE
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN
        }
      }
    );
    return response.data;
  } catch (err) {
    console.error('[Fonnte] Gagal kirim pesan ke', target, err.message);
    return null;
  }
}

module.exports = { sendMessage };
