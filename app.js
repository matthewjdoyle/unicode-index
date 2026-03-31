/* ═══════════════════════════════════════════════════════
   Unicode Index — app.js
   ═══════════════════════════════════════════════════════ */

/* ── Block color palette ─────────────────────────────── */
const BLOCK_COLORS = {
  'C0 Controls':                         '#ef4444',
  'Basic Latin':                          '#06b6d4',
  'Delete':                               '#ef4444',
  'C1 Controls':                          '#f87171',
  'Latin-1 Supplement':                   '#3b82f6',
  'Latin Extended-A':                     '#6366f1',
  'Latin Extended-B':                     '#8b5cf6',
  'IPA Extensions':                       '#a855f7',
  'Spacing Modifier Letters':             '#ec4899',
  'Combining Diacritical Marks':          '#f97316',
  'Greek and Coptic':                     '#84cc16',
  'Cyrillic':                             '#22c55e',
  'Cyrillic Supplement':                  '#10b981',
  'Armenian':                             '#14b8a6',
  'Hebrew':                               '#f97316',
  'Arabic':                               '#eab308',
  'Syriac':                               '#f59e0b',
  'Thaana':                               '#fb923c',
  'Latin Extended Additional':            '#818cf8',
  'Greek Extended':                       '#c084fc',
  'General Punctuation':                  '#22d3ee',
  'Superscripts and Subscripts':          '#0ea5e9',
  'Currency Symbols':                     '#f59e0b',
  'Combining Marks for Symbols':          '#fb923c',
  'Letterlike Symbols':                   '#a78bfa',
  'Number Forms':                         '#4ade80',
  'Arrows':                               '#22d3ee',
  'Mathematical Operators':               '#818cf8',
  'Miscellaneous Technical':              '#60a5fa',
  'Control Pictures':                     '#f472b6',
  'Optical Character Recognition':        '#fb923c',
  'Enclosed Alphanumerics':               '#86efac',
  'Box Drawing':                          '#2dd4bf',
  'Block Elements':                       '#34d399',
  'Geometric Shapes':                     '#22d3ee',
  'Miscellaneous Symbols':                '#facc15',
  'Dingbats':                             '#f472b6',
  'Miscellaneous Mathematical Symbols-A': '#a78bfa',
  'Supplemental Arrows-A':               '#38bdf8',
  'Braille Patterns':                     '#c084fc',
  'Supplemental Arrows-B':               '#22d3ee',
  'Miscellaneous Mathematical Symbols-B': '#818cf8',
  'Supplemental Mathematical Operators':  '#60a5fa',
  'Miscellaneous Symbols and Arrows':     '#2dd4bf',
};

/* ── Unicode category descriptions ──────────────────── */
const CAT_LABELS = {
  Lu: 'Uppercase Letter',   Ll: 'Lowercase Letter',   Lt: 'Titlecase Letter',
  Lm: 'Modifier Letter',   Lo: 'Other Letter',
  Mn: 'Non-Spacing Mark',  Mc: 'Spacing Mark',        Me: 'Enclosing Mark',
  Nd: 'Decimal Number',    Nl: 'Letter Number',       No: 'Other Number',
  Ps: 'Open Punctuation',  Pe: 'Close Punctuation',   Pi: 'Initial Punctuation',
  Pf: 'Final Punctuation', Pd: 'Dash Punctuation',    Pc: 'Connector Punctuation',
  Po: 'Other Punctuation',
  Sm: 'Math Symbol',       Sc: 'Currency Symbol',     Sk: 'Modifier Symbol',
  So: 'Other Symbol',
  Zs: 'Space Separator',   Zl: 'Line Separator',      Zp: 'Paragraph Separator',
  Cc: 'Control Char',      Cf: 'Format Char',         Cs: 'Surrogate',
  Co: 'Private Use',       Cn: 'Unassigned',
};

