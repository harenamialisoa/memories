// ============================================
// SUPABASE CONFIGURATION
// Remplis ces valeurs avec tes propres infos
// ============================================

const SUPABASE_URL = 'https://fhcsnrkmkghzananqenc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3Nucmtta2doemFuYW5xZW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTc1NjAsImV4cCI6MjA5MTY3MzU2MH0.OZvlfKwuoZXn97jhyAdTCcAskFVicBbY-_SPrrvV-Ts';

// Initialisation du client Supabase
// On charge la lib via CDN dans chaque page
// Assure-toi d'ajouter cette balise AVANT ce script :
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nom du bucket Supabase Storage pour les images
const STORAGE_BUCKET = 'memories';