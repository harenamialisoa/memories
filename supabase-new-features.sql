-- ============================================
-- NOUVELLES TABLES — Features v2
-- Exécute dans Supabase > SQL Editor
-- ============================================

-- REACTIONS sur chaque memory
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('❤️','😢','😮','😂','👏','🌹')),
  visitor_token TEXT NOT NULL, -- fingerprint anonyme stocké en localStorage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id, visitor_token, emoji)
);

-- COMMENTAIRES anonymes
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  pseudo TEXT NOT NULL DEFAULT 'Anonyme',
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- pour les réponses
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PUBLICATIONS VISITEURS (nécessitent approbation)
CREATE TABLE IF NOT EXISTS visitor_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo TEXT NOT NULL,
  email TEXT, -- visible admin seulement
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAGE VIEWS (compteur visiteurs)
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token TEXT NOT NULL,
  page TEXT DEFAULT 'home',
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vue pour compter les visiteurs uniques
CREATE OR REPLACE VIEW visitor_count AS
  SELECT COUNT(DISTINCT visitor_token) as total FROM page_views WHERE page = 'home';

-- Désactiver RLS sur toutes les nouvelles tables
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_views DISABLE ROW LEVEL SECURITY;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_reactions_memory ON reactions(memory_id);
CREATE INDEX IF NOT EXISTS idx_comments_memory ON comments(memory_id);
CREATE INDEX IF NOT EXISTS idx_visitor_posts_status ON visitor_posts(status);