/* ── State ───────────────────────────────────────────── */
const state = {
  search:        '',
  activeBlock:   'all',
  filtered:      UNICODE_DATA,
  renderedCount: 0,
  PAGE_SIZE:     350,
  selectedIdx:   -1,
};

/* ── DOM refs ────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const searchInput   = $('search');
const searchClear   = $('searchClear');
const filterChips   = $('filterChips');
const resultCount   = $('resultCount');
const charGrid      = $('charGrid');
const loadSentinel  = $('loadSentinel');
const emptyState    = $('emptyState');
const detailPanel   = $('detailPanel');
const detailBackdrop= $('detailBackdrop');
const detailClose   = $('detailClose');
const detailInner   = $('detailInner');
const detailPrev    = $('detailPrev');
const detailNext    = $('detailNext');
const toast         = $('toast');

/* ── Helpers ─────────────────────────────────────────── */
function isControl(entry) {
  return entry.cat.startsWith('C') || (entry.cp <= 0x1F) || (entry.cp >= 0x7F && entry.cp <= 0x9F);
}

function isCombining(entry) {
  return entry.cat.startsWith('M');
}

function isSpace(entry) {
  return entry.cat.startsWith('Z');
}

function getGlyphDisplay(entry) {
  if (isControl(entry)) return entry.name.match(/^([A-Z]{2,5})/)?.[1] ?? '·';
  if (isCombining(entry)) return '\u25CC' + entry.char;
  if (isSpace(entry)) return '·';
  return entry.char;
}

function getGlyphClass(entry) {
  return isControl(entry) ? 'char-glyph is-control' : 'char-glyph';
}

