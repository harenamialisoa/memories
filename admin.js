// ============================================
// ADMIN.JS v3 — Find me in the river
// ============================================

supabaseClient.auth.getSession().then(({ data }) => {
  if (!data.session) window.location.href = 'login.html';
  else initAdmin();
});

async function initAdmin() {
  await Promise.all([loadAdminMemories(), loadAdminQuotes(), loadSettings(), loadVisitorPosts(), loadAdminStats()]);
}

// ====================================
// STATS
// ====================================
async function loadAdminStats() {
  try {
    const [
      { data: mems },
      { data: quotes },
      { data: views },
      { data: msgs },
      { data: comments }
    ] = await Promise.all([
      supabaseClient.from('memories').select('id'),
      supabaseClient.from('quotes').select('id'),
      supabaseClient.from('visitor_count').select('total').single(),
      supabaseClient.from('messages').select('id, read_by_admin, sender'),
      supabaseClient.from('comments').select('id')
    ]);
    setStatNum('stat-photos',   mems?.length     ?? '—');
    setStatNum('stat-quotes',   quotes?.length   ?? '—');
    setStatNum('stat-visitors', views?.total     ?? '—');
    setStatNum('stat-comments', comments?.length ?? '—');
    const unread = (msgs || []).filter(m => m.sender === 'visitor' && !m.read_by_admin).length;
    setStatNum('stat-messages', msgs?.length ?? '—');
    const badge = document.getElementById('msg-unread-badge');
    if (badge) badge.style.display = unread > 0 ? 'inline-block' : 'none';
  } catch (e) { console.error('Stats error:', e); }
}

