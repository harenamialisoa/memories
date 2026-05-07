// ============================================
// APP.JS v3 — Find me in the river
// ============================================

let quotesData    = [];
let currentQuote  = 0;
let quoteInterval = null;
let currentMemoryId = null;
let visitorToken  = null;
let sessionToken  = null;

document.addEventListener('DOMContentLoaded', async () => {
  visitorToken  = getOrCreate('sv_token',   'v_');
  sessionToken  = getOrCreate('sv_session', 's_');
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
  await Promise.all([loadMemories(), loadQuotes(), checkMyMessages()]);
});

function getOrCreate(key, prefix) {
  let v = localStorage.getItem(key);
  if (!v) { v = prefix + Date.now() + '_' + Math.random().toString(36).slice(2,9); localStorage.setItem(key, v); }
  return v;
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
// SETTINGS + HERO DYNAMIQUE
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
    if (data.page_title)    { document.getElementById('page-title').textContent = data.page_title; document.title = data.page_title; }

    // À la une : image / vidéo / memory
    const type = data.une_type || 'image';
    const uneMeta = { title: data.une_title, desc: data.une_desc, date: data.une_date };
    if (type === 'video' && data.une_video_url) {
      renderHeroVideo(data.une_video_url, uneMeta);
    } else if ((type === 'memory' || type === 'new') && data.une_memory_id) {
      await renderHeroMemory(data.une_memory_id, uneMeta);
    } else {
      const img = document.getElementById('hero-image');
      if (img && data.hero_image_url) img.src = data.hero_image_url;
      // Afficher titre/desc sur image si renseignés
      if (uneMeta.title) renderHeroImageMeta(uneMeta);
    }
  } catch (e) {}
}

