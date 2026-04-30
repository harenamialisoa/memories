-- ============================================
-- SUPABASE SQL — Exécute ce script dans
-- ton dashboard Supabase > SQL Editor
-- ============================================

-- TABLE: memories
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  memory_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  site_title TEXT,
  site_subtitle TEXT,
  site_desc TEXT,
  footer_msg TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données par défaut pour settings
INSERT INTO settings (id, site_title, site_subtitle, site_desc, footer_msg)
VALUES (1, 'Des souvenirs gravés dans le temps', 'Un espace dédié à nos moments',
        'Chaque photo raconte une histoire. Chaque histoire mérite d''être célébrée.',
        'Fait avec ♥ pour toi')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE BUCKET — Créer manuellement dans
-- Supabase > Storage > New Bucket
-- Nom : "memories"
-- Public : OUI (cocher "Public bucket")
-- ============================================

-- RLS (Row Level Security)
-- Pour simplifier, désactive RLS sur ces tables
-- dans Supabase > Table Editor > RLS > Disable
-- OU utilise ces politiques :

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Public read memories" ON memories FOR SELECT USING (true);
CREATE POLICY "Public read quotes" ON quotes FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Écriture seulement pour les utilisateurs authentifiés
CREATE POLICY "Auth write memories" ON memories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write quotes" ON quotes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth write settings" ON settings FOR ALL USING (auth.role() = 'authenticated');