function setStatNum(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ====================================
// TABS
// ====================================
function showTab(name) {
  const names = ['photos','visitor-posts','messages','quotes','comments','settings'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', names[i] === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
}

async function handleLogout() { await supabaseClient.auth.signOut(); window.location.href = 'login.html'; }

// ====================================
// MEMORIES
// ====================================
async function loadAdminMemories() {
  const grid = document.getElementById('admin-memories-grid');
  try {
    const { data, error } = await supabaseClient.from('memories').select('*').order('memory_date', { ascending: true });
    if (error) throw error;
    setStatNum('stat-photos', data?.length ?? 0);
    if (!data || data.length === 0) { grid.innerHTML = '<div class="empty-state"><p>Aucun souvenir.</p></div>'; return; }
    grid.innerHTML = data.map(mem => {
      const imgUrl   = getImageUrl(mem.image_path);
      const date     = mem.memory_date ? new Date(mem.memory_date).toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric' }) : '—';
      const safeJson = encodeURIComponent(JSON.stringify(mem));
      return `<div class="admin-memory-card">
        <img src="${imgUrl}" alt="${esc(mem.title)}" onerror="this.src='https://via.placeholder.com/400x300?text=Photo'" />
        <div class="admin-card-body">
          <div class="admin-card-title">${esc(mem.title)}</div>
          <div class="admin-card-date">${date}</div>
          <div class="admin-card-actions">
            <button class="btn-ghost"   onclick="openEditModal('${safeJson}')">Modifier</button>
            <button class="btn-danger"  onclick="deleteMemory('${mem.id}','${mem.image_path||''}')">Supprimer</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { grid.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>'; }
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeOnOverlay(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

function previewFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('preview-img').style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function uploadMemory() {
  const file = document.getElementById('file-input').files[0];
  const title = document.getElementById('mem-title').value.trim();
  const description = RTE.get('mem-text')?.getValue() || document.getElementById('mem-text')?.value.trim() || '';
  const memory_date = document.getElementById('mem-date').value;
  const btn   = document.getElementById('upload-btn');
  const errEl = document.getElementById('upload-error');
  if (!file)  { showErr(errEl,'Image requise.'); return; }
  if (!title) { showErr(errEl,'Titre requis.'); return; }
  btn.textContent = 'Envoi...'; btn.disabled = true; errEl.style.display = 'none';
  try {
    const ext = file.name.split('.').pop();
    const fn  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: sErr } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(fn, file, { cacheControl:'3600' });
    if (sErr) throw sErr;
    const { error: dErr } = await supabaseClient.from('memories').insert([{ title, description, image_path: fn, memory_date: memory_date||null }]);
    if (dErr) throw dErr;
    closeModal('upload-modal');
    ['file-input','mem-title','mem-date'].forEach(id => { document.getElementById(id).value=''; });
    RTE.get('mem-text')?.clear();
    document.getElementById('preview-img').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'block';
    await loadAdminMemories(); await loadAdminStats();
  } catch (e) { showErr(errEl, e.message||'Erreur.'); }
  finally { btn.textContent='Publier'; btn.disabled=false; }
}

function openEditModal(enc) {
  const mem = JSON.parse(decodeURIComponent(enc));
  document.getElementById('edit-id').value    = mem.id;
  document.getElementById('edit-title').value = mem.title||'';
  document.getElementById('edit-date').value  = mem.memory_date||'';
  // Set rich editor value
  const rteEdit = RTE.get('edit-text');
  if (rteEdit) rteEdit.setValue(mem.description||'');
  else { const el=document.getElementById('edit-text'); if(el) el.value=mem.description||''; }
  openModal('edit-modal');
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('edit-title').value.trim();
  const description = RTE.get('edit-text')?.getValue() || document.getElementById('edit-text')?.value.trim() || '';
  const memory_date = document.getElementById('edit-date').value;
  if (!title) { alert('Titre requis.'); return; }
  const { error } = await supabaseClient.from('memories').update({ title, description, memory_date: memory_date||null }).eq('id', id);
  if (error) { alert('Erreur: '+error.message); return; }
  closeModal('edit-modal'); await loadAdminMemories();
}

async function deleteMemory(id, imagePath) {
  if (!confirm('Supprimer définitivement ?')) return;
  await supabaseClient.from('memories').delete().eq('id', id);
  if (imagePath) await supabaseClient.storage.from(STORAGE_BUCKET).remove([imagePath]);
  await loadAdminMemories(); await loadAdminStats();
}

// ====================================
// VISITOR POSTS (avec suppression)
// ====================================
async function loadVisitorPosts() {
  const container = document.getElementById('visitor-posts-list');
  if (!container) return;
  try {
    const { data } = await supabaseClient.from('visitor_posts').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) { container.innerHTML = '<div class="empty-state"><p>Aucune publication.</p></div>'; return; }
    container.innerHTML = data.map(p => {
      const imgUrl = p.image_path ? getImageUrl(p.image_path) : null;
      const badge  = { pending:'<span class="status-badge pending">En attente</span>', approved:'<span class="status-badge approved">Approuvé</span>', rejected:'<span class="status-badge rejected">Refusé</span>' }[p.status] || '';
      return `<div class="vpost-card">
        ${imgUrl ? `<img src="${imgUrl}" class="vpost-img" alt="" />` : '<div class="vpost-no-img">Pas de photo</div>'}
        <div class="vpost-body">
          <div class="vpost-header">
            <div><span class="vpost-pseudo">${esc(p.pseudo)}</span>${badge}</div>
            <span class="vpost-date">${timeAgo(p.created_at)}</span>
          </div>
          <div class="vpost-title">${esc(p.title)}</div>
          <p class="vpost-desc">${esc(p.description||'')}</p>
          <div class="vpost-email">✉ ${esc(p.email||'—')}</div>
          <div class="vpost-actions">
            <button class="btn-delete" onclick="deleteVisitorPost('${p.id}','${p.image_path||''}')">✕ Supprimer</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { container.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>'; }
}

async function deleteVisitorPost(id, imagePath) {
  if (!confirm('Supprimer cette publication définitivement ?')) return;
  await supabaseClient.from('visitor_posts').delete().eq('id', id);
  if (imagePath) await supabaseClient.storage.from(STORAGE_BUCKET).remove([imagePath]);
  await loadVisitorPosts(); await loadAdminStats();
}

// ====================================
// MESSAGES — Admin Messenger Real-time
// ====================================
let activeSession    = null;
let adminMsgSub      = null;
let adminConvSub     = null;
let lastAdmMsgDate   = null;

async function loadAdminMessages() {
  await loadConversations();
  subscribeNewConversations();
}

async function loadConversations() {
  const items = document.getElementById('adm-conv-items');
  if (!items) return;
  try {
    // Grouper par session_token, prendre le dernier message
    const { data } = await supabaseClient
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      items.innerHTML = '<div style="padding:20px;font-size:0.82rem;color:var(--warm-muted);text-align:center;">Aucune conversation</div>';
      setStatNum('stat-messages', 0);
      return;
    }

    // Grouper par session_token
    const sessions = {};
    data.forEach(m => {
      if (!sessions[m.session_token]) sessions[m.session_token] = { msgs: [], pseudo: m.pseudo, unread: 0 };
      sessions[m.session_token].msgs.push(m);
      if (m.sender === 'visitor' && !m.read_by_admin) sessions[m.session_token].unread++;
    });

    const totalUnread = Object.values(sessions).reduce((s, v) => s + v.unread, 0);
    setStatNum('stat-messages', Object.keys(sessions).length);
    const badge = document.getElementById('msg-unread-badge');
    if (badge) badge.style.display = totalUnread > 0 ? 'inline-block' : 'none';

    items.innerHTML = Object.entries(sessions).map(([token, s]) => {
      const last    = s.msgs[0];
      const preview = last.content.length > 30 ? last.content.slice(0,30)+'…' : last.content;
      const initials = (s.pseudo||'?')[0].toUpperCase();
      const isActive = token === activeSession ? 'active' : '';
      const isUnread = s.unread > 0 ? 'unread' : '';
      return `<div class="adm-conv-item ${isActive} ${isUnread}" onclick="openConversation('${token}','${esc(s.pseudo)}')">
        <div class="adm-conv-avatar">${initials}</div>
        <div class="adm-conv-info">
          <div class="adm-conv-name">${esc(s.pseudo)}</div>
          <div class="adm-conv-preview">${last.sender==='admin'?'Vous: ':''}${esc(preview)}</div>
        </div>
        <div class="adm-conv-meta">
          <div class="adm-conv-time">${formatMsgTime(last.created_at)}</div>
          ${s.unread > 0 ? `<div class="adm-unread-count">${s.unread}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

async function openConversation(token, pseudo) {
  activeSession = token;
  // UI updates
  document.getElementById('adm-empty-chat').style.display      = 'none';
  document.getElementById('adm-chat-header').style.display      = 'flex';
  document.getElementById('adm-chat-messages').style.display    = 'flex';
  document.getElementById('adm-chat-input-bar').style.display   = 'flex';
  document.getElementById('adm-chat-name').textContent           = pseudo;
  document.getElementById('adm-chat-avatar').textContent         = (pseudo||'?')[0].toUpperCase();

  document.querySelectorAll('.adm-conv-item').forEach(el => el.classList.remove('active'));
  event?.currentTarget?.classList.add('active');

  // Load messages
  await loadConvMessages(token);
  // Mark as read
  await supabaseClient.from('messages').update({ read_by_admin: true }).eq('session_token', token).eq('sender', 'visitor');
  // Subscribe real-time for this conv
  subscribeConversation(token);
  await loadConversations();
  document.getElementById('adm-input')?.focus();
}

async function loadConvMessages(token) {
  const container = document.getElementById('adm-chat-messages');
  lastAdmMsgDate  = null;
  try {
    const { data } = await supabaseClient
      .from('messages').select('*').eq('session_token', token)
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px;font-family:var(--font-serif);font-style:italic;color:var(--warm-muted);font-size:0.9rem;">Début de la conversation</div>';
      return;
    }
    container.innerHTML = data.map(m => renderAdmBubble(m)).join('');
    container.scrollTop = container.scrollHeight;
  } catch (e) {}
}

function renderAdmBubble(msg) {
  const isAdmin = msg.sender === 'admin';
  const time    = formatMsgTime(msg.created_at);
  const dateStr = getMsgDate(msg.created_at);
  let sep = '';
  if (dateStr !== lastAdmMsgDate) {
    sep = `<div class="msn-day-sep">${dateStr}</div>`;
    lastAdmMsgDate = dateStr;
  }
  const initials = isAdmin ? '🌹' : (msg.pseudo||'V')[0].toUpperCase();
  const style    = isAdmin ? 'background:var(--rose-light);color:var(--rose-dark);font-size:0.9rem;' : '';
  return `${sep}
  <div class="msn-bubble-wrap ${isAdmin ? 'admin' : 'visitor'}">
    <div class="msn-bubble-avatar" style="${style}">${initials}</div>
    <div>
      <div class="msn-bubble">${esc(msg.content)}</div>
      <div class="msn-bubble-time">${time}</div>
    </div>
  </div>`;
}

function subscribeConversation(token) {
  if (adminMsgSub) supabaseClient.removeChannel(adminMsgSub);
  adminMsgSub = supabaseClient
    .channel('admin-conv-' + token)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `session_token=eq.${token}`
    }, payload => {
      const container = document.getElementById('adm-chat-messages');
      if (!container) return;
      const div = document.createElement('div');
      div.innerHTML = renderAdmBubble(payload.new);
      while (div.firstChild) container.appendChild(div.firstChild);
      container.scrollTop = container.scrollHeight;
      loadConversations();
      // Mark visitor messages as read
      if (payload.new.sender === 'visitor') {
        supabaseClient.from('messages').update({ read_by_admin: true }).eq('id', payload.new.id).then(()=>{});
      }
    })
    .subscribe();
}

function subscribeNewConversations() {
  if (adminConvSub) supabaseClient.removeChannel(adminConvSub);
  adminConvSub = supabaseClient
    .channel('admin-all-msgs')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: 'sender=eq.visitor'
    }, () => { loadConversations(); })
    .subscribe();
}

async function sendAdminMessage() {
  if (!activeSession) return;
  const input   = document.getElementById('adm-input');
  const content = input.value.trim();
  if (!content) return;
  input.value = ''; autoResizeAdm(input);
  try {
    await supabaseClient.from('messages').insert([{
      pseudo:          'Admin',
      content,
      sender:          'admin',
      session_token:   activeSession,
      read_by_admin:   true,
      read_by_visitor: false
    }]);
  } catch (e) { console.error(e); input.value = content; }
}

function handleAdmKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); }
}

function autoResizeAdm(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

async function deleteMessage(id) {
  if (!confirm('Supprimer ?')) return;
  await supabaseClient.from('messages').delete().eq('id', id);
  if (activeSession) await loadConvMessages(activeSession);
  await loadConversations();
}

function formatMsgTime(d) {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  return date.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) + ' ' + date.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}
function getMsgDate(d) {
  const date = new Date(d), today = new Date(), yesterday = new Date(today);
  yesterday.setDate(today.getDate()-1);
  if (date.toDateString() === today.toDateString())     return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}

// ====================================
// COMMENTS
// ====================================
async function loadAdminComments() {
  const list = document.getElementById('admin-comments-list');
  if (!list) return;
  try {
    const { data } = await supabaseClient.from('comments').select('*, memories(title)').order('created_at', { ascending: false }).limit(200);
    setStatNum('stat-comments', data?.length??0);
    if (!data || data.length === 0) { list.innerHTML = '<div class="empty-state"><p>Aucun commentaire.</p></div>'; return; }
    list.innerHTML = data.map(c => `
      <div class="comment-admin-item">
        <div class="comment-admin-header">
          <span class="comment-pseudo">${esc(c.pseudo)}</span>
          <span style="font-size:0.72rem;color:var(--warm-muted);">${c.memories?.title?'sur "'+esc(c.memories.title)+'"':''} — ${timeAgo(c.created_at)}</span>
          <button class="btn-danger" style="margin-left:auto" onclick="deleteComment('${c.id}')">Supprimer</button>
        </div>
        <p style="font-size:0.88rem;color:var(--warm-mid);margin-top:4px;">${esc(c.content)}</p>
      </div>`).join('');
  } catch (e) {}
}

async function deleteComment(id) {
  if (!confirm('Supprimer ?')) return;
  await supabaseClient.from('comments').delete().eq('id', id);
  await loadAdminComments(); await loadAdminStats();
}

// ====================================
// QUOTES
// ====================================
async function loadAdminQuotes() {
  const list = document.getElementById('quotes-list');
  try {
    const { data } = await supabaseClient.from('quotes').select('*').order('created_at', { ascending: false });
    setStatNum('stat-quotes', data?.length??0);
    if (!data || data.length === 0) { list.innerHTML = '<div class="empty-state"><p>Aucune citation.</p></div>'; return; }
    list.innerHTML = data.map(q => `
      <div class="quote-item">
        <div><div class="quote-item-text">"${esc(q.text)}"</div>${q.author?`<div class="quote-item-author">— ${esc(q.author)}</div>`:''}</div>
        <div class="quote-item-actions"><button class="btn-danger" onclick="deleteQuote('${q.id}')">Supprimer</button></div>
      </div>`).join('');
  } catch (e) { list.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>'; }
}

async function saveQuote() {
  const text = document.getElementById('quote-text').value.trim();
  const author = document.getElementById('quote-author').value.trim();
  if (!text) { alert('Citation requise.'); return; }
  const { error } = await supabaseClient.from('quotes').insert([{ text, author: author||null }]);
  if (error) { alert('Erreur: '+error.message); return; }
  closeModal('quote-modal');
  document.getElementById('quote-text').value = '';
  document.getElementById('quote-author').value = '';
  await loadAdminQuotes(); await loadAdminStats();
}

async function deleteQuote(id) {
  if (!confirm('Supprimer ?')) return;
  await supabaseClient.from('quotes').delete().eq('id', id);
  await loadAdminQuotes(); await loadAdminStats();
}

// ====================================
// SETTINGS + À LA UNE
// ====================================
// ====================================
// À LA UNE — Settings logic
// ====================================
function setUneType(type, btn) {
  // Update hidden input
  document.getElementById('s-une-type').value = type;
  // Update tabs
  document.querySelectorAll('.une-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  // Show/hide panels
  ['image','video','memory','new'].forEach(t => {
    const el = document.getElementById('une-' + t + '-wrap');
    if (el) el.style.display = t === type ? 'block' : 'none';
  });
  if (type === 'memory') loadMemoryPicker();
}

function toggleUneOptions() {
  const type = document.getElementById('s-une-type').value || 'image';
  // Sync tab buttons
  document.querySelectorAll('.une-tab').forEach((btn, i) => {
    const types = ['image','video','memory','new'];
    btn.classList.toggle('active', types[i] === type);
  });
  ['image','video','memory','new'].forEach(t => {
    const el = document.getElementById('une-' + t + '-wrap');
    if (el) el.style.display = t === type ? 'block' : 'none';
  });
  if (type === 'memory') loadMemoryPicker();
}

async function loadMemoryPicker() {
  const picker     = document.getElementById('memory-picker');
  const selectedId = document.getElementById('s-une-memory-id').value;
  try {
    const { data } = await supabaseClient.from('memories').select('*').order('memory_date', { ascending: true });
    if (!data || data.length === 0) {
      picker.innerHTML = '<p style="grid-column:1/-1;padding:16px;font-size:0.8rem;color:var(--warm-muted);text-align:center;">Aucun souvenir dans la galerie.</p>';
      return;
    }
    picker.innerHTML = data.map(m => {
      const img = getImageUrl(m.image_path);
      const sel = m.id === selectedId ? 'selected' : '';
      return `<div class="picker-card ${sel}" onclick="selectMemory('${m.id}',this)">
        <img src="${img}" alt="${esc(m.title)}" onerror="this.style.display='none'" />
        <div class="picker-card-label">${esc(m.title)}</div>
      </div>`;
    }).join('');
  } catch (e) {}
}

function selectMemory(id, el) {
  document.querySelectorAll('.picker-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('s-une-memory-id').value = id;
}

function previewUneImage() {
  const url = document.getElementById('s-hero-image').value.trim();
  if (!url) return;
  const wrap = document.getElementById('une-img-preview-wrap');
  const img  = document.getElementById('une-img-preview');
  img.src = url; wrap.style.display = 'block';
}

function previewUneVideo() {
  const url = document.getElementById('s-une-video').value.trim();
  if (!url) return;
  let embed = url;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
  const wrap  = document.getElementById('une-yt-preview');
  const frame = document.getElementById('une-yt-iframe');
  frame.src = embed; wrap.style.display = 'block';
}

function uneNewPreview(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('une-new-preview').src = e.target.result;
    document.getElementById('une-new-preview').style.display = 'block';
    document.getElementById('une-new-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function saveNewUneMemory() {
  const file  = document.getElementById('une-new-file').files[0];
  const title = document.getElementById('une-new-title').value.trim();
  const desc  = RTE.get('une-new-desc')?.getValue() || document.getElementById('une-new-desc')?.value.trim() || '';
  const date  = document.getElementById('une-new-date').value;
  const btn   = document.getElementById('une-new-btn');
  const errEl = document.getElementById('une-new-error');
  const sucEl = document.getElementById('une-new-success');

  errEl.style.display = sucEl.style.display = 'none';
  if (!file)  { errEl.textContent='Photo requise.';  errEl.style.display='block'; return; }
  if (!title) { errEl.textContent='Titre requis.';   errEl.style.display='block'; return; }

  btn.textContent='Publication...'; btn.disabled=true;
  try {
    const ext = file.name.split('.').pop();
    const fn  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: sErr } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(fn, file, { cacheControl:'3600' });
    if (sErr) throw sErr;
    const { data: mem, error: dErr } = await supabaseClient.from('memories')
      .insert([{ title, description: desc||null, image_path: fn, memory_date: date||null }])
      .select().single();
    if (dErr) throw dErr;

    // Sélectionner automatiquement comme à la une
    document.getElementById('s-une-type').value   = 'memory';
    document.getElementById('s-une-memory-id').value = mem.id;
    // Switch tab to memory
    document.querySelectorAll('.une-tab').forEach((t,i)=> t.classList.toggle('active', i===2));
    ['image','video','memory','new'].forEach(t => {
      const el = document.getElementById('une-' + t + '-wrap');
      if (el) el.style.display = t==='memory' ? 'block' : 'none';
    });
    await loadMemoryPicker();
    // Highlight the new one
    document.querySelectorAll('.picker-card').forEach(card => {
      if (!card.classList.contains('selected')) return;
    });

    // Reset form
    document.getElementById('une-new-file').value  = '';
    document.getElementById('une-new-title').value = '';
    RTE.get('une-new-desc')?.clear();
    document.getElementById('une-new-date').value  = '';
    document.getElementById('une-new-preview').style.display    = 'none';
    document.getElementById('une-new-placeholder').style.display = 'block';

    sucEl.textContent   = '✦ Souvenir publié et sélectionné comme à la une !';
    sucEl.style.display = 'block';
    await loadAdminMemories(); await loadAdminStats();
  } catch (e) { errEl.textContent=e.message||'Erreur.'; errEl.style.display='block'; }
  finally { btn.textContent='Publier ce souvenir'; btn.disabled=false; }
}

async function loadSettings() {
  try {
    const { data } = await supabaseClient.from('settings').select('*').eq('id',1).single();
    if (!data) return;
    setVal('s-nav-brand',    data.nav_brand);
    setVal('s-page-title',   data.page_title);
    setVal('s-subtitle',     data.site_subtitle);
    setVal('s-title',        data.site_title);
    setVal('s-desc',         data.site_desc);
    setVal('s-hero-quote',   data.hero_quote);
    setVal('s-hero-image',   data.hero_image_url);
    setVal('s-footer',       data.footer_msg);
    setVal('s-une-video',    data.une_video_url);
    setVal('s-une-memory-id',data.une_memory_id);
    setVal('s-une-title',    data.une_title);
    setVal('s-une-desc',     data.une_desc);
    setVal('s-une-date',     data.une_date);
    // Type à la une
    if (data.une_type) {
      document.getElementById('s-une-type').value = data.une_type;
      toggleUneOptions();
    }
  } catch (e) {}
}

async function saveSettings() {
  const btn    = document.getElementById('save-settings-btn');
  const status = document.getElementById('settings-status');
  btn.textContent = 'Enregistrement...'; btn.disabled = true; status.style.display = 'none';
  const type = document.getElementById('s-une-type')?.value || 'image';
  const payload = {
    id:             1,
    nav_brand:      getVal('s-nav-brand'),
    page_title:     getVal('s-page-title'),
    site_subtitle:  getVal('s-subtitle'),
    site_title:     getVal('s-title'),
    site_desc:      getVal('s-desc'),
    hero_quote:     getVal('s-hero-quote'),
    hero_image_url: getVal('s-hero-image'),
    footer_msg:     getVal('s-footer'),
    une_type:       type,
    une_title:      getVal('s-une-title'),
    une_desc:       getVal('s-une-desc'),
    une_date:       getVal('s-une-date') || null,
    une_video_url:  type==='video'  ? getVal('s-une-video')     : null,
    une_memory_id:  (type==='memory'||type==='new') ? getVal('s-une-memory-id') : null,
    updated_at:     new Date().toISOString()
  };
  Object.keys(payload).forEach(k => { if (payload[k]==='') payload[k]=null; });
  try {
    const { error } = await supabaseClient.from('settings').upsert(payload);
    if (error) throw error;
    status.textContent = '✓ Réglages enregistrés !';
    status.style.display = 'block';
    setTimeout(() => { status.style.display='none'; }, 3000);
  } catch (e) { alert('Erreur: '+e.message); }
  finally { btn.textContent='Enregistrer'; btn.disabled=false; }
}

// ====================================
// UTILS
// ====================================
function getImageUrl(path) {
  if (!path) return 'https://via.placeholder.com/400x300?text=Photo';
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || path;
}
function timeAgo(d) {
  const diff=Date.now()-new Date(d).getTime(), m=Math.floor(diff/60000);
  if(m<1) return "À l'instant"; if(m<60) return `Il y a ${m} min`;
  const h=Math.floor(m/60); if(h<24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h/24)}j`;
}
function showErr(el, msg) { el.textContent=msg; el.style.display='block'; }
function esc(str) { if(!str)return''; return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function setVal(id, val) { const el=document.getElementById(id); if(el&&val!=null) el.value=val; }
function getVal(id)      { const el=document.getElementById(id); return el?el.value.trim():''; }
