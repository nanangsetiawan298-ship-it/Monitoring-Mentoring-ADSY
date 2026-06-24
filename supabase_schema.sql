-- ============================================================
-- MENTORING MONITOR — Supabase Schema
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- MENTORS
CREATE TABLE mentors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama text NOT NULL,
  no_wa text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- ADMINS (HRD yang menerima notif alert)
CREATE TABLE admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama text NOT NULL,
  no_wa text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- KELOMPOK MENTORING
CREATE TABLE kelompok (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama text NOT NULL,
  mentor_id uuid REFERENCES mentors(id) ON DELETE SET NULL,
  hari_mentoring int NOT NULL CHECK (hari_mentoring BETWEEN 0 AND 6),
  -- 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- MENTEES
CREATE TABLE mentees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama text NOT NULL,
  no_wa text,
  kelompok_id uuid REFERENCES kelompok(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- SESI MENTORING (dibuat otomatis H-1 oleh scheduler)
CREATE TABLE sesi_mentoring (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kelompok_id uuid REFERENCES kelompok(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES mentors(id) ON DELETE SET NULL,
  tanggal_sesi date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'terlaksana', 'tidak_terlaksana', 'dijadwal_ulang')),
  catatan_reschedule text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (kelompok_id, tanggal_sesi)
);

-- MONEV (hasil laporan dari mentor via bot)
CREATE TABLE monev (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sesi_id uuid REFERENCES sesi_mentoring(id) ON DELETE CASCADE,
  jumlah_hadir int NOT NULL DEFAULT 0,
  total_mentee int NOT NULL DEFAULT 0,
  persen_kehadiran numeric(5,2) DEFAULT 0,
  kendala text,
  kondisi_mentee text DEFAULT 'baik' CHECK (kondisi_mentee IN ('baik', 'perlu_perhatian', 'perlu_ditangani_hrd')),
  created_at timestamptz DEFAULT now()
);

-- BOT SESSIONS (conversation state)
CREATE TABLE bot_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  no_wa text NOT NULL UNIQUE,
  state text NOT NULL,
  data jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- REMINDER LOG
CREATE TABLE reminder_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sesi_id uuid REFERENCES sesi_mentoring(id) ON DELETE SET NULL,
  no_wa text,
  tanggal_kirim timestamptz DEFAULT now(),
  status text DEFAULT 'sent'
);

-- ===== INDEX untuk performa =====
CREATE INDEX idx_sesi_tanggal ON sesi_mentoring(tanggal_sesi);
CREATE INDEX idx_sesi_status ON sesi_mentoring(status);
CREATE INDEX idx_sesi_mentor ON sesi_mentoring(mentor_id);
CREATE INDEX idx_monev_sesi ON monev(sesi_id);
CREATE INDEX idx_bot_sessions_wa ON bot_sessions(no_wa);
CREATE INDEX idx_mentees_kelompok ON mentees(kelompok_id);

-- ===== ROW LEVEL SECURITY (opsional, aktifkan jika pakai anon key) =====
-- ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mentees ENABLE ROW LEVEL SECURITY;
-- dst...
