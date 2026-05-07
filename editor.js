// ============================================
// RICH TEXT EDITOR — Find me in the river
// Vanilla JS, no dependencies
// ============================================

class RichEditor {
  constructor(targetId, options = {}) {
    this.targetId   = targetId;
    this.options    = options;
    this.placeholder = options.placeholder || 'Écrivez votre dédicace...';
    this.container  = null;
    this.editor     = null;
    this.toolbar    = null;
    this._build();
  }

  _build() {
    const target = document.getElementById(this.targetId);
    if (!target) return;

    // Wrap
    this.container = document.createElement('div');
    this.container.className = 'rte-wrap';

    // Toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'rte-toolbar';
    this.toolbar.innerHTML = this._toolbarHTML();

    // Editor area
    this.editor = document.createElement('div');
    this.editor.className  = 'rte-editor';
    this.editor.contentEditable = 'true';
    this.editor.dataset.placeholder = this.placeholder;
    this.editor.spellcheck = true;

    this.container.appendChild(this.toolbar);
    this.container.appendChild(this.editor);
    target.parentNode.replaceChild(this.container, target);
    // Keep hidden textarea for value
    this.container.appendChild(target);
    target.style.display = 'none';

    this._bindToolbar();
    this._bindEditor();
    this._updateToolbar();
  }

  _toolbarHTML() {
    const fonts = ['Cormorant Garamond','Jost','Georgia','Arial','Times New Roman','Courier New','Trebuchet MS'];
    const sizes = [10,12,14,16,18,20,24,28,32,36];
    return `
    <div class="rte-group">
      <select class="rte-select rte-font" onchange="RTE.execCmd('fontName',this.value,this)" title="Police">
        ${fonts.map(f=>`<option value="${f}" style="font-family:${f}">${f}</option>`).join('')}
      </select>
      <select class="rte-select rte-size" onchange="RTE.execSize(this.value,this)" title="Taille">
        ${sizes.map(s=>`<option value="${s}"${s===14?' selected':''}>${s}px</option>`).join('')}
      </select>
    </div>
    <div class="rte-sep"></div>
    <div class="rte-group">
      <button class="rte-btn" data-cmd="bold"        title="Gras (Ctrl+B)"><b>B</b></button>
      <button class="rte-btn" data-cmd="italic"      title="Italique (Ctrl+I)"><i>I</i></button>
      <button class="rte-btn" data-cmd="underline"   title="Souligné (Ctrl+U)"><u>U</u></button>
      <button class="rte-btn" data-cmd="strikeThrough" title="Barré"><s>S</s></button>
    </div>
    <div class="rte-sep"></div>
    <div class="rte-group">
      <button class="rte-btn rte-color-btn" title="Couleur du texte" onclick="RTE.openColor('fore',this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 21h22L12 3zm0 4l7.5 13h-15L12 7z"/></svg>
        <span class="rte-color-indicator" id="rte-fore-ind" style="background:#2a1f1d"></span>
      </button>
      <button class="rte-btn rte-color-btn" title="Surligner" onclick="RTE.openColor('back',this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l-6 6v3h3l6-6"/><path d="m22 5-3-3-9.5 9.5 3 3L22 5z"/></svg>
        <span class="rte-color-indicator" id="rte-back-ind" style="background:transparent;border:1px solid #ccc"></span>
      </button>
      <!-- Color picker popup -->
      <div class="rte-color-popup" id="rte-color-popup">
        <div class="rte-colors" id="rte-colors-grid"></div>
        <input type="color" class="rte-color-input" id="rte-color-custom" />
        <button class="rte-color-clear" id="rte-color-clear">Aucune</button>
      </div>
    </div>
    <div class="rte-sep"></div>
    <div class="rte-group">
      <button class="rte-btn" data-cmd="justifyLeft"   title="Aligner à gauche">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <button class="rte-btn" data-cmd="justifyCenter" title="Centrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button class="rte-btn" data-cmd="justifyRight"  title="Aligner à droite">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </button>
      <button class="rte-btn" data-cmd="justifyFull"   title="Justifier">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div class="rte-sep"></div>
    <div class="rte-group">
      <button class="rte-btn" data-cmd="insertUnorderedList" title="Liste à puces">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
      </button>
      <button class="rte-btn" data-cmd="insertOrderedList" title="Liste numérotée">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" font-size="6" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="6" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="6" fill="currentColor" stroke="none">3</text></svg>
      </button>
      <button class="rte-btn" data-cmd="indent"  title="Augmenter le retrait">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><polyline points="3,12 7,16 3,20"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="11" y1="18" x2="21" y2="18"/></svg>
      </button>
      <button class="rte-btn" data-cmd="outdent" title="Diminuer le retrait">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><polyline points="7,12 3,16 7,20"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="11" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div class="rte-sep"></div>
    <div class="rte-group">
      <button class="rte-btn" onclick="RTE.insertLink(this)" title="Insérer un lien">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button class="rte-btn" data-cmd="removeFormat" title="Effacer la mise en forme">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.3 20.3a1 1 0 0 0 1.4 0L12 16l4.3 4.3a1 1 0 1 0 1.4-1.4l-11-11a1 1 0 0 0-1.4 1.4l4.3 4.3-4.3 4.3a1 1 0 0 0 0 1.4z"/><line x1="9" y1="3" x2="18" y2="3"/><line x1="13" y1="3" x2="13" y2="13"/></svg>
      </button>
      <button class="rte-btn" onclick="RTE.execCmd('undo')" title="Annuler (Ctrl+Z)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
      </button>
      <button class="rte-btn" onclick="RTE.execCmd('redo')" title="Rétablir (Ctrl+Y)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
      </button>
    </div>`;
  }