function blockColor(block) {
  return BLOCK_COLORS[block] ?? '#6366f1';
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Filter logic ────────────────────────────────────── */
function computeFiltered() {
  const q = state.search.trim().toLowerCase();
  const block = state.activeBlock;

  return UNICODE_DATA.filter(entry => {
    if (block !== 'all' && entry.block !== block) return false;
    if (!q) return true;

    // Match code point formats: U+0041, 0041, 41 (hex), 65 (decimal)
    const hex = entry.hex.toLowerCase();
    if (hex === q) return true;
    if (`u+${hex}` === q) return true;
    if (entry.cp === parseInt(q, 10)) return true;
    if (entry.cp === parseInt(q, 16)) return true;
    if (entry.char === q) return true;
    if (entry.name.toLowerCase().includes(q)) return true;
    if (entry.block.toLowerCase().includes(q)) return true;
    if (entry.cat.toLowerCase() === q) return true;
    return false;
  });
}

/* ── Render ──────────────────────────────────────────── */
function renderAll() {
  state.filtered = computeFiltered();
  state.renderedCount = 0;
  charGrid.innerHTML = '';
  resultCount.textContent = state.filtered.length.toLocaleString();

  if (state.filtered.length === 0) {
    emptyState.hidden = false;
    loadSentinel.style.display = 'none';
    return;
  }

  emptyState.hidden = true;
  loadSentinel.style.display = '';

  const isSearching = state.search.trim() !== '' || state.activeBlock !== 'all';

  if (isSearching) {
    renderFlatBatch(0);
  } else {
    renderGrouped();
  }
}

function renderGrouped() {
  // Group by block
  const byBlock = new Map();
  for (const entry of UNICODE_DATA) {
    if (!byBlock.has(entry.block)) byBlock.set(entry.block, []);
    byBlock.get(entry.block).push(entry);
  }

  const frag = document.createDocumentFragment();

  for (const [block, entries] of byBlock) {
    const color = blockColor(block);

    // Section header
    const hdr = document.createElement('div');
    hdr.className = 'section-header';
    hdr.innerHTML = `
      <div class="section-title">
        <span class="section-title-dot" style="color:${color};background:${color}"></span>
        ${escHtml(block)}
      </div>
      <div class="section-line"></div>
      <div class="section-count">${entries.length}</div>
    `;
    frag.appendChild(hdr);

    // Character group
    const group = document.createElement('div');
    group.className = 'char-group';

    for (const entry of entries) {
      group.appendChild(createCard(entry));
    }

    frag.appendChild(group);
  }

  charGrid.appendChild(frag);
  state.renderedCount = UNICODE_DATA.length;
}

function renderFlatBatch(startIdx) {
  const slice = state.filtered.slice(startIdx, startIdx + state.PAGE_SIZE);
  if (slice.length === 0) return;

  // If first batch — create section header showing "Results"
  if (startIdx === 0 && state.search.trim()) {
    const hdr = document.createElement('div');
    hdr.className = 'section-header';
    hdr.innerHTML = `
      <div class="section-title" style="color:var(--cyan)">
        <span class="section-title-dot" style="color:var(--cyan);background:var(--cyan)"></span>
        Search Results
      </div>
      <div class="section-line"></div>
      <div class="section-count">${state.filtered.length.toLocaleString()} matches</div>
    `;
    charGrid.appendChild(hdr);
  }

  if (startIdx === 0 && state.activeBlock !== 'all' && !state.search.trim()) {
    const color = blockColor(state.activeBlock);
    const hdr = document.createElement('div');
    hdr.className = 'section-header';
    hdr.innerHTML = `
      <div class="section-title">
        <span class="section-title-dot" style="color:${color};background:${color}"></span>
        ${escHtml(state.activeBlock)}
      </div>
      <div class="section-line"></div>
      <div class="section-count">${state.filtered.length.toLocaleString()} characters</div>
    `;
    charGrid.appendChild(hdr);
  }

  const group = document.createElement('div');
  group.className = 'char-group';
  for (const entry of slice) {
    group.appendChild(createCard(entry));
  }
  charGrid.appendChild(group);

  state.renderedCount = startIdx + slice.length;
}

function createCard(entry) {
  const card = document.createElement('button');
  card.className = 'char-card';
  card.setAttribute('aria-label', `${entry.name} U+${entry.hex}`);
  card.style.setProperty('--block-color', blockColor(entry.block));
  card.dataset.idx = entry.cp; // use cp as unique key

  const glyphEl = document.createElement('div');
  glyphEl.className = getGlyphClass(entry);
  glyphEl.textContent = getGlyphDisplay(entry);

  const hexEl = document.createElement('div');
  hexEl.className = 'char-hex';
  hexEl.textContent = `U+${entry.hex}`;

  card.appendChild(glyphEl);
  card.appendChild(hexEl);

  card.addEventListener('click', () => {
    const idx = state.filtered.findIndex(e => e.cp === entry.cp);
    // If viewing flat (searching), use filtered index; else use global
    const globalIdx = UNICODE_DATA.findIndex(e => e.cp === entry.cp);
    openDetail(globalIdx, idx !== -1 ? idx : null);
  });

  return card;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Detail Panel ────────────────────────────────────── */
let detailContext = { globalIdx: -1, filteredIdx: -1 };

function openDetail(globalIdx, filteredIdx) {
  const entry = UNICODE_DATA[globalIdx];
  if (!entry) return;

  detailContext = {
    globalIdx,
    filteredIdx: filteredIdx ?? -1,
  };

  renderDetailContent(entry);

  detailPanel.setAttribute('aria-hidden', 'false');
  detailBackdrop.classList.add('visible');
  detailPanel.focus?.();

  // Update nav buttons
  updateDetailNav();
}

function closeDetail() {
  detailPanel.setAttribute('aria-hidden', 'true');
  detailBackdrop.classList.remove('visible');
}

function updateDetailNav() {
  const { filteredIdx } = detailContext;
  detailPrev.disabled = filteredIdx <= 0;
  detailNext.disabled = filteredIdx < 0 || filteredIdx >= state.filtered.length - 1;
}

function renderDetailContent(entry) {
  const color = blockColor(entry.block);
  const glyph = getGlyphDisplay(entry);
  const isCtrl = isControl(entry);

  const rows = [
    { label: 'Code Point', value: `U+${entry.hex}`, copy: `U+${entry.hex}` },
    { label: 'Decimal',    value: entry.cp.toString(), copy: entry.cp.toString() },
    { label: 'Octal',      value: entry.cp.toString(8), copy: entry.cp.toString(8) },
    { label: 'Binary',     value: entry.cp.toString(2), copy: entry.cp.toString(2) },
    { label: 'HTML Dec',   value: `&#${entry.cp};`, copy: `&#${entry.cp};` },
    { label: 'HTML Hex',   value: `&#x${entry.hex};`, copy: `&#x${entry.hex};` },
    { label: 'CSS',        value: `\\${entry.hex}`, copy: `\\${entry.hex}` },
    { label: 'Character',  value: isCtrl ? '(control)' : entry.char, copy: isCtrl ? '' : entry.char },
  ];

  const catCode = entry.cat;
  const catLabel = CAT_LABELS[catCode] ?? catCode;

  detailInner.innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-glyph-wrap" style="border-color:${color}33;box-shadow:0 0 40px ${color}15">
        <div class="detail-hero-glyph${isCtrl ? ' is-control' : ''}" style="color:${isCtrl ? '' : color}">${escHtml(isCtrl ? (entry.name.match(/^([A-Z]{2,5})/)?.[1] ?? '·') : (isCombining(entry) ? '\u25CC' + entry.char : entry.char))}</div>
      </div>
      <div class="detail-hero-name">${escHtml(entry.name)}</div>
      <div class="detail-hero-block" style="border-color:${color}44;color:${color}">${escHtml(entry.block)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-label">References</div>
      ${rows.map(r => `
        <div class="detail-row">
          <span class="detail-row-label">${r.label}</span>
          <span class="detail-row-value">${escHtml(r.value)}</span>
          ${r.copy ? `<button class="detail-copy-btn" data-copy="${escHtml(r.copy)}" title="Copy ${r.label}" aria-label="Copy ${r.label}">⎘</button>` : ''}
        </div>
      `).join('')}
    </div>

    <div class="detail-section">
      <div class="detail-section-label">Classification</div>
      <div class="detail-row">
        <span class="detail-row-label">Category</span>
        <span class="detail-row-value">
          <span class="cat-badge cat-${catCode}">${catCode} — ${catLabel}</span>
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Block</span>
        <span class="detail-row-value">${escHtml(entry.block)}</span>
      </div>
    </div>
  `;

  // Bind copy buttons inside detail
  detailInner.querySelectorAll('.detail-copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      copyToClipboard(btn.dataset.copy, btn.closest('.detail-row').querySelector('.detail-row-label').textContent);
    });
  });
}

/* ── Clipboard ───────────────────────────────────────── */
let toastTimer;

function copyToClipboard(text, label) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✓ Copied ${label}: ${text.length > 30 ? text.slice(0, 30) + '…' : text}`);
  }).catch(() => {
    // fallback
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(`✓ Copied ${label}`);
  });
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ── Filter chips ────────────────────────────────────── */
function buildFilterChips() {
  const blocks = ['all', ...Object.keys(BLOCK_COLORS)];
  const frag = document.createDocumentFragment();

  for (const block of blocks) {
    const chip = document.createElement('button');
    chip.className = `filter-chip${block === state.activeBlock ? ' active' : ''}`;
    chip.dataset.block = block;
    chip.setAttribute('role', 'listitem');

    if (block === 'all') {
      chip.innerHTML = `<span class="filter-chip-dot" style="background:linear-gradient(135deg,#00d4ff,#bf5cf6)"></span> All Blocks`;
    } else {
      const color = blockColor(block);
      chip.innerHTML = `<span class="filter-chip-dot" style="background:${color}"></span> ${escHtml(block)}`;
    }

    chip.addEventListener('click', () => {
      state.activeBlock = block;
      filterChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      // Scroll chip into view
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      renderAll();
    });

    frag.appendChild(chip);
  }

  filterChips.appendChild(frag);
}

/* ── Infinite scroll ─────────────────────────────────── */
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && state.renderedCount < state.filtered.length) {
    const isSearching = state.search.trim() !== '' || state.activeBlock !== 'all';
    if (isSearching) {
      renderFlatBatch(state.renderedCount);
    }
  }
}, { rootMargin: '200px' });

