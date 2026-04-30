// ============================================
// ADMIN.JS — Find me in the river
// ============================================

supabaseClient.auth.getSession().then(({ data }) => {
  if (!data.session) window.location.href = 'login.html';
  else initAdmin();
});

async function initAdmin() {
  await Promise.all([loadAdminMemories(), loadAdminQuotes(), loadSettings(), loadVisitorPosts(), loadAdminStats()]);
}

// ====================================
// STATS — corrigé (count via .length sur data réel)
// ====================================
async function loadAdminStats() {
  try {
    const [
      { data: mems },
      { data: quotes },
      { data: views },
      { data: vposts },
      { data: comments }
    ] = await Promise.all([
      supabaseClient.from('memories').select('id'),
      supabaseClient.from('quotes').select('id'),
      supabaseClient.from('visitor_count').select('total').single(),
      supabaseClient.from('visitor_posts').select('id').eq('status', 'pending'),
      supabaseClient.from('comments').select('id')
    ]);

    setStatNum('stat-photos',   mems?.length     ?? '—');
    setStatNum('stat-quotes',   quotes?.length   ?? '—');
    setStatNum('stat-visitors', views?.total     ?? '—');
    setStatNum('stat-pending',  vposts?.length   ?? '—');
    setStatNum('stat-comments', comments?.length ?? '—');
  } catch (e) { console.error('Stats error:', e); }
}