  _bindToolbar() {
    // Command buttons
    this.toolbar.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        this.editor.focus();
        this._updateToolbar();
        this._syncValue();
      });
    });

    // Close color popup on outside click
    document.addEventListener('mousedown', e => {
      const popup = document.getElementById('rte-color-popup');
      if (popup && !popup.contains(e.target) && !e.target.classList.contains('rte-color-btn')) {
        popup.classList.remove('open');
      }
    });
  }

  _bindEditor() {
    this.editor.addEventListener('input',   () => { this._syncValue(); this._updateToolbar(); });
    this.editor.addEventListener('keyup',   () => this._updateToolbar());
    this.editor.addEventListener('mouseup', () => this._updateToolbar());
    this.editor.addEventListener('keydown', e => {
      // Tab = indent
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }
    });
    // Placeholder
    this.editor.addEventListener('focus', () => this.container.classList.add('focused'));
    this.editor.addEventListener('blur',  () => this.container.classList.remove('focused'));
  }

  _updateToolbar() {
    // Toggle active state for format buttons
    ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','justifyFull',
     'insertUnorderedList','insertOrderedList'].forEach(cmd => {
      const btn = this.toolbar.querySelector(`[data-cmd="${cmd}"]`);
      if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
    // Font selector
    try {
      const font = document.queryCommandValue('fontName').replace(/['"]/g,'');
      const sel  = this.toolbar.querySelector('.rte-font');
      if (sel && font) {
        const opt = Array.from(sel.options).find(o => o.value.toLowerCase() === font.toLowerCase());
        if (opt) sel.value = opt.value;
      }
    } catch(e) {}
  }

  _syncValue() {
    const ta = document.getElementById(this.targetId);
    if (ta) ta.value = this.editor.innerHTML;
  }

  getValue() { return this.editor.innerHTML; }

  setValue(html) {
    if (this.editor) {
      this.editor.innerHTML = html || '';
      this._syncValue();
    }
  }

  clear() { if (this.editor) { this.editor.innerHTML = ''; this._syncValue(); } }
}

// ====================================
// GLOBAL RTE MANAGER
// ====================================
const RTE = {
  instances: {},

  create(id, options = {}) {
    const inst = new RichEditor(id, options);
    this.instances[id] = inst;
    return inst;
  },

  get(id) { return this.instances[id]; },

  execCmd(cmd, value, ctx) {
    document.execCommand(cmd, false, value || null);
    // find focused editor and sync
    document.querySelectorAll('.rte-editor').forEach(ed => {
      if (ed === document.activeElement || ed.contains(document.getSelection()?.anchorNode)) {
        const wrap = ed.closest('.rte-wrap');
        if (wrap) {
          const ta = wrap.querySelector('textarea');
          if (ta) ta.value = ed.innerHTML;
        }
      }
    });
  },

  execSize(size, selectEl) {
    const editor = selectEl.closest('.rte-wrap')?.querySelector('.rte-editor');
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const span = document.createElement('span');
    span.style.fontSize = size + 'px';
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      range.surroundContents(span);
    } else {
      span.innerHTML = '&#8203;';
      range.insertNode(span);
      range.setStartAfter(span);
      sel.removeAllRanges(); sel.addRange(range);
    }
    const wrap = editor.closest('.rte-wrap');
    if (wrap) {
      const ta = wrap.querySelector('textarea');
      if (ta) ta.value = editor.innerHTML;
    }
  },

  _activeColorType: 'fore',

  openColor(type, btn) {
    this._activeColorType = type;
    const popup = document.getElementById('rte-color-popup');
    if (!popup) return;

    // Position near button
    const rect = btn.getBoundingClientRect();
    popup.style.top  = (rect.bottom + 6) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    popup.classList.toggle('open');

    const colors = [
      '#000000','#1a1a1a','#333333','#555555','#777777','#999999','#bbbbbb','#dddddd','#ffffff',
      '#c9847a','#9e5f57','#f5ebe8','#c9a96e','#f0e4cc','#2a1f1d','#4a3532','#8a7370',
      '#e03131','#f08c00','#2f9e44','#1971c2','#7048e8','#c2255c','#0c8599','#5c7cfa',
      '#ffa8a8','#ffd43b','#8ce99a','#74c0fc','#d0bfff','#f783ac','#66d9e8','#748ffc'
    ];
    const grid = document.getElementById('rte-colors-grid');
    if (grid) {
      grid.innerHTML = colors.map(c =>
        `<button class="rte-swatch" style="background:${c}" onclick="RTE.applyColor('${c}')" title="${c}"></button>`
      ).join('');
    }

    const custom = document.getElementById('rte-color-custom');
    if (custom) {
      custom.onchange = () => this.applyColor(custom.value);
    }

    const clear = document.getElementById('rte-color-clear');
    if (clear) {
      clear.onclick = () => {
        if (this._activeColorType === 'fore') {
          document.execCommand('foreColor', false, 'inherit');
        } else {
          document.execCommand('hiliteColor', false, 'transparent');
          document.execCommand('backColor',   false, 'transparent');
        }
        popup.classList.remove('open');
        this._syncAllEditors();
      };
    }
  },

  applyColor(color) {
    if (this._activeColorType === 'fore') {
      document.execCommand('foreColor', false, color);
      const ind = document.getElementById('rte-fore-ind');
      if (ind) ind.style.background = color;
    } else {
      document.execCommand('hiliteColor', false, color);
      const ind = document.getElementById('rte-back-ind');
      if (ind) { ind.style.background = color; ind.style.border = 'none'; }
    }
    document.getElementById('rte-color-popup')?.classList.remove('open');
    this._syncAllEditors();
  },

  insertLink(btn) {
    const url = prompt('URL du lien :');
    if (!url) return;
    document.execCommand('createLink', false, url);
    // Make links open in new tab
    document.querySelectorAll('.rte-editor a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    this._syncAllEditors();
  },

  _syncAllEditors() {
    document.querySelectorAll('.rte-wrap').forEach(wrap => {
      const ed = wrap.querySelector('.rte-editor');
      const ta = wrap.querySelector('textarea');
      if (ed && ta) ta.value = ed.innerHTML;
    });
  }
};

// Init color palette on page load (pour les couleurs qui apparaissent avant ouverture)
document.addEventListener('DOMContentLoaded', () => {
  // Créer les éditeurs automatiquement
  ['mem-text','edit-text','une-new-desc'].forEach(id => {
    if (document.getElementById(id)) {
      RTE.create(id, { placeholder: id === 'une-new-desc' ? 'Ce jour-là...' : 'Écrivez votre dédicace...' });
    }
  });

  // Déplacer le popup color dans le body pour éviter overflow
  const popup = document.getElementById('rte-color-popup');
  if (popup) document.body.appendChild(popup);
});
