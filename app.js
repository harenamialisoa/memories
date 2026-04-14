// ============================================
// APP.JS — Premium Animated Version
// ============================================

let quotesData = [];
let currentQuote = 0;
let quoteInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  initPageTransition();
  initCursor();
  initPetals();
  initNavbarScroll();
  initScrollReveal();
  initParallax();
  initMagnetic();
  initGalleryRipple();
  await applySettings();
  await Promise.all([loadMemories(), loadQuotes()]);
});

// ====================================
// PAGE TRANSITION
// ====================================
function initPageTransition() {
  const overlay = document.getElementById('page-transition');
  overlay.classList.add('entering');
  setTimeout(() => overlay.classList.remove('entering'), 600);

  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
    a.addEventListener('click', e => {
      e.preventDefault();
      overlay.classList.add('leaving');
      setTimeout(() => window.location.href = href, 480);
    });
  });
}

// ====================================
// CUSTOM CURSOR
// ====================================
function initCursor() {
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursor-dot');
  if (!cursor) return;

  let mx = 0, my = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  // Smooth lag for big cursor
  function animCursor() {
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    requestAnimationFrame(animCursor);
  }
  animCursor();

  // Hover states
  document.querySelectorAll('a, button, .gallery-card, .magnetic').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
  });

  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));
}

// ====================================
// FLOATING PETALS
// ====================================
function initPetals() {
  const container = document.getElementById('petals');
  if (!container) return;
  const symbols = ['✦', '❧', '·', '✿', '❋'];

  function spawnPetal() {
    const p = document.createElement('div');
    p.className = 'petal';
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left = Math.random() * 100 + 'vw';
    p.style.fontSize = (8 + Math.random() * 8) + 'px';
    const dur = 12 + Math.random() * 16;
    p.style.animationDuration = dur + 's';
    p.style.animationDelay = '0s';
    p.style.opacity = 0.2 + Math.random() * 0.3;
    container.appendChild(p);
    setTimeout(() => p.remove(), dur * 1000);
  }

  // Spawn gradually — subtle, not overwhelming
  let count = 0;
  function spawnLoop() {
    if (count < 18) { spawnPetal(); count++; }
    setTimeout(spawnLoop, 2200 + Math.random() * 1800);
  }
  setTimeout(spawnLoop, 1000);
}

// ====================================
// NAVBAR SCROLL
// ====================================
function initNavbarScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ====================================
// SCROLL REVEAL (Intersection Observer)
// ====================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .section-header').forEach(el => {
    observer.observe(el);
  });
}

// Reveal gallery cards after load with stagger
function revealGalleryCards() {
  const cards = document.querySelectorAll('.gallery-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

  cards.forEach((card, i) => {
    card.style.transitionDelay = (i * 0.08) + 's';
    observer.observe(card);
  });
}

// ====================================
// PARALLAX HERO IMAGE
// ====================================
function initParallax() {
  const img = document.querySelector('.hero-img-inner img');
  if (!img) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const rate = scrolled * 0.18;
    img.style.transform = `translateY(${rate}px) scale(1.05)`;
  }, { passive: true });
}

// ====================================
// MAGNETIC BUTTONS
// ====================================
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) * 0.28;
      const dy = (e.clientY - cy) * 0.28;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

// ====================================
// GALLERY CARD MOUSE RIPPLE
// ====================================
function initGalleryRipple() {
  document.addEventListener('mousemove', e => {
    const card = e.target.closest('.gallery-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
}

// ====================================
// SETTINGS
// ====================================
async function applySettings() {
  try {
    const { data } = await supabaseClient.from('settings').select('*').eq('id', 1).single();
    if (!data) return;
    if (data.site_title)    setHTML('hero-title', data.site_title);
    if (data.site_subtitle) setText('hero-eyebrow', data.site_subtitle);
    if (data.site_desc)     setText('hero-desc', data.site_desc);
    if (data.hero_quote)    setText('hero-quote', '"' + data.hero_quote + '"');
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
  } catch (e) {}
}

function setText(id, value) { const el = document.getElementById(id); if (el && value) el.textContent = value; }
function setHTML(id, value) { const el = document.getElementById(id); if (el && value) el.innerHTML = value; }

// ====================================
// MEMORIES
// ====================================
async function loadMemories() {
  const grid = document.getElementById('gallery-grid');
  try {
    const { data, error } = await supabaseClient
      .from('memories').select('*').order('memory_date', { ascending: false });
    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = `<div class="empty-state"><p>Aucun souvenir pour l'instant...</p></div>`;
      return;
    }

    grid.innerHTML = data.map(mem => {
      const imgUrl = getImageUrl(mem.image_path);
      const dateStr = formatDate(mem.memory_date);
      const safeData = encodeURIComponent(JSON.stringify({
        id: mem.id, title: mem.title, description: mem.description,
        image_path: mem.image_path, memory_date: mem.memory_date
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

    // Re-init magnetic + cursor for new cards
    initMagnetic();
    document.querySelectorAll('.gallery-card').forEach(el => {
      el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('hovered'));
      el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('hovered'));
    });

    // Staggered reveal
    setTimeout(revealGalleryCards, 100);

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
  document.getElementById('detail-img').src = getImageUrl(mem.image_path);
  document.getElementById('detail-title').textContent = mem.title || '';
  document.getElementById('detail-text').textContent  = mem.description || '';
  document.getElementById('detail-date').textContent  = formatDate(mem.memory_date) || '';
  const modal = document.getElementById('detail-modal');
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

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// ====================================
// QUOTES
// ====================================
async function loadQuotes() {
  try {
    const { data } = await supabaseClient.from('quotes').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) { setupDots(1); return; }
    quotesData = data;
    setupDots(data.length);
    showQuote(0);
    if (quoteInterval) clearInterval(quoteInterval);
    quoteInterval = setInterval(() => showQuote((currentQuote + 1) % quotesData.length), 6000);
  } catch (e) {}
}

function setupDots(count) {
  const el = document.getElementById('quote-dots');
  if (!el) return;
  el.innerHTML = Array.from({ length: count }, (_, i) =>
    `<button class="dot${i===0?' active':''}" onclick="showQuote(${i})"></button>`
  ).join('');
}

function showQuote(idx) {
  if (!quotesData.length) return;
  currentQuote = idx;
  const q = quotesData[idx];
  const qEl = document.getElementById('main-quote');
  const aEl = document.getElementById('quote-author');

  qEl.classList.add('fade-out');
  aEl.classList.add('fade-out');

  setTimeout(() => {
    qEl.textContent = q.text;
    aEl.textContent = q.author ? '— ' + q.author : '— Anonyme';
    qEl.classList.remove('fade-out');
    aEl.classList.remove('fade-out');
  }, 400);

  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
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
