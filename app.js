// ============================================
// APP.JS — Find me in the river
// Reactions + Comments + Visitor Posts (auto-approved)
// ============================================

let quotesData    = [];
let currentQuote  = 0;
let quoteInterval = null;
let currentMemoryId = null;
let visitorToken  = null;

document.addEventListener('DOMContentLoaded', async () => {
  visitorToken = getVisitorToken();
  initPageTransition();
  initCursor();
  initPetals();
  initNavbarScroll();
  initScrollReveal();
  initParallax();
  initMagnetic();
  initGalleryRipple();
  trackPageView();
  await applySettings();
  await Promise.all([loadMemories(), loadQuotes()]);
});

// ====================================
// VISITOR TOKEN
// ====================================
function getVisitorToken() {
  let token = localStorage.getItem('sv_token');
  if (!token) {
    token = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('sv_token', token);
  }
  return token;
}

// ====================================
// PAGE VIEW
// ====================================
async function trackPageView() {
  try {
    if (sessionStorage.getItem('sv_viewed')) return;
    sessionStorage.setItem('sv_viewed', '1');
    await supabaseClient.from('page_views').insert([{ visitor_token: visitorToken, page: 'home' }]);
  } catch (e) {}
}

// ====================================
// SETTINGS
// ====================================
async function applySettings() {
  try {
    const { data } = await supabaseClient.from('settings').select('*').eq('id', 1).single();
    if (!data) return;
    if (data.site_title)    setHTML('hero-title',   data.site_title);
    if (data.site_subtitle) setText('hero-eyebrow', data.site_subtitle);
    if (data.site_desc)     setText('hero-desc',    data.site_desc);
    if (data.hero_quote)    setText('hero-quote',   '"' + data.hero_quote + '"');
    if (data.footer_msg)    setText('footer-msg',   data.footer_msg);
    if (data.nav_brand)     setText('nav-brand',    data.nav_brand);
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

// ====================================
// MEMORIES — oldest first
// ====================================
async function loadMemories() {
  const grid = document.getElementById('gallery-grid');
  try {
    // Admin memories + visitor posts (tous approuvés automatiquement = status 'approved')
    const [{ data: adminMems }, { data: visitorMems }] = await Promise.all([
      supabaseClient.from('memories').select('*').order('memory_date', { ascending: true }),
      supabaseClient.from('visitor_posts').select('*').eq('status', 'approved').order('created_at', { ascending: true })
    ]);

    const allMems = [
      ...(adminMems  || []).map(m => ({ ...m, _type: 'admin' })),
      ...(visitorMems|| []).map(m => ({ ...m, memory_date: m.created_at, _type: 'visitor' }))
    ].sort((a, b) => new Date(a.memory_date) - new Date(b.memory_date));

    if (allMems.length === 0) {
      grid.innerHTML = `<div class="empty-state"><p>Aucun souvenir pour l'instant...</p></div>`;
      return;
    }

    grid.innerHTML = allMems.map(mem => {
      const imgUrl   = getImageUrl(mem.image_path);
      const dateStr  = formatDate(mem.memory_date);
      const safeData = encodeURIComponent(JSON.stringify({
        id: mem.id, title: mem.title, description: mem.description,
        image_path: mem.image_path, memory_date: mem.memory_date, _type: mem._type
      }));
      const badge = mem._type === 'visitor'
        ? `<div class="visitor-badge-card">✦ Visiteur</div>` : '';
      return `
        <div class="gallery-card" onclick="openDetail('${safeData}')">
          ${badge}
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

    initMagnetic();
    document.querySelectorAll('.gallery-card').forEach(el => {
      el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('hovered'));
      el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('hovered'));
    });
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
  currentMemoryId = mem.id;

  document.getElementById('detail-img').src              = getImageUrl(mem.image_path);
  document.getElementById('detail-title').textContent    = mem.title || '';
  document.getElementById('detail-text').textContent     = mem.description || '';
  document.getElementById('detail-date').textContent     = formatDate(mem.memory_date) || '';

  // Reset reactions
  ['❤️','😢','😮','😂','👏','🌹'].forEach(e => {
    const countEl = document.getElementById('r-' + e);
    if (countEl) {
      countEl.textContent = '0';
      countEl.closest('.reaction-btn').classList.remove('reacted');
    }
  });

  // Reset comments
  document.getElementById('comments-list').innerHTML =
    '<div class="loading-spinner" style="margin:16px auto;width:20px;height:20px;border-width:2px;"></div>';
  document.getElementById('c-pseudo').value  = '';
  document.getElementById('c-content').value = '';

  document.getElementById('detail-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  loadReactions(mem.id);
  loadComments(mem.id);
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('open');
  document.body.style.overflow = '';
  currentMemoryId = null;
}

function closeDetailOnOverlay(event) {
  if (event.target === document.getElementById('detail-modal')) closeDetail();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// ====================================
// REACTIONS
// ====================================
async function loadReactions(memoryId) {
  try {
    const { data } = await supabaseClient
      .from('reactions').select('emoji, visitor_token').eq('memory_id', memoryId);
    if (!data) return;
    const counts = {};
    const mine   = new Set();
    data.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      if (r.visitor_token === visitorToken) mine.add(r.emoji);
    });
    ['❤️','😢','😮','😂','👏','🌹'].forEach(emoji => {
      const countEl = document.getElementById('r-' + emoji);
      if (!countEl) return;
      countEl.textContent = counts[emoji] || 0;
      const btn = countEl.closest('.reaction-btn');
      if (btn) btn.classList.toggle('reacted', mine.has(emoji));
    });
  } catch (e) {}
}

async function react(emoji) {
  if (!currentMemoryId) return;
  const btn     = document.querySelector(`.reaction-btn[data-emoji="${emoji}"]`);
  const countEl = document.getElementById('r-' + emoji);
  if (!btn || !countEl) return;
  const already = btn.classList.contains('reacted');
  try {
    if (already) {
      await supabaseClient.from('reactions').delete()
        .eq('memory_id', currentMemoryId).eq('visitor_token', visitorToken).eq('emoji', emoji);
      btn.classList.remove('reacted');
      countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    } else {
      await supabaseClient.from('reactions').insert([{
        memory_id: currentMemoryId, emoji, visitor_token: visitorToken
      }]);
      btn.classList.add('reacted');
      countEl.textContent = parseInt(countEl.textContent) + 1;
      countEl.classList.add('bump');
      setTimeout(() => countEl.classList.remove('bump'), 400);
    }
  } catch (e) { console.error(e); }
}

// ====================================
// COMMENTS
// ====================================
async function loadComments(memoryId) {
  const list = document.getElementById('comments-list');
  try {
    const { data: roots } = await supabaseClient
      .from('comments').select('*').eq('memory_id', memoryId)
      .is('parent_id', null).order('created_at', { ascending: true });

    if (!roots || roots.length === 0) {
      list.innerHTML = '<p class="no-comments">Soyez le premier à commenter...</p>';
      return;
    }

    const { data: replies } = await supabaseClient
      .from('comments').select('*').eq('memory_id', memoryId)
      .not('parent_id', 'is', null).order('created_at', { ascending: true });

    const repliesMap = {};
    (replies || []).forEach(r => {
      if (!repliesMap[r.parent_id]) repliesMap[r.parent_id] = [];
      repliesMap[r.parent_id].push(r);
    });

    list.innerHTML = roots.map(c => renderComment(c, repliesMap[c.id] || [])).join('');
  } catch (e) {
    list.innerHTML = '<p class="no-comments">Impossible de charger les commentaires.</p>';
  }
}

function renderComment(c, replies) {
  const replyItems = replies.map(r => `
    <div class="reply-item comment-item">
      <div class="comment-header">
        <span class="comment-pseudo">↳ ${esc(r.pseudo)}</span>
        <span class="comment-time">${timeAgo(r.created_at)}</span>
      </div>
      <p class="comment-text">${esc(r.content)}</p>
    </div>`).join('');

  return `
    <div class="comment-item" id="c-${c.id}">
      <div class="comment-header">
        <span class="comment-pseudo">${esc(c.pseudo)}</span>
        <span class="comment-time">${timeAgo(c.created_at)}</span>
      </div>
      <p class="comment-text">${esc(c.content)}</p>
      <button class="comment-reply-btn" onclick="toggleReplyForm('${c.id}')">Répondre</button>
      <div class="reply-form" id="rf-${c.id}">
        <input type="text" id="rp-pseudo-${c.id}" placeholder="Votre prénom..." maxlength="30" class="c-input-small" />
        <textarea id="rp-content-${c.id}" placeholder="Votre réponse..." rows="2" maxlength="300"
          style="width:100%;margin-bottom:6px;padding:8px 12px;border:1px solid rgba(201,132,122,0.22);
          border-radius:4px;font-family:var(--font-sans);font-size:0.85rem;outline:none;resize:none;
          background:var(--white);color:var(--warm-dark);"></textarea>
        <button class="btn-comment" onclick="postComment('${c.id}')">Répondre</button>
      </div>
      ${replyItems ? `<div class="replies-list">${replyItems}</div>` : ''}
    </div>`;
}

function toggleReplyForm(commentId) {
  document.getElementById('rf-' + commentId)?.classList.toggle('open');
}

async function postComment(parentId) {
  if (!currentMemoryId) return;
  let pseudo, content;
  if (parentId) {
    pseudo  = document.getElementById('rp-pseudo-'  + parentId)?.value.trim() || 'Anonyme';
    content = document.getElementById('rp-content-' + parentId)?.value.trim();
  } else {
    pseudo  = document.getElementById('c-pseudo')?.value.trim()  || 'Anonyme';
    content = document.getElementById('c-content')?.value.trim();
  }
  if (!content) return;
  try {
    await supabaseClient.from('comments').insert([{
      memory_id: currentMemoryId,
      pseudo:    pseudo || 'Anonyme',
      content,
      parent_id: parentId || null
    }]);
    if (parentId) {
      const form = document.getElementById('rf-' + parentId);
      if (form) { form.classList.remove('open'); form.querySelector('textarea').value = ''; }
    } else {
      document.getElementById('c-pseudo').value  = '';
      document.getElementById('c-content').value = '';
    }
    loadComments(currentMemoryId);
  } catch (e) { console.error(e); }
}

// ====================================
// VISITOR POST — miseho avy hatrany (status: approved)
// ====================================
function vpPreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('vp-preview').src             = e.target.result;
    document.getElementById('vp-preview').style.display   = 'block';
    document.getElementById('vp-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function submitVisitorPost() {
  const pseudo  = document.getElementById('vp-pseudo').value.trim();
  const email   = document.getElementById('vp-email').value.trim();
  const title   = document.getElementById('vp-title').value.trim();
  const desc    = document.getElementById('vp-desc').value.trim();
  const file    = document.getElementById('vp-file').files[0];
  const btn     = document.getElementById('vp-submit');
  const errEl   = document.getElementById('vp-error');
  const succEl  = document.getElementById('vp-success');

  errEl.style.display  = 'none';
  succEl.style.display = 'none';

  if (!pseudo)               { showVpErr('Veuillez saisir votre prénom.'); return; }
  if (!email || !email.includes('@')) { showVpErr('Email valide requis.'); return; }
  if (!title)                { showVpErr('Veuillez saisir un titre.'); return; }

  btn.textContent = 'Envoi...';
  btn.disabled    = true;

  try {
    let imagePath = null;
    if (file) {
      const ext      = file.name.split('.').pop();
      const fileName = `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: storErr } = await supabaseClient.storage
        .from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600' });
      if (storErr) throw storErr;
      imagePath = fileName;
    }

    // status: 'approved' directement — pas de validation admin
    const { error } = await supabaseClient.from('visitor_posts').insert([{
      pseudo, email, title,
      description: desc || null,
      image_path:  imagePath,
      status:      'approved'
    }]);
    if (error) throw error;

    // Reset form
    ['vp-pseudo','vp-email','vp-title','vp-desc'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('vp-file').value            = '';
    document.getElementById('vp-preview').style.display = 'none';
    document.getElementById('vp-placeholder').style.display = 'block';

    succEl.textContent   = '✦ Votre souvenir a été publié ! Rafraîchissez la page pour le voir.';
    succEl.style.display = 'block';

    // Recharger la galerie
    await loadMemories();

  } catch (e) {
    showVpErr(e.message || 'Erreur lors de l\'envoi.');
  } finally {
    btn.textContent = 'Partager ce souvenir';
    btn.disabled    = false;
  }
}

function showVpErr(msg) {
  const el = document.getElementById('vp-error');
  el.textContent = msg; el.style.display = 'block';
}

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
  const q   = quotesData[idx];
  const qEl = document.getElementById('main-quote');
  const aEl = document.getElementById('quote-author');
  qEl.classList.add('fade-out'); aEl.classList.add('fade-out');
  setTimeout(() => {
    qEl.textContent = q.text;
    aEl.textContent = q.author ? '— ' + q.author : '— Anonyme';
    qEl.classList.remove('fade-out'); aEl.classList.remove('fade-out');
  }, 400);
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

// ====================================
// ANIMATIONS
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

function initCursor() {
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursor-dot');
  if (!cursor) return;
  let mx = 0, my = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });
  (function anim() {
    cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;
    cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
    requestAnimationFrame(anim);
  })();
  document.querySelectorAll('a,button,.gallery-card,.magnetic').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
  });
  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));
}