function setStatNum(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ====================================
// TABS
// ====================================
function showTab(name) {
  const names = ['photos', 'visitor-posts', 'quotes', 'comments', 'settings'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', names[i] === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// ====================================
// MEMORIES
// ====================================
async function loadAdminMemories() {
  const grid = document.getElementById('admin-memories-grid');
  try {
    const { data, error } = await supabaseClient
      .from('memories').select('*').order('memory_date', { ascending: true });
    if (error) throw error;
    setStatNum('stat-photos', data?.length ?? 0);
    if (!data || data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>Aucun souvenir.</p></div>';
      return;
    }
    grid.innerHTML = data.map(mem => adminMemCard(mem)).join('');
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><p>Erreur de chargement.</p></div>';
  }
}

function adminMemCard(mem) {
  const imgUrl   = getImageUrl(mem.image_path);
  const date     = mem.memory_date
    ? new Date(mem.memory_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const safeJson = encodeURIComponent(JSON.stringify(mem));
  return `<div class="admin-memory-card">
    <img src="${imgUrl}" alt="${esc(mem.title)}"
         onerror="this.src='https://via.placeholder.com/400x300?text=Photo'" />
    <div class="admin-card-body">
      <div class="admin-card-title">${esc(mem.title)}</div>
      <div class="admin-card-date">${date}</div>
      <div class="admin-card-actions">
        <button class="btn-ghost" onclick="openEditModal('${safeJson}')">Modifier</button>
        <button class="btn-danger" onclick="deleteMemory('${mem.id}','${mem.image_path || ''}')">Supprimer</button>
      </div>
    </div>
  </div>`;
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeOnOverlay(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

function previewFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('preview-img').style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function uploadMemory() {
  const file        = document.getElementById('file-input').files[0];
  const title       = document.getElementById('mem-title').value.trim();
  const description = document.getElementById('mem-text').value.trim();
  const memory_date = document.getElementById('mem-date').value;
  const btn         = document.getElementById('upload-btn');
  const errEl       = document.getElementById('upload-error');

  if (!file)  { showErr(errEl, 'Choisissez une image.'); return; }
  if (!title) { showErr(errEl, 'Titre requis.'); return; }

  btn.textContent = 'Envoi...'; btn.disabled = true; errEl.style.display = 'none';
  try {
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: sErr } = await supabaseClient.storage
      .from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600' });
    if (sErr) throw sErr;
    const { error: dErr } = await supabaseClient.from('memories')
      .insert([{ title, description, image_path: fileName, memory_date: memory_date || null }]);
    if (dErr) throw dErr;
    closeModal('upload-modal');
    ['file-input', 'mem-title', 'mem-text', 'mem-date'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('preview-img').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'block';
    await loadAdminMemories();
    await loadAdminStats();
  } catch (e) { showErr(errEl, e.message || 'Erreur.'); }
  finally { btn.textContent = 'Publier'; btn.disabled = false; }
}

function openEditModal(enc) {
  const mem = JSON.parse(decodeURIComponent(enc));
  document.getElementById('edit-id').value    = mem.id;
  document.getElementById('edit-title').value = mem.title || '';
  document.getElementById('edit-text').value  = mem.description || '';
  document.getElementById('edit-date').value  = mem.memory_date || '';
  openModal('edit-modal');
}

async function saveEdit() {
  const id          = document.getElementById('edit-id').value;
  const title       = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-text').value.trim();
  const memory_date = document.getElementById('edit-date').value;
  if (!title) { alert('Titre requis.'); return; }
  const { error } = await supabaseClient.from('memories')
    .update({ title, description, memory_date: memory_date || null }).eq('id', id);
  if (error) { alert('Erreur: ' + error.message); return; }
  closeModal('edit-modal');
  await loadAdminMemories();
}

async function deleteMemory(id, imagePath) {
  if (!confirm('Supprimer définitivement ?')) return;
  await supabaseClient.from('memories').delete().eq('id', id);
  if (imagePath) await supabaseClient.storage.from(STORAGE_BUCKET).remove([imagePath]);
  await loadAdminMemories();
  await loadAdminStats();
}

// ====================================
// VISITOR POSTS
// ====================================
async function loadVisitorPosts() {
  const container = document.getElementById('visitor-posts-list');
  if (!container) return;
  try {
    const { data } = await supabaseClient
      .from('visitor_posts').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Aucune publication.</p></div>';
      setStatNum('stat-pending', 0);
      return;
    }
    setStatNum('stat-pending', data.filter(d => d.status === 'pending').length);
    container.innerHTML = data.map(p => {
      const imgUrl = p.image_path ? getImageUrl(p.image_path) : null;
      const statusBadge = {
        pending:  '<span class="status-badge pending">En attente</span>',
        approved: '<span class="status-badge approved">Approuvé</span>',
        rejected: '<span class="status-badge rejected">Refusé</span>'
      }[p.status] || '';
      return `<div class="vpost-card">
        ${imgUrl
          ? `<img src="${imgUrl}" class="vpost-img" alt="" />`
          : '<div class="vpost-no-img">Pas de photo</div>'}
        <div class="vpost-body">
          <div class="vpost-header">
            <div><span class="vpost-pseudo">${esc(p.pseudo)}</span>${statusBadge}</div>
            <span class="vpost-date">${timeAgo(p.created_at)}</span>
          </div>
          <div class="vpost-title">${esc(p.title)}</div>
          <p class="vpost-desc">${esc(p.description || '')}</p>
          <div class="vpost-email">✉ ${esc(p.email || '—')}</div>
          ${p.status === 'pending' ? `
          <div class="vpost-actions">
            <button class="btn-approve" onclick="approvePost('${p.id}')">✓ Approuver</button>
            <button class="btn-reject"  onclick="rejectPost('${p.id}')">✕ Refuser</button>
          </div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Erreur de chargement.</p></div>';
  }
}

async function approvePost(id) {
  await supabaseClient.from('visitor_posts').update({ status: 'approved' }).eq('id', id);
  await loadVisitorPosts(); await loadAdminStats();
}
async function rejectPost(id) {
  await supabaseClient.from('visitor_posts').update({ status: 'rejected' }).eq('id', id);
  await loadVisitorPosts(); await loadAdminStats();
}

// ====================================
// COMMENTS
// ====================================
async function loadAdminComments() {
  const list = document.getElementById('admin-comments-list');
  if (!list) return;
  try {
    const { data } = await supabaseClient
      .from('comments').select('*, memories(title)')
      .order('created_at', { ascending: false }).limit(200);
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Aucun commentaire.</p></div>';
      return;
    }
    setStatNum('stat-comments', data.length);
    list.innerHTML = data.map(c => `
      <div class="comment-admin-item">
        <div class="comment-admin-header">
          <span class="comment-pseudo">${esc(c.pseudo)}</span>
          <span style="font-size:0.72rem;color:var(--warm-muted);">
            ${c.memories?.title ? 'sur "' + esc(c.memories.title) + '"' : ''} — ${timeAgo(c.created_at)}
          </span>
          <button class="btn-danger" style="margin-left:auto" onclick="deleteComment('${c.id}')">Supprimer</button>
        </div>
        <p style="font-size:0.88rem;color:var(--warm-mid);margin-top:4px;">${esc(c.content)}</p>
      </div>`).join('');
  } catch (e) {}
}

async function deleteComment(id) {
  if (!confirm('Supprimer ce commentaire ?')) return;
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
    setStatNum('stat-quotes', data?.length ?? 0);
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Aucune citation.</p></div>';
      return;
    }
    list.innerHTML = data.map(q => `
      <div class="quote-item">
        <div>
          <div class="quote-item-text">"${esc(q.text)}"</div>
          ${q.author ? `<div class="quote-item-author">— ${esc(q.author)}</div>` : ''}
        </div>
        <div class="quote-item-actions">
          <button class="btn-danger" onclick="deleteQuote('${q.id}')">Supprimer</button>
        </div>
      </div>`).join('');
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>';
  }
}

async function saveQuote() {
  const text   = document.getElementById('quote-text').value.trim();
  const author = document.getElementById('quote-author').value.trim();
  if (!text) { alert('Citation requise.'); return; }
  const { error } = await supabaseClient.from('quotes').insert([{ text, author: author || null }]);
  if (error) { alert('Erreur: ' + error.message); return; }
  closeModal('quote-modal');
  document.getElementById('quote-text').value   = '';
  document.getElementById('quote-author').value = '';
  await loadAdminQuotes(); await loadAdminStats();
}

async function deleteQuote(id) {
  if (!confirm('Supprimer ?')) return;
  await supabaseClient.from('quotes').delete().eq('id', id);
  await loadAdminQuotes(); await loadAdminStats();
}

// ====================================
// SETTINGS
// ====================================
async function loadSettings() {
  try {
    const { data } = await supabaseClient.from('settings').select('*').eq('id', 1).single();
    if (!data) return;
    setVal('s-nav-brand',   data.nav_brand);
    setVal('s-page-title',  data.page_title);
    setVal('s-subtitle',    data.site_subtitle);
    setVal('s-title',       data.site_title);
    setVal('s-desc',        data.site_desc);
    setVal('s-hero-quote',  data.hero_quote);
    setVal('s-hero-image',  data.hero_image_url);
    setVal('s-footer',      data.footer_msg);
  } catch (e) {}
}

async function saveSettings() {
  const btn    = document.getElementById('save-settings-btn');
  const status = document.getElementById('settings-status');
  btn.textContent = 'Enregistrement...'; btn.disabled = true; status.style.display = 'none';

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
    updated_at:     new Date().toISOString()
  };
  Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

  try {
    const { error } = await supabaseClient.from('settings').upsert(payload);
    if (error) throw error;
    status.textContent   = '✓ Réglages enregistrés !';
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  } catch (e) { alert('Erreur: ' + e.message); }
  finally { btn.textContent = 'Enregistrer'; btn.disabled = false; }
}

// ====================================
// UTILS
// ====================================
function getImageUrl(path) {
  if (!path) return 'https://via.placeholder.com/400x300?text=Photo';
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || path;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function setVal(id, val) { const el = document.getElementById(id); if (el && val != null) el.value = val; }
function getVal(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