observer.observe(loadSentinel);

/* ── Search ──────────────────────────────────────────── */
const doSearch = debounce(q => {
  state.search = q;
  searchClear.hidden = !q;
  renderAll();
}, 160);

searchInput.addEventListener('input', e => doSearch(e.target.value));

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  state.search = '';
  searchClear.hidden = true;
  searchInput.focus();
  renderAll();
});

/* ── Detail panel events ─────────────────────────────── */
detailClose.addEventListener('click', closeDetail);
detailBackdrop.addEventListener('click', closeDetail);

detailPrev.addEventListener('click', () => {
  if (detailContext.filteredIdx > 0) {
    const newFIdx = detailContext.filteredIdx - 1;
    const entry = state.filtered[newFIdx];
    const gIdx = UNICODE_DATA.findIndex(e => e.cp === entry.cp);
    openDetail(gIdx, newFIdx);
  }
});

detailNext.addEventListener('click', () => {
  if (detailContext.filteredIdx >= 0 && detailContext.filteredIdx < state.filtered.length - 1) {
    const newFIdx = detailContext.filteredIdx + 1;
    const entry = state.filtered[newFIdx];
    const gIdx = UNICODE_DATA.findIndex(e => e.cp === entry.cp);
    openDetail(gIdx, newFIdx);
  }
});

