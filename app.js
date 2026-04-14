// ============================================
// APP.JS — Page publique
// ============================================

let quotesData = [];
let currentQuote = 0;
let quoteInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await applySettings();
  await Promise.all([loadMemories(), loadQuotes()]);
});

// ====================================
// SETTINGS — appliqués à la page
// ====================================
async function applySettings() {
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return;

    if (data.site_title)    setText('hero-title', data.site_title);
    if (data.site_subtitle) setText('hero-eyebrow', data.site_subtitle);
    if (data.site_desc)     setText('hero-desc', data.site_desc);
    if (data.hero_quote)    setText('hero-quote', data.hero_quote);
    if (data.footer_msg)    setText('footer-msg', data.footer_msg);
    if (data.nav_brand)     setText('nav-brand', data.nav_brand);
    if (data.page_title) {
      document.getElementById('page-title').textContent = data.page_title;
      document.title = data.page_title;
    }
    if (data.hero_image_url) {
      const img = document.getElementById('hero-image');
      if (img) img.src = data.hero_image_url;
    }
  } catch (e) {
    // Settings table peut être vide, pas grave
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.innerHTML = value;
}

// ====================================
// MEMORIES
// ====================================
async function loadMemories() {
  const grid = document.getElementById('gallery-grid');
  try {
    const { data, error } = await supabaseClient
      .from('memories')
      .select('*')
      .order('memory_date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = `<div class="empty-state"><p>Aucun souvenir pour l'instant...</p></div>`;
      return;
    }

    grid.innerHTML = data.map(mem => {
      const imgUrl = getImageUrl(mem.image_path);
      const dateStr = formatDate(mem.memory_date);
      const safeData = encodeURIComponent(JSON.stringify({
        id: mem.id,
        title: mem.title,
        description: mem.description,
        image_path: mem.image_path,
        memory_date: mem.memory_date
      }));

      return `
        <div class="gallery-card" onclick="openDetail('${safeData}')">
          <img src="${imgUrl}" alt="${esc(mem.title)}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=60'" />
          <div class="gallery-card-overlay">
            <div class="gallery-card-date">${dateStr}</div>
            <div class="gallery-card-title">${esc(mem.title)}</div>
          </div>
          <div class="gallery-card-strip">
            <div class="gallery-card-strip-title">${esc(mem.title)}</div>
            ${dateStr ? `<div class="gallery-card-strip-date">${dateStr}</div>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="empty-state"><p>Impossible de charger les souvenirs.</p></div>`;
  }
}

// ====================================
// DETAIL MODAL
// ====================================
function openDetail(encodedData) {
  const mem = JSON.parse(decodeURIComponent(encodedData));
  const modal = document.getElementById('detail-modal');

  document.getElementById('detail-img').src = getImageUrl(mem.image_path);
  document.getElementById('detail-img').alt = mem.title;
  document.getElementById('detail-title').textContent = mem.title || '';
  document.getElementById('detail-text').textContent = mem.description || '';
  document.getElementById('detail-date').textContent = formatDate(mem.memory_date) || '';

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeDetailOnOverlay(event) {
  if (event.target === document.getElementById('detail-modal')) closeDetail();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDetail();
});

// ====================================
// QUOTES
// ====================================
async function loadQuotes() {
  try {
    const { data, error } = await supabaseClient
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Garder la quote par défaut déjà dans le HTML
      setupDots(1);
      return;
    }

    quotesData = data;
    setupDots(data.length);
    showQuote(0);

    // Auto rotation
    if (quoteInterval) clearInterval(quoteInterval);
    quoteInterval = setInterval(() => {
      showQuote((currentQuote + 1) % quotesData.length);
    }, 6000);

  } catch (e) {
    console.error(e);
  }
}

function setupDots(count) {
  const dotsEl = document.getElementById('quote-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = Array.from({ length: count }, (_, i) =>
    `<button class="dot${i === 0 ? ' active' : ''}" onclick="showQuote(${i})"></button>`
  ).join('');
}

function showQuote(idx) {
  if (!quotesData.length) return;
  currentQuote = idx;
  const q = quotesData[idx];

  const quoteEl = document.getElementById('main-quote');
  const authorEl = document.getElementById('quote-author');

  quoteEl.style.opacity = '0';
  authorEl.style.opacity = '0';

  setTimeout(() => {
    quoteEl.textContent = q.text;
    authorEl.textContent = q.author ? '— ' + q.author : '— Anonyme';
    quoteEl.style.opacity = '1';
    authorEl.style.opacity = '1';
  }, 300);

  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

// ====================================
// UTILS
// ====================================
function getImageUrl(path) {
  if (!path) return 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=60';
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || path;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