function renderHeroVideo(url, meta={}) {
  const frame = document.getElementById('hero-frame');
  let embedUrl = url;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0`;
  else if (vmMatch) embedUrl = `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  const isEmbed = ytMatch || vmMatch;
  const metaHtml = buildUneMeta(meta);
  const inner = isEmbed
    ? `<iframe src="${embedUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : `<video src="${url}" autoplay muted loop playsinline></video>`;
  frame.innerHTML = `
    <div class="hero-video-inner">${inner}${metaHtml}</div>
    <div class="hero-img-label" id="hero-label">✦ À la une</div>
    <div class="frame-corner tl"></div><div class="frame-corner tr"></div>
    <div class="frame-corner bl"></div><div class="frame-corner br"></div>
    <div class="hero-deco-1">✦</div><div class="hero-deco-2">❧</div>`;
}

async function renderHeroMemory(memoryId, meta={}) {
  try {
    const { data: mem } = await supabaseClient.from('memories').select('*').eq('id', memoryId).single();
    if (!mem) return;
    const frame  = document.getElementById('hero-frame');
    const imgUrl = getImageUrl(mem.image_path);
    // Priorité : meta admin → données du souvenir
    const title  = meta.title || mem.title;
    const date   = meta.date  ? formatDate(meta.date) : formatDate(mem.memory_date);
    const desc   = meta.desc  || mem.description || '';
    const safeD  = encodeURIComponent(JSON.stringify({ id: mem.id, title: mem.title, description: mem.description, image_path: mem.image_path, memory_date: mem.memory_date, _type: 'admin' }));
    frame.innerHTML = `
      <div class="hero-memory-inner" onclick="openDetail('${safeD}')">
        <img src="${imgUrl}" alt="${esc(title)}" />
        <div class="hero-memory-caption">
          <div class="hero-memory-title">${esc(title)}</div>
          ${date   ? `<div class="hero-memory-date">${date}</div>` : ''}
          ${desc   ? `<div class="hero-memory-desc">${esc(desc)}</div>` : ''}
        </div>
      </div>
      <div class="hero-img-label" id="hero-label">✦ À la une</div>
      <div class="frame-corner tl"></div><div class="frame-corner tr"></div>
      <div class="frame-corner bl"></div><div class="frame-corner br"></div>
      <div class="hero-deco-1">✦</div><div class="hero-deco-2">❧</div>`;
  } catch (e) {}
}

function renderHeroImageMeta(meta) {
  const frame = document.getElementById('hero-frame');
  if (!frame || !meta.title) return;
  const existing = frame.querySelector('.hero-memory-caption');
  if (existing) existing.remove();
  const inner = frame.querySelector('.hero-img-inner');
  if (!inner) return;
  const caption = document.createElement('div');
  caption.className = 'hero-memory-caption';
  caption.innerHTML = `
    <div class="hero-memory-title">${esc(meta.title)}</div>
    ${meta.date ? `<div class="hero-memory-date">${formatDate(meta.date)}</div>` : ''}
    ${meta.desc ? `<div class="hero-memory-desc">${esc(meta.desc)}</div>` : ''}`;
  inner.appendChild(caption);
}

function buildUneMeta(meta) {
  if (!meta || !meta.title) return '';
  return `<div class="hero-memory-caption">
    <div class="hero-memory-title">${esc(meta.title)}</div>
    ${meta.date ? `<div class="hero-memory-date">${formatDate(meta.date)}</div>` : ''}
    ${meta.desc ? `<div class="hero-memory-desc">${esc(meta.desc)}</div>` : ''}
  </div>`;
}

// ====================================
// MEMORIES — oldest first
// ====================================
async function loadMemories() {
  const grid = document.getElementById('gallery-grid');
  try {
    const [{ data: adminMems }, { data: visitorMems }] = await Promise.all([
      supabaseClient.from('memories').select('*').order('memory_date', { ascending: true }),
      supabaseClient.from('visitor_posts').select('*').eq('status', 'approved').order('created_at', { ascending: true })
    ]);
    const all = [
      ...(adminMems   || []).map(m => ({ ...m, _type: 'admin' })),
      ...(visitorMems || []).map(m => ({ ...m, memory_date: m.created_at, _type: 'visitor' }))
    ].sort((a, b) => new Date(a.memory_date) - new Date(b.memory_date));

    if (all.length === 0) { grid.innerHTML = `<div class="empty-state"><p>Aucun souvenir pour l'instant...</p></div>`; return; }

    grid.innerHTML = all.map(mem => {
      const imgUrl  = getImageUrl(mem.image_path);
      const dateStr = formatDate(mem.memory_date);
      const safe    = encodeURIComponent(JSON.stringify({ id: mem.id, title: mem.title, description: mem.description, image_path: mem.image_path, memory_date: mem.memory_date, _type: mem._type }));
      const badge   = mem._type === 'visitor' ? `<div class="visitor-badge-card">✦ Visiteur</div>` : '';
      return `
        <div class="gallery-card" onclick="openDetail('${safe}')">
          ${badge}
          <img src="${imgUrl}" alt="${esc(mem.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=60'" />
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
  } catch (e) { grid.innerHTML = `<div class="empty-state"><p>Impossible de charger les souvenirs.</p></div>`; }
}

// ====================================
// DETAIL MODAL
// ====================================
function openDetail(encodedData) {
  const mem = JSON.parse(decodeURIComponent(encodedData));
  currentMemoryId = mem.id;
  document.getElementById('detail-img').src           = getImageUrl(mem.image_path);
  document.getElementById('detail-title').textContent = mem.title || '';
  const detailTextEl = document.getElementById('detail-text');
  if (detailTextEl) {
    // Render rich HTML if it contains tags, otherwise plain text
    const desc = mem.description || '';
    if (desc.includes('<') && desc.includes('>')) {
      detailTextEl.innerHTML = desc;
      detailTextEl.className = 'detail-text detail-text-rich';
    } else {
      detailTextEl.textContent = desc;
      detailTextEl.className = 'detail-text';
    }
  }
  document.getElementById('detail-date').textContent  = formatDate(mem.memory_date) || '';
  ['❤️','😢','😮','😂','👏','🌹'].forEach(e => {
    const c = document.getElementById('r-' + e);
    if (c) { c.textContent = '0'; c.closest('.reaction-btn').classList.remove('reacted'); }
  });
  document.getElementById('comments-list').innerHTML = '<div class="loading-spinner" style="margin:16px auto;width:20px;height:20px;border-width:2px;"></div>';
  document.getElementById('c-pseudo').value  = '';
  document.getElementById('c-content').value = '';
  document.getElementById('detail-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  loadReactions(mem.id);
  loadComments(mem.id);
}

function closeDetail() { document.getElementById('detail-modal').classList.remove('open'); document.body.style.overflow = ''; currentMemoryId = null; }
function closeDetailOnOverlay(e) { if (e.target === document.getElementById('detail-modal')) closeDetail(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDetail(); closeMsgPanel(); } });

// ====================================
// REACTIONS
// ====================================
async function loadReactions(memoryId) {
  try {
    const { data } = await supabaseClient.from('reactions').select('emoji, visitor_token').eq('memory_id', memoryId);
    if (!data) return;
    const counts = {}, mine = new Set();
    data.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; if (r.visitor_token === visitorToken) mine.add(r.emoji); });
    ['❤️','😢','😮','😂','👏','🌹'].forEach(emoji => {
      const c = document.getElementById('r-' + emoji); if (!c) return;
      c.textContent = counts[emoji] || 0;
      c.closest('.reaction-btn').classList.toggle('reacted', mine.has(emoji));
    });
  } catch (e) {}
}

async function react(emoji) {
  if (!currentMemoryId) return;
  const btn = document.querySelector(`.reaction-btn[data-emoji="${emoji}"]`);
  const c   = document.getElementById('r-' + emoji);
  if (!btn || !c) return;
  const already = btn.classList.contains('reacted');
  try {
    if (already) {
      await supabaseClient.from('reactions').delete().eq('memory_id', currentMemoryId).eq('visitor_token', visitorToken).eq('emoji', emoji);
      btn.classList.remove('reacted'); c.textContent = Math.max(0, parseInt(c.textContent) - 1);
    } else {
      await supabaseClient.from('reactions').insert([{ memory_id: currentMemoryId, emoji, visitor_token: visitorToken }]);
      btn.classList.add('reacted'); c.textContent = parseInt(c.textContent) + 1;
      c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 400);
    }
  } catch (e) { console.error(e); }
}

// ====================================
// COMMENTS
// ====================================
async function loadComments(memoryId) {
  const list = document.getElementById('comments-list');
  try {
    const { data: roots } = await supabaseClient.from('comments').select('*').eq('memory_id', memoryId).is('parent_id', null).order('created_at', { ascending: true });
    if (!roots || roots.length === 0) { list.innerHTML = '<p class="no-comments">Soyez le premier à commenter...</p>'; return; }
    const { data: replies } = await supabaseClient.from('comments').select('*').eq('memory_id', memoryId).not('parent_id', 'is', null).order('created_at', { ascending: true });
    const rMap = {};
    (replies || []).forEach(r => { if (!rMap[r.parent_id]) rMap[r.parent_id] = []; rMap[r.parent_id].push(r); });
    list.innerHTML = roots.map(c => renderComment(c, rMap[c.id] || [])).join('');
  } catch (e) { list.innerHTML = '<p class="no-comments">Impossible de charger.</p>'; }
}

function renderComment(c, replies) {
  const ri = replies.map(r => `
    <div class="reply-item comment-item">
      <div class="comment-header"><span class="comment-pseudo">↳ ${esc(r.pseudo)}</span><span class="comment-time">${timeAgo(r.created_at)}</span></div>
      <p class="comment-text">${esc(r.content)}</p>
    </div>`).join('');
  return `
    <div class="comment-item" id="c-${c.id}">
      <div class="comment-header"><span class="comment-pseudo">${esc(c.pseudo)}</span><span class="comment-time">${timeAgo(c.created_at)}</span></div>
      <p class="comment-text">${esc(c.content)}</p>
      <button class="comment-reply-btn" onclick="toggleReplyForm('${c.id}')">Répondre</button>
      <div class="reply-form" id="rf-${c.id}">
        <input type="text" id="rp-pseudo-${c.id}" placeholder="Votre prénom..." maxlength="30" class="c-input-small" />
        <textarea id="rp-content-${c.id}" rows="2" maxlength="300" placeholder="Votre réponse..."
          style="width:100%;margin-bottom:6px;padding:8px 12px;border:1px solid rgba(201,132,122,0.22);border-radius:4px;font-family:var(--font-sans);font-size:0.85rem;outline:none;resize:none;background:var(--white);color:var(--warm-dark);"></textarea>
        <button class="btn-comment" onclick="postComment('${c.id}')">Répondre</button>
      </div>
      ${ri ? `<div class="replies-list">${ri}</div>` : ''}
    </div>`;
}

function toggleReplyForm(id) { document.getElementById('rf-' + id)?.classList.toggle('open'); }

async function postComment(parentId) {
  if (!currentMemoryId) return;
  const pseudo  = (parentId ? document.getElementById('rp-pseudo-' + parentId) : document.getElementById('c-pseudo'))?.value.trim() || 'Anonyme';
  const content = (parentId ? document.getElementById('rp-content-' + parentId) : document.getElementById('c-content'))?.value.trim();
  if (!content) return;
  try {
    await supabaseClient.from('comments').insert([{ memory_id: currentMemoryId, pseudo: pseudo || 'Anonyme', content, parent_id: parentId || null }]);
    if (parentId) { const f = document.getElementById('rf-' + parentId); if (f) { f.classList.remove('open'); f.querySelector('textarea').value = ''; } }
    else { document.getElementById('c-pseudo').value = ''; document.getElementById('c-content').value = ''; }
    loadComments(currentMemoryId);
  } catch (e) { console.error(e); }
}

// ====================================
// VISITOR POST (auto-approved)
// ====================================
function vpPreview(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('vp-preview').src = e.target.result;
    document.getElementById('vp-preview').style.display = 'block';
    document.getElementById('vp-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function submitVisitorPost() {
  const pseudo = document.getElementById('vp-pseudo').value.trim();
  const email  = document.getElementById('vp-email').value.trim();
  const title  = document.getElementById('vp-title').value.trim();
  const desc   = document.getElementById('vp-desc').value.trim();
  const file   = document.getElementById('vp-file').files[0];
  const btn    = document.getElementById('vp-submit');
  const errEl  = document.getElementById('vp-error');
  const succEl = document.getElementById('vp-success');
  errEl.style.display = succEl.style.display = 'none';
  if (!pseudo)              { showVpErr('Veuillez saisir votre prénom.'); return; }
  if (!email || !email.includes('@')) { showVpErr('Email valide requis.'); return; }
  if (!title)               { showVpErr('Veuillez saisir un titre.'); return; }
  btn.textContent = 'Envoi...'; btn.disabled = true;
  try {
    let imagePath = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const fn  = `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: sErr } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(fn, file, { cacheControl: '3600' });
      if (sErr) throw sErr;
      imagePath = fn;
    }
    const { error } = await supabaseClient.from('visitor_posts').insert([{ pseudo, email, title, description: desc || null, image_path: imagePath, status: 'approved' }]);
    if (error) throw error;
    ['vp-pseudo','vp-email','vp-title','vp-desc'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('vp-file').value = '';
    document.getElementById('vp-preview').style.display = 'none';
    document.getElementById('vp-placeholder').style.display = 'block';
    succEl.textContent = '✦ Votre souvenir a été publié !';
    succEl.style.display = 'block';
    await loadMemories();
  } catch (e) { showVpErr(e.message || 'Erreur.'); }
  finally { btn.textContent = 'Partager ce souvenir'; btn.disabled = false; }
}
function showVpErr(msg) { const el = document.getElementById('vp-error'); el.textContent = msg; el.style.display = 'block'; }