/* ── Keyboard ────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  // Esc closes panel
  if (e.key === 'Escape') {
    if (detailPanel.getAttribute('aria-hidden') === 'false') {
      closeDetail();
    }
    return;
  }

  // Arrow left/right to browse when panel open
  if (detailPanel.getAttribute('aria-hidden') === 'false') {
    if (e.key === 'ArrowLeft' && !detailPrev.disabled) detailPrev.click();
    if (e.key === 'ArrowRight' && !detailNext.disabled) detailNext.click();
  }

  // Slash to focus search
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

/* ── Starfield ───────────────────────────────────────── */
function initStarfield() {
  const canvas = $('starfield');
  const ctx = canvas.getContext('2d');
  let W, H, stars;

  const NUM_STARS = 220;
  const COLORS = ['#00d4ff', '#bf5cf6', '#ffffff', '#ffffff', '#ffffff'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: NUM_STARS }, () => ({
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    Math.random() * 1.4 + 0.2,
      a:    Math.random() * Math.PI * 2,
      speed: (Math.random() * 0.15 + 0.02),
      drift: (Math.random() - 0.5) * 0.12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.6 + 0.2,
      alphaDir: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.003 + 0.001),
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const s of stars) {
      // Twinkle
      s.alpha += s.alphaDir;
      if (s.alpha > 0.85 || s.alpha < 0.1) s.alphaDir *= -1;

      // Slow drift
      s.x += s.drift;
      s.y -= s.speed;
      if (s.y < -2)   { s.y = H + 2; s.x = Math.random() * W; }
      if (s.x < -2)   s.x = W + 2;
      if (s.x > W + 2) s.x = -2;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

/* ── Boot ────────────────────────────────────────────── */
(function init() {
  buildFilterChips();
  renderAll();
  initStarfield();

  // Keyboard shortcut hint
  const hint = document.createElement('div');
  hint.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:50;
    font-size:11px; color:rgba(255,255,255,0.2);
    font-family:'JetBrains Mono',monospace;
    pointer-events:none;
  `;
  hint.textContent = '/ to search';
  document.body.appendChild(hint);
})();
