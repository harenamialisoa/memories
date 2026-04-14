// ============================================
// SUPABASE CONFIGURATION
// Remplis ces valeurs avec tes propres infos
// ============================================

const SUPABASE_URL = 'https://VOTRE_PROJET_ID.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';

// Initialisation du client Supabase
// On charge la lib via CDN dans chaque page
// Assure-toi d'ajouter cette balise AVANT ce script :
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nom du bucket Supabase Storage pour les images
const STORAGE_BUCKET = 'memories';