// ====================================
// MESSENGER — Real-time Facebook-style
// ====================================
let messengerOpen  = false;
let myPseudo       = null;
let realtimeSub    = null;
let lastMsgDate    = null;
let adminTypingTimeout = null;

function toggleMessenger() {
  messengerOpen = !messengerOpen;
  const win = document.getElementById('messenger-window');
  win.classList.toggle('open', messengerOpen);
  document.getElementById('msg-fab').style.transform = messengerOpen ? 'scale(0.9)' : '';

  if (messengerOpen) {
    // Masquer badge
    const badge = document.getElementById('msg-fab-badge');
    badge.style.display = 'none';
    // Vérifier pseudo
    myPseudo = localStorage.getItem('msn_pseudo');
    if (!myPseudo) {
      document.getElementById('msn-pseudo-prompt').classList.add('show');
    } else {
      initMessenger();
    }
  } else {
    // Unsubscribe real-time quand fermé
    if (realtimeSub) { supabaseClient.removeChannel(realtimeSub); realtimeSub = null; }
  }
}

function confirmPseudo() {
  const val = document.getElementById('msn-pseudo-input').value.trim();
  if (!val) return;
  myPseudo = val;
  localStorage.setItem('msn_pseudo', val);
  document.getElementById('msn-pseudo-prompt').classList.remove('show');
  initMessenger();
}

