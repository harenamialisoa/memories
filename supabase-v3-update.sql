-- ============================================
-- UPDATE v3 — Messages + À la une
-- Supabase > SQL Editor
-- ============================================

-- TABLE: messages (visiteur → admin, avec réponses)
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo     TEXT NOT NULL DEFAULT 'Visiteur',
  email      TEXT,
  content    TEXT NOT NULL,
  reply      TEXT,                          -- réponse de l'admin
  replied_at TIMESTAMPTZ,
  read       BOOLEAN DEFAULT FALSE,
  session_token TEXT NOT NULL,              -- pour que le visiteur retrouve ses messages
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonne à la une dans settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS une_type        TEXT DEFAULT 'image',  -- 'image' | 'video' | 'memory'
  ADD COLUMN IF NOT EXISTS une_memory_id   UUID,                  -- si type = memory
  ADD COLUMN IF NOT EXISTS une_video_url   TEXT;                  -- si type = video

-- Désactiver RLS
ALTER TABLE messages      DISABLE ROW LEVEL SECURITY;
ALTER TABLE reactions     DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments      DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_views    DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories      DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes        DISABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_token);
CREATE INDEX IF NOT EXISTS idx_messages_read    ON messages(read);