function initPetals() {
  const container = document.getElementById('petals');
  if (!container) return;
  const symbols = ['✦','❧','·','✿','❋'];
  function spawn() {
    const p = document.createElement('div');
    p.className   = 'petal';
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left  = Math.random() * 100 + 'vw';
    p.style.fontSize = (8 + Math.random() * 8) + 'px';
    const dur = 12 + Math.random() * 16;
    p.style.animationDuration = dur + 's';
    p.style.opacity = String(0.2 + Math.random() * 0.3);
    container.appendChild(p);
    setTimeout(() => p.remove(), dur * 1000);
  }
  let n = 0;
  (function loop() {
    if (n < 18) { spawn(); n++; }
    setTimeout(loop, 2200 + Math.random() * 1800);
  })();
}

function initNavbarScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });
}

function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.section-header').forEach(el => obs.observe(el));
}

function revealGalleryCards() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.gallery-card').forEach((card, i) => {
    card.style.transitionDelay = (i * 0.07) + 's';
    obs.observe(card);
  });
}

function initParallax() {
  const img = document.querySelector('.hero-img-inner img');
  if (!img) return;
  window.addEventListener('scroll', () => {
    img.style.transform = `translateY(${window.scrollY * 0.18}px) scale(1.05)`;
  }, { passive: true });
}

function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX-r.left-r.width/2)*0.28}px,${(e.clientY-r.top-r.height/2)*0.28}px)`;
    });
    el.addEventListener('mouseleave', () => el.style.transform = '');
  });
}

function initGalleryRipple() {
  document.addEventListener('mousemove', e => {
    const card = e.target.closest('.gallery-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `Il y a ${d}j`;
  return formatDate(dateStr);
}

function setText(id, v) { const el = document.getElementById(id); if (el && v) el.textContent = v; }
function setHTML(id, v) { const el = document.getElementById(id); if (el && v) el.innerHTML   = v; }
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