async function initMessenger() {
  await loadMessages();
  subscribeRealtime();
  markVisitorRead();
}

// Charger tous les messages de cette session
async function loadMessages() {
  const container = document.getElementById('msn-messages');
  try {
    const { data } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('session_token', sessionToken)
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) {
      container.innerHTML = `<div class="msn-empty" id="msn-empty">
        <div class="msn-empty-icon">💬</div>
        <p>Envoyez un message — nous vous répondrons dès que possible ✦</p>
      </div>`;
      return;
    }

    lastMsgDate = null;
    container.innerHTML = data.map(m => renderBubble(m)).join('');
    scrollToBottom();
  } catch (e) { console.error(e); }
}

function renderBubble(msg) {
  const isVisitor = msg.sender === 'visitor';
  const time      = formatMsgTime(msg.created_at);
  const dateLabel = getMsgDate(msg.created_at);
  let daySep = '';
  if (dateLabel !== lastMsgDate) {
    daySep = `<div class="msn-day-sep">${dateLabel}</div>`;
    lastMsgDate = dateLabel;
  }
  const initials = isVisitor
    ? (myPseudo || msg.pseudo || 'V')[0].toUpperCase()
    : '🌹';
  const avatarStyle = isVisitor ? '' : 'background:var(--rose-light);color:var(--rose-dark);font-size:0.9rem;';

  return `${daySep}
  <div class="msn-bubble-wrap ${isVisitor ? 'visitor' : 'admin'}">
    <div class="msn-bubble-avatar" style="${avatarStyle}">${initials}</div>
    <div>
      <div class="msn-bubble">${escHtml(msg.content)}</div>
      <div class="msn-bubble-time">${time}</div>
    </div>
  </div>`;
}

