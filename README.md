# Mentoring Monitor — Sistem Monitoring Mentoring Agama Islam

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Buat file .env
```bash
cp .env.example .env
```
Isi dengan kredensial:
- `SUPABASE_URL` & `SUPABASE_KEY` → dari Supabase project
- `FONNTE_TOKEN` → token dari dashboard Fonnte
- `FONNTE_DEVICE` → device ID di Fonnte
- `BASE_URL` → URL server kamu (untuk webhook)

### 3. Setup database Supabase
Buka **Supabase SQL Editor**, jalankan seluruh isi `supabase_schema.sql`

### 4. Setup webhook Fonnte
- Masuk ke dashboard Fonnte
- Pilih device → Settings → Webhook URL
- Isi: `https://domain-kamu.com/webhook`
- Method: POST

### 5. Jalankan server
```bash
npm start
# atau development:
npm run dev
```

## Halaman
| URL | Fungsi |
|-----|--------|
| `/` | Dashboard HRD |
| `/laporan` | Laporan detail per mentor |
| `/alert` | Alert mentee perlu ditangani HRD |
| `/admin` | Input mentor, mentee, kelompok |

## Flow Bot WhatsApp
1. **H-1** sebelum jadwal mentoring → bot kirim reminder ke mentor
2. Setelah sesi → mentor balas "SUDAH" atau "BELUM"
3. Bot tanyakan: jumlah hadir, kendala, kondisi mentee
4. Data tersimpan ke Supabase → muncul di dashboard

## Scheduler
Reminder dikirim otomatis setiap hari **jam 07:00 WIB**
