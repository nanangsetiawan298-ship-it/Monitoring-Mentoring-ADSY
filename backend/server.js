require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const webhookRoute = require('./routes/webhook');
const adminRoute = require('./routes/admin');
const dashboardRoute = require('./routes/dashboard');
const cronRoute = require('./routes/cron');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend (untuk local dev — Vercel serve public/ otomatis)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
  app.get('/laporan', (req, res) => res.sendFile(path.join(__dirname, '../public/laporan.html')));
  app.get('/alert', (req, res) => res.sendFile(path.join(__dirname, '../public/alert.html')));
}

// API Routes
app.use('/webhook', webhookRoute);
app.use('/api/admin', adminRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/cron', cronRoute);

// Export untuk Vercel serverless
module.exports = app;

// Local dev
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🕌 Mentoring Monitor: http://localhost:${PORT}`);
    console.log(`⚙️  Admin: http://localhost:${PORT}/admin\n`);

    // Jalankan scheduler hanya di local
    const { startScheduler } = require('./services/scheduler');
    startScheduler();
  });
}