// Real-time subscription
function subscribeRealtime() {
  if (realtimeSub) supabaseClient.removeChannel(realtimeSub);

  realtimeSub = supabaseClient
    .channel('visitor-messages-' + sessionToken)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `session_token=eq.${sessionToken}`
    }, payload => {
      const msg = payload.new;
      appendBubble(msg);
      // Si message admin → badge FAB si fermé
      if (msg.sender === 'admin' && !messengerOpen) {
        showFabBadge();
      }
      // Masquer typing
      if (msg.sender === 'admin') hideTyping();
      markVisitorRead();
    })
    .subscribe();
}

function appendBubble(msg) {
  const container = document.getElementById('msn-messages');
  const empty     = document.getElementById('msn-empty');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.innerHTML = renderBubble(msg);
  container.appendChild(div.firstElementChild);
  if (div.children.length > 0) {
    Array.from(div.children).forEach(c => container.appendChild(c));
  }
  scrollToBottom();
}

function scrollToBottom() {
  const c = document.getElementById('msn-messages');
  if (c) c.scrollTop = c.scrollHeight;
}

// Envoyer message visiteur
async function sendVisitorMessage() {
  const input   = document.getElementById('msn-input');
  const content = input.value.trim();
  if (!content || !myPseudo) return;

  const btn = document.getElementById('msn-send-btn');
  btn.disabled = true;
  input.value  = '';
  autoResize(input);

  try {
    const { error } = await supabaseClient.from('messages').insert([{
      pseudo:        myPseudo,
      content,
      sender:        'visitor',
      session_token: sessionToken,
      read_by_admin:   false,
      read_by_visitor: true
    }]);
    if (error) throw error;
  } catch (e) { console.error(e); input.value = content; }
  finally { btn.disabled = false; input.focus(); }
}

function handleMsgKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendVisitorMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// Typing indicator (admin typing → visitor voit)
function hideTyping() {
  document.getElementById('msn-typing')?.classList.remove('show');
}

async function markVisitorRead() {
  try {
    await supabaseClient.from('messages')
      .update({ read_by_visitor: true })
      .eq('session_token', sessionToken)
      .eq('sender', 'admin');
  } catch (e) {}
}

function showFabBadge() {
  const badge = document.getElementById('msg-fab-badge');
  if (badge) { badge.style.display = 'flex'; badge.textContent = '!'; }
}

async function checkUnreadAdmin() {
  try {
    const { data } = await supabaseClient.from('messages')
      .select('id')
      .eq('session_token', sessionToken)
      .eq('sender', 'admin')
      .eq('read_by_visitor', false);
    if (data && data.length > 0) showFabBadge();
  } catch (e) {}
}

