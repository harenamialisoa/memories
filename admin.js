// ============================================
// ADMIN.JS
// ============================================

// Auth check
supabaseClient.auth.getSession().then(({ data }) => {
  if (!data.session) {
    window.location.href = 'login.html';
  } else {
    initAdmin();
  }
});

async function initAdmin() {
  await Promise.all([loadAdminMemories(), loadAdminQuotes(), loadSettings()]);
}

// ====================================
// TABS
// ====================================
function showTab(name) {
  const names = ['photos', 'quotes', 'settings'];
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
  const statEl = document.getElementById('stat-photos');
  try {
    const { data, error } = await supabaseClient
      .from('memories').select('*').order('memory_date', { ascending: false });
    if (error) throw error;

    statEl.textContent = data ? data.length : 0;

    if (!data || data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>Aucun souvenir. Ajoutez-en un !</p></div>';
      return;
    }

    grid.innerHTML = data.map(mem => {
      const imgUrl = getImageUrl(mem.image_path);
      const date = mem.memory_date
        ? new Date(mem.memory_date).toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric' })
        : '—';
      const safeJson = encodeURIComponent(JSON.stringify(mem));
      return `
        <div class="admin-memory-card">
          <img src="${imgUrl}" alt="${esc(mem.title)}"
               onerror="this.src='https://via.placeholder.com/400x300?text=Image'" />
          <div class="admin-card-body">
            <div class="admin-card-title">${esc(mem.title)}</div>
            <div class="admin-card-date">${date}</div>
            <div class="admin-card-actions">
              <button class="btn-ghost" onclick="openEditModal('${safeJson}')">Modifier</button>
              <button class="btn-danger" onclick="deleteMemory('${mem.id}','${mem.image_path || ''}')">Supprimer</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty-state"><p>Erreur de chargement.</p></div>';
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeOnOverlay(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

function openUploadModal() { openModal('upload-modal'); }

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
  const file = document.getElementById('file-input').files[0];
  const title = document.getElementById('mem-title').value.trim();
  const description = document.getElementById('mem-text').value.trim();
  const memory_date = document.getElementById('mem-date').value;
  const btn = document.getElementById('upload-btn');
  const errEl = document.getElementById('upload-error');

  if (!file) { showErr(errEl, 'Veuillez choisir une image.'); return; }
  if (!title) { showErr(errEl, 'Veuillez saisir un titre.'); return; }

  btn.textContent = 'Envoi en cours...';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: storageError } = await supabaseClient.storage
      .from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (storageError) throw storageError;

    const { error: dbError } = await supabaseClient.from('memories')
      .insert([{ title, description, image_path: fileName, memory_date: memory_date || null }]);
    if (dbError) throw dbError;

    closeModal('upload-modal');
    // Reset form
    document.getElementById('file-input').value = '';
    document.getElementById('mem-title').value = '';
    document.getElementById('mem-text').value = '';
    document.getElementById('mem-date').value = '';
    document.getElementById('preview-img').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'block';
    await loadAdminMemories();

  } catch (e) {
    console.error(e);
    showErr(errEl, e.message || 'Erreur lors de l\'envoi.');
  } finally {
    btn.textContent = 'Publier';
    btn.disabled = false;
  }
}

function openEditModal(encodedData) {
  const mem = JSON.parse(decodeURIComponent(encodedData));
  document.getElementById('edit-id').value = mem.id;
  document.getElementById('edit-title').value = mem.title || '';
  document.getElementById('edit-text').value = mem.description || '';
  document.getElementById('edit-date').value = mem.memory_date || '';
  openModal('edit-modal');
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-text').value.trim();
  const memory_date = document.getElementById('edit-date').value;

  if (!title) { alert('Titre requis.'); return; }

  const { error } = await supabaseClient.from('memories')
    .update({ title, description, memory_date: memory_date || null }).eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }

  closeModal('edit-modal');
  await loadAdminMemories();
}

async function deleteMemory(id, imagePath) {
  if (!confirm('Supprimer ce souvenir définitivement ?')) return;
  const { error } = await supabaseClient.from('memories').delete().eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  if (imagePath) await supabaseClient.storage.from(STORAGE_BUCKET).remove([imagePath]);
  await loadAdminMemories();
}

// ====================================
// QUOTES
// ====================================
async function loadAdminQuotes() {
  const list = document.getElementById('quotes-list');
  const statEl = document.getElementById('stat-quotes');
  try {
    const { data, error } = await supabaseClient.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    statEl.textContent = data ? data.length : 0;

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
    list.innerHTML = '<div class="empty-state"><p>Erreur de chargement.</p></div>';
  }
}

async function saveQuote() {
  const text = document.getElementById('quote-text').value.trim();
  const author = document.getElementById('quote-author').value.trim();
  if (!text) { alert('Veuillez saisir une citation.'); return; }
  const { error } = await supabaseClient.from('quotes').insert([{ text, author: author || null }]);
  if (error) { alert('Erreur : ' + error.message); return; }
  closeModal('quote-modal');
  document.getElementById('quote-text').value = '';
  document.getElementById('quote-author').value = '';
  await loadAdminQuotes();
}

async function deleteQuote(id) {
  if (!confirm('Supprimer cette citation ?')) return;
  const { error } = await supabaseClient.from('quotes').delete().eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  await loadAdminQuotes();
}

// ====================================
// SETTINGS — lecture + sauvegarde
// ====================================
async function loadSettings() {
  try {
    const { data, error } = await supabaseClient
      .from('settings').select('*').eq('id', 1).single();
    if (error || !data) return;

    setVal('s-nav-brand',    data.nav_brand);
    setVal('s-page-title',   data.page_title);
    setVal('s-subtitle',     data.site_subtitle);
    setVal('s-title',        data.site_title);
    setVal('s-desc',         data.site_desc);
    setVal('s-hero-quote',   data.hero_quote);
    setVal('s-hero-image',   data.hero_image_url);
    setVal('s-footer',       data.footer_msg);
  } catch (e) {
    // table vide ou inexistante, pas grave
  }
}

async function saveSettings() {
  const btn = document.getElementById('save-settings-btn');
  const status = document.getElementById('settings-status');

  btn.textContent = 'Enregistrement...';
  btn.disabled = true;
  status.style.display = 'none';

  const payload = {
    id: 1,
    nav_brand:      getVal('s-nav-brand'),
    page_title:     getVal('s-page-title'),
    site_subtitle:  getVal('s-subtitle'),
    site_title:     getVal('s-title'),
    site_desc:      getVal('s-desc'),
    hero_quote:     getVal('s-hero-quote'),
    hero_image_url: getVal('s-hero-image'),
    footer_msg:     getVal('s-footer'),
    updated_at:     new Date().toISOString(),
  };

  // Nettoyer les champs vides
  Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

  try {
    const { error } = await supabaseClient.from('settings').upsert(payload);
    if (error) throw error;

    status.textContent = '✓ Réglages enregistrés avec succès !';
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  } catch (e) {
    alert('Erreur : ' + e.message);
  } finally {
    btn.textContent = 'Enregistrer les réglages';
    btn.disabled = false;
  }
}

// ====================================
// UTILS
// ====================================
function getImageUrl(path) {
  if (!path) return 'https://via.placeholder.com/400x300?text=Photo';
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || path;
}

function showErr(el, msg) { el.textContent = msg; el.style.display = 'block'; }
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setVal(id, val) { const el = document.getElementById(id); if (el && val != null) el.value = val; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
