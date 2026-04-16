const SUPABASE_URL = 'https://fhcsnrkmkghzananqenc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3Nucmtta2doemFuYW5xZW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTc1NjAsImV4cCI6MjA5MTY3MzU2MH0.OZvlfKwuoZXn97jhyAdTCcAskFVicBbY-_SPrrvV-Ts';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_BUCKET = 'memories';