// Formatters
function formatMsgTime(d) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function getMsgDate(d) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString())     return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day:'numeric', month:'long' });
}
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ====================================
// QUOTES
// ====================================
async function loadQuotes() {
  try {
    const { data } = await supabaseClient.from('quotes').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) { setupDots(1); return; }
    quotesData = data; setupDots(data.length); showQuote(0);
    if (quoteInterval) clearInterval(quoteInterval);
    quoteInterval = setInterval(() => showQuote((currentQuote + 1) % quotesData.length), 6000);
  } catch (e) {}
}
function setupDots(n) {
  const el = document.getElementById('quote-dots'); if (!el) return;
  el.innerHTML = Array.from({ length: n }, (_, i) => `<button class="dot${i===0?' active':''}" onclick="showQuote(${i})"></button>`).join('');
}
function showQuote(idx) {
  if (!quotesData.length) return; currentQuote = idx;
  const q = quotesData[idx], qEl = document.getElementById('main-quote'), aEl = document.getElementById('quote-author');
  qEl.classList.add('fade-out'); aEl.classList.add('fade-out');
  setTimeout(() => { qEl.textContent = q.text; aEl.textContent = q.author ? '— ' + q.author : '— Anonyme'; qEl.classList.remove('fade-out'); aEl.classList.remove('fade-out'); }, 400);
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

// ====================================
// ANIMATIONS
// ====================================
function initPageTransition() {
  const o = document.getElementById('page-transition');
  o.classList.add('entering'); setTimeout(() => o.classList.remove('entering'), 600);
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
    a.addEventListener('click', e => { e.preventDefault(); o.classList.add('leaving'); setTimeout(() => window.location.href = href, 480); });
  });
}
function initCursor() {
  const cursor = document.getElementById('cursor'), dot = document.getElementById('cursor-dot');
  if (!cursor) return;
  let mx=0,my=0,cx=0,cy=0;
  document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; dot.style.left=mx+'px'; dot.style.top=my+'px'; });
  (function anim(){ cx+=(mx-cx)*0.12; cy+=(my-cy)*0.12; cursor.style.left=cx+'px'; cursor.style.top=cy+'px'; requestAnimationFrame(anim); })();
  document.querySelectorAll('a,button,.gallery-card,.magnetic').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
  });
  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));
}
function initPetals() {
  const c = document.getElementById('petals'); if (!c) return;
  const s = ['✦','❧','·','✿','❋'];
  function spawn() {
    const p = document.createElement('div'); p.className='petal'; p.textContent=s[Math.floor(Math.random()*s.length)];
    p.style.left=Math.random()*100+'vw'; p.style.fontSize=(8+Math.random()*8)+'px';
    const d=12+Math.random()*16; p.style.animationDuration=d+'s'; p.style.opacity=String(0.2+Math.random()*0.3);
    c.appendChild(p); setTimeout(()=>p.remove(),d*1000);
  }
  let n=0; (function loop(){ if(n<18){spawn();n++;} setTimeout(loop,2200+Math.random()*1800); })();
}
function initNavbarScroll() {
  const nav=document.getElementById('navbar'); if(!nav) return;
  window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>60),{passive:true});
}
function initScrollReveal() {
  const obs=new IntersectionObserver(entries=>{ entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);} }); },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.section-header').forEach(el=>obs.observe(el));
}
function revealGalleryCards() {
  const obs=new IntersectionObserver(entries=>{ entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);} }); },{threshold:0.08});
  document.querySelectorAll('.gallery-card').forEach((card,i)=>{ card.style.transitionDelay=(i*0.07)+'s'; obs.observe(card); });
}
function initParallax() {
  const img=document.querySelector('.hero-img-inner img'); if(!img) return;
  window.addEventListener('scroll',()=>{ img.style.transform=`translateY(${window.scrollY*0.18}px) scale(1.05)`; },{passive:true});
}
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el=>{
    el.addEventListener('mousemove',e=>{ const r=el.getBoundingClientRect(); el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*0.28}px,${(e.clientY-r.top-r.height/2)*0.28}px)`; });
    el.addEventListener('mouseleave',()=>el.style.transform='');
  });
}
function initGalleryRipple() {
  document.addEventListener('mousemove',e=>{ const card=e.target.closest('.gallery-card'); if(!card) return; const r=card.getBoundingClientRect(); card.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); card.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); });
}

// ====================================
// UTILS
// ====================================
function getImageUrl(path) {
  if (!path) return 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=60';
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || path;
}
function formatDate(d) { if(!d) return ''; return new Date(d).toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'}); }
function timeAgo(d) {
  const diff=Date.now()-new Date(d).getTime(), m=Math.floor(diff/60000);
  if(m<1) return 'À l\'instant'; if(m<60) return `Il y a ${m} min`;
  const h=Math.floor(m/60); if(h<24) return `Il y a ${h}h`;
  const dy=Math.floor(h/24); if(dy<7) return `Il y a ${dy}j`;
  return formatDate(d);
}
function setText(id,v){const el=document.getElementById(id);if(el&&v)el.textContent=v;}
function setHTML(id,v){const el=document.getElementById(id);if(el&&v)el.innerHTML=v;}
function esc(str){if(!str)return'';return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
