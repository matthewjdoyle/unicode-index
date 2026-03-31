/* ═══════════════════════════════════════════════════════
   Unicode Index — app.js
   ═══════════════════════════════════════════════════════ */

/* ── Block color palette (6 semantic tones) ──────────── */
// Colors are drawn from the emerald & violet palette.
// Blocks are grouped by their primary content type.

const BLOCK_COLOR_LETTERS = "#2dd4a8"; // letters (emerald)
const BLOCK_COLOR_MARKS = "#6e7681"; // diacritical marks (gray)
const BLOCK_COLOR_NUMBERS = "#34d399"; // numbers (mint green)
const BLOCK_COLOR_SYMBOLS = "#8b5cf6"; // symbols / misc (violet)
const BLOCK_COLOR_CONTROL = "#f85149"; // controls (red)
const BLOCK_COLOR_PUNCT = "#8b949e"; // punctuation / arrows (mid gray)
const BLOCK_COLOR_MATH = "#a78bfa"; // math operators (light violet)
const BLOCK_COLOR_SCRIPT = "#d29922"; // non-Latin scripts (amber)

const BLOCK_COLORS = {
  "C0 Controls": BLOCK_COLOR_CONTROL,
  "Basic Latin": BLOCK_COLOR_LETTERS,
  Delete: BLOCK_COLOR_CONTROL,
  "C1 Controls": BLOCK_COLOR_CONTROL,
  "Latin-1 Supplement": BLOCK_COLOR_LETTERS,
  "Latin Extended-A": BLOCK_COLOR_LETTERS,
  "Latin Extended-B": BLOCK_COLOR_LETTERS,
  "IPA Extensions": BLOCK_COLOR_LETTERS,
  "Spacing Modifier Letters": BLOCK_COLOR_MARKS,
  "Combining Diacritical Marks": BLOCK_COLOR_MARKS,
  "Greek and Coptic": BLOCK_COLOR_SCRIPT,
  Cyrillic: BLOCK_COLOR_SCRIPT,
  "Cyrillic Supplement": BLOCK_COLOR_SCRIPT,
  Armenian: BLOCK_COLOR_SCRIPT,
  Hebrew: BLOCK_COLOR_SCRIPT,
  Arabic: BLOCK_COLOR_SCRIPT,
  Syriac: BLOCK_COLOR_SCRIPT,
  Thaana: BLOCK_COLOR_SCRIPT,
  "Latin Extended Additional": BLOCK_COLOR_LETTERS,
  "Greek Extended": BLOCK_COLOR_SCRIPT,
  "General Punctuation": BLOCK_COLOR_PUNCT,
  "Superscripts and Subscripts": BLOCK_COLOR_NUMBERS,
  "Currency Symbols": BLOCK_COLOR_SYMBOLS,
  "Combining Marks for Symbols": BLOCK_COLOR_MARKS,
  "Letterlike Symbols": BLOCK_COLOR_SYMBOLS,
  "Number Forms": BLOCK_COLOR_NUMBERS,
  Arrows: BLOCK_COLOR_PUNCT,
  "Mathematical Operators": BLOCK_COLOR_MATH,
  "Miscellaneous Technical": BLOCK_COLOR_SYMBOLS,
  "Control Pictures": BLOCK_COLOR_CONTROL,
  "Optical Character Recognition": BLOCK_COLOR_SYMBOLS,
  "Enclosed Alphanumerics": BLOCK_COLOR_NUMBERS,
  "Box Drawing": BLOCK_COLOR_PUNCT,
  "Block Elements": BLOCK_COLOR_PUNCT,
  "Geometric Shapes": BLOCK_COLOR_SYMBOLS,
  "Miscellaneous Symbols": BLOCK_COLOR_SYMBOLS,
  Dingbats: BLOCK_COLOR_SYMBOLS,
  "Miscellaneous Mathematical Symbols-A": BLOCK_COLOR_MATH,
  "Supplemental Arrows-A": BLOCK_COLOR_PUNCT,
  "Braille Patterns": BLOCK_COLOR_SYMBOLS,
  "Supplemental Arrows-B": BLOCK_COLOR_PUNCT,
  "Miscellaneous Mathematical Symbols-B": BLOCK_COLOR_MATH,
  "Supplemental Mathematical Operators": BLOCK_COLOR_MATH,
  "Miscellaneous Symbols and Arrows": BLOCK_COLOR_PUNCT,
};

/* ── Unicode category descriptions ──────────────────── */
const CAT_LABELS = {
  Lu: "Uppercase Letter",
  Ll: "Lowercase Letter",
  Lt: "Titlecase Letter",
  Lm: "Modifier Letter",
  Lo: "Other Letter",
  Mn: "Non-Spacing Mark",
  Mc: "Spacing Mark",
  Me: "Enclosing Mark",
  Nd: "Decimal Number",
  Nl: "Letter Number",
  No: "Other Number",
  Ps: "Open Punctuation",
  Pe: "Close Punctuation",
  Pi: "Initial Punctuation",
  Pf: "Final Punctuation",
  Pd: "Dash Punctuation",
  Pc: "Connector Punctuation",
  Po: "Other Punctuation",
  Sm: "Math Symbol",
  Sc: "Currency Symbol",
  Sk: "Modifier Symbol",
  So: "Other Symbol",
  Zs: "Space Separator",
  Zl: "Line Separator",
  Zp: "Paragraph Separator",
  Cc: "Control Char",
  Cf: "Format Char",
  Cs: "Surrogate",
  Co: "Private Use",
  Cn: "Unassigned",
};

/* ── State ───────────────────────────────────────────── */
const state = {
  search: "",
  activeBlock: "all",
  filtered: UNICODE_DATA,
  renderedCount: 0,
  PAGE_SIZE: 350,
  selectedIdx: -1,
};

/* ── DOM refs ────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const searchInput = $("search");
const searchClear = $("searchClear");
const filterChips = $("filterChips");
const filterFadeL = $("filterFadeL");
const resultCount = $("resultCount");
const charGrid = $("charGrid");
const loadSentinel = $("loadSentinel");
const emptyState = $("emptyState");
const detailPanel = $("detailPanel");
const detailBackdrop = $("detailBackdrop");
const detailClose = $("detailClose");
const detailInner = $("detailInner");
const detailPrev = $("detailPrev");
const detailNext = $("detailNext");
const toast = $("toast");
const aboutBtn = $("aboutBtn");
const aboutModal = $("aboutModal");
const aboutBackdrop = $("aboutBackdrop");
const aboutClose = $("aboutClose");

/* ── Helpers ─────────────────────────────────────────── */
function isControl(entry) {
  return (
    entry.cat.startsWith("C") ||
    entry.cp <= 0x1f ||
    (entry.cp >= 0x7f && entry.cp <= 0x9f)
  );
}

function isCombining(entry) {
  return entry.cat.startsWith("M");
}

function isSpace(entry) {
  return entry.cat.startsWith("Z");
}

function getGlyphDisplay(entry) {
  if (isControl(entry)) return entry.name.match(/^([A-Z]{2,5})/)?.[1] ?? "·";
  if (isCombining(entry)) return "\u25CC" + entry.char;
  if (isSpace(entry)) return "·";
  return entry.char;
}

function getGlyphClass(entry) {
  return isControl(entry) ? "char-glyph is-control" : "char-glyph";
}

function blockColor(block) {
  return BLOCK_COLORS[block] ?? "#6366f1";
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ── Fuzzy scoring ────────────────────────────────────── */
function fuzzyScore(haystack, needle) {
  // Subsequence match: all needle chars must appear in haystack in order.
  // Returns 0 if no match, otherwise a positive score (higher = better).
  const h = haystack.length;
  const n = needle.length;
  if (n === 0) return 1;
  if (n > h) return 0;

  let hi = 0, ni = 0, score = 0, run = 0, firstAt = -1;

  while (hi < h && ni < n) {
    if (haystack[hi] === needle[ni]) {
      if (firstAt < 0) firstAt = hi;
      run++;
      score += run * run; // consecutive chars score exponentially more
      ni++;
    } else {
      run = 0;
    }
    hi++;
  }

  if (ni < n) return 0; // didn't consume all of needle

  // Bonus for matching earlier in the string
  score += Math.max(0, 10 - firstAt);
  return score;
}

/* ── Filter logic ────────────────────────────────────── */
function computeFiltered() {
  const q = state.search.trim().toLowerCase();
  const block = state.activeBlock;

  // No query: return all non-control chars, optionally filtered by block
  if (!q) {
    return UNICODE_DATA.filter((entry) => {
      if (isControl(entry)) return false;
      if (block !== "all" && entry.block !== block) return false;
      return true;
    });
  }

  const results = [];

  for (const entry of UNICODE_DATA) {
    if (block !== "all" && entry.block !== block) continue;

    const hex = entry.hex.toLowerCase();
    const nameLower = entry.name.toLowerCase();
    const blockLower = entry.block.toLowerCase();

    // Tier 1 — exact code-point / character identity (score 10000+)
    if (hex === q || `u+${hex}` === q) {
      results.push({ entry, score: 10000 }); continue;
    }
    const asDecimal = parseInt(q, 10);
    const asHex = parseInt(q, 16);
    if ((!isNaN(asDecimal) && entry.cp === asDecimal) ||
        (!isNaN(asHex) && entry.cp === asHex && /^[0-9a-f]+$/i.test(q))) {
      results.push({ entry, score: 9000 }); continue;
    }
    if (entry.char === q) { results.push({ entry, score: 8500 }); continue; }
    if (entry.cat.toLowerCase() === q) { results.push({ entry, score: 7000 }); continue; }

    // Tier 2 — substring match in name or block (score 2000–5000)
    const nameIdx = nameLower.indexOf(q);
    if (nameIdx >= 0) {
      // Reward matches at word boundaries
      const atStart = nameIdx === 0;
      const atWordBoundary = nameIdx > 0 && nameLower[nameIdx - 1] === " ";
      const base = atStart ? 5000 : atWordBoundary ? 4000 : 3000;
      results.push({ entry, score: base - nameIdx * 0.1 }); continue;
    }
    if (blockLower.includes(q)) {
      results.push({ entry, score: 2000 }); continue;
    }

    // Tier 3 — fuzzy match against name (min 2 chars to avoid noise)
    if (q.length >= 2) {
      const score = fuzzyScore(nameLower, q);
      if (score > 0) results.push({ entry, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.map((r) => r.entry);
}

/* ── Render ──────────────────────────────────────────── */
function renderAll() {
  state.filtered = computeFiltered();
  state.renderedCount = 0;
  charGrid.innerHTML = "";
  resultCount.textContent = state.filtered.length.toLocaleString();

  if (state.filtered.length === 0) {
    emptyState.hidden = false;
    loadSentinel.style.display = "none";
    return;
  }

  emptyState.hidden = true;
  loadSentinel.style.display = "";

  const isSearching = state.search.trim() !== "" || state.activeBlock !== "all";

  if (isSearching) {
    renderFlatBatch(0);
  } else {
    renderGrouped();
  }
}

function renderGrouped() {
  // Group by block (excluding control characters)
  const byBlock = new Map();
  for (const entry of UNICODE_DATA) {
    if (isControl(entry)) continue;
    if (!byBlock.has(entry.block)) byBlock.set(entry.block, []);
    byBlock.get(entry.block).push(entry);
  }

  const frag = document.createDocumentFragment();

  for (const [block, entries] of byBlock) {
    const color = blockColor(block);

    // Section header
    const hdr = document.createElement("div");
    hdr.className = "section-header";
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
    const group = document.createElement("div");
    group.className = "char-group";

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
    const hdr = document.createElement("div");
    hdr.className = "section-header";
    hdr.innerHTML = `
      <div class="section-title" style="color:var(--accent)">
        <span class="section-title-dot" style="color:var(--accent);background:var(--accent)"></span>
        Search Results
      </div>
      <div class="section-line"></div>
      <div class="section-count">${state.filtered.length.toLocaleString()} matches</div>
    `;
    charGrid.appendChild(hdr);
  }

  if (startIdx === 0 && state.activeBlock !== "all" && !state.search.trim()) {
    const color = blockColor(state.activeBlock);
    const hdr = document.createElement("div");
    hdr.className = "section-header";
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

  const group = document.createElement("div");
  group.className = "char-group";
  for (const entry of slice) {
    group.appendChild(createCard(entry));
  }
  charGrid.appendChild(group);

  state.renderedCount = startIdx + slice.length;
}

function createCard(entry) {
  const card = document.createElement("button");
  card.className = "char-card";
  card.setAttribute("aria-label", `${entry.name} U+${entry.hex}`);
  card.dataset.idx = entry.cp; // use cp as unique key

  const glyphEl = document.createElement("div");
  glyphEl.className = getGlyphClass(entry);
  glyphEl.textContent = getGlyphDisplay(entry);

  const hexEl = document.createElement("div");
  hexEl.className = "char-hex";
  hexEl.textContent = `U+${entry.hex}`;

  card.appendChild(glyphEl);
  card.appendChild(hexEl);

  const nameEl = document.createElement("div");
  nameEl.className = "char-name";
  const rawName = entry.name;
  nameEl.textContent = rawName.length > 20 ? rawName.slice(0, 18) + "…" : rawName;
  nameEl.title = rawName;
  card.appendChild(nameEl);

  card.addEventListener("click", () => {
    const idx = state.filtered.findIndex((e) => e.cp === entry.cp);
    // If viewing flat (searching), use filtered index; else use global
    const globalIdx = UNICODE_DATA.findIndex((e) => e.cp === entry.cp);
    openDetail(globalIdx, idx !== -1 ? idx : null);
  });

  return card;
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  detailPanel.setAttribute("aria-hidden", "false");
  detailBackdrop.classList.add("visible");
  detailPanel.focus?.();

  // Highlight active card
  document.querySelector(".char-card.is-active")?.classList.remove("is-active");
  document.querySelector(`.char-card[data-idx="${entry.cp}"]`)?.classList.add("is-active");

  // Update nav buttons
  updateDetailNav();
}

function closeDetail() {
  detailPanel.setAttribute("aria-hidden", "true");
  detailBackdrop.classList.remove("visible");
  document.querySelector(".char-card.is-active")?.classList.remove("is-active");
}

function updateDetailNav() {
  const { filteredIdx } = detailContext;
  detailPrev.disabled = filteredIdx <= 0;
  detailNext.disabled =
    filteredIdx < 0 || filteredIdx >= state.filtered.length - 1;
}

function renderDetailContent(entry) {
  const color = blockColor(entry.block);
  const glyph = getGlyphDisplay(entry);
  const isCtrl = isControl(entry);

  const rows = [
    { label: "Code Point", value: `U+${entry.hex}`, copy: `U+${entry.hex}` },
    { label: "Decimal", value: entry.cp.toString(), copy: entry.cp.toString() },
    { label: "Octal", value: entry.cp.toString(8), copy: entry.cp.toString(8) },
    {
      label: "Binary",
      value: entry.cp.toString(2),
      copy: entry.cp.toString(2),
      wrap: true,
    },
    { label: "HTML Dec", value: `&#${entry.cp};`, copy: `&#${entry.cp};` },
    { label: "HTML Hex", value: `&#x${entry.hex};`, copy: `&#x${entry.hex};` },
    { label: "CSS", value: `\\${entry.hex}`, copy: `\\${entry.hex}` },
    {
      label: "Character",
      value: isCtrl ? "(control)" : entry.char,
      copy: isCtrl ? "" : entry.char,
    },
  ];

  const catCode = entry.cat;
  const catLabel = CAT_LABELS[catCode] ?? catCode;

  const copyChar = isCtrl ? "" : entry.char;
  detailInner.innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-glyph-wrap${copyChar ? " detail-hero-glyph-copyable" : ""}" style="border-color:${color}33;box-shadow:0 0 40px ${color}15" ${copyChar ? `data-copy="${escHtml(copyChar)}" role="button" tabindex="0" title="Click to copy character" aria-label="Copy character ${escHtml(entry.name)}"` : ""}>
        <div class="detail-hero-glyph${isCtrl ? " is-control" : ""}" style="color:${isCtrl ? "" : color}">${escHtml(isCtrl ? (entry.name.match(/^([A-Z]{2,5})/)?.[1] ?? "·") : isCombining(entry) ? "\u25CC" + entry.char : entry.char)}</div>
        ${copyChar ? `<div class="detail-hero-copy-hint" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</div>` : ""}
      </div>
      <div class="detail-hero-name">${escHtml(entry.name)}</div>
      <div class="detail-hero-block" style="border-color:${color}44;color:${color}">${escHtml(entry.block)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-label">References</div>
      ${rows
        .map(
          (r) => `
        <div class="detail-row">
          <span class="detail-row-label">${r.label}</span>
          <span class="detail-row-value"${r.wrap ? ' style="white-space:normal;word-break:break-all"' : ""}>${escHtml(r.value)}</span>
          ${r.copy ? `<button class="detail-copy-btn" data-copy="${escHtml(r.copy)}" title="Copy ${r.label}" aria-label="Copy ${r.label}">⎘</button>` : ""}
        </div>
      `,
        )
        .join("")}
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
  detailInner.querySelectorAll(".detail-copy-btn[data-copy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyToClipboard(
        btn.dataset.copy,
        btn.closest(".detail-row").querySelector(".detail-row-label")
          .textContent,
      );
    });
  });

  // Bind hero glyph click to copy character
  const glyphWrap = detailInner.querySelector(".detail-hero-glyph-copyable");
  if (glyphWrap) {
    const activateGlyphCopy = (e) => {
      e.stopPropagation();
      copyToClipboard(glyphWrap.dataset.copy, "Character");
      glyphWrap.classList.add("copied");
      setTimeout(() => glyphWrap.classList.remove("copied"), 800);
    };
    glyphWrap.addEventListener("click", activateGlyphCopy);
    glyphWrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateGlyphCopy(e); }
    });
  }
}

/* ── Clipboard ───────────────────────────────────────── */
let toastTimer;

function copyToClipboard(text, label) {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast(
        `✓ Copied ${label}: ${text.length > 30 ? text.slice(0, 30) + "…" : text}`,
      );
    })
    .catch(() => {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast(`✓ Copied ${label}`);
    });
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ── Filter chips ────────────────────────────────────── */
function buildFilterChips() {
  const blocks = ["all", ...Object.keys(BLOCK_COLORS)];
  const frag = document.createDocumentFragment();

  for (const block of blocks) {
    const chip = document.createElement("button");
    chip.className = `filter-chip${block === state.activeBlock ? " active" : ""}`;
    chip.dataset.block = block;
    chip.setAttribute("role", "listitem");

    if (block === "all") {
      chip.innerHTML = `<span class="filter-chip-dot" style="background:var(--accent)"></span> All Blocks`;
    } else {
      const color = blockColor(block);
      chip.innerHTML = `<span class="filter-chip-dot" style="background:${color}"></span> ${escHtml(block)}`;
    }

    chip.addEventListener("click", () => {
      state.activeBlock = block;
      filterChips
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      // Scroll chip into view
      chip.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      renderAll();
    });

    frag.appendChild(chip);
  }

  filterChips.appendChild(frag);

  // Show/hide left fade based on scroll position
  filterChips.addEventListener("scroll", () => {
    filterFadeL.classList.toggle("visible", filterChips.scrollLeft > 8);
  }, { passive: true });
}

/* ── Infinite scroll ─────────────────────────────────── */
const observer = new IntersectionObserver(
  (entries) => {
    if (
      entries[0].isIntersecting &&
      state.renderedCount < state.filtered.length
    ) {
      const isSearching =
        state.search.trim() !== "" || state.activeBlock !== "all";
      if (isSearching) {
        renderFlatBatch(state.renderedCount);
      }
    }
  },
  { rootMargin: "200px" },
);

observer.observe(loadSentinel);

/* ── Search ──────────────────────────────────────────── */
const doSearch = debounce((q) => {
  state.search = q;
  searchClear.hidden = !q;
  renderAll();
}, 160);

searchInput.addEventListener("input", (e) => doSearch(e.target.value));

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  state.search = "";
  searchClear.hidden = true;
  searchInput.focus();
  renderAll();
});

/* ── Detail panel events ─────────────────────────────── */
detailClose.addEventListener("click", closeDetail);
detailBackdrop.addEventListener("click", closeDetail);

/* ── About modal ─────────────────────────────────────── */
function openAbout() {
  const uniqueBlocks = new Set(UNICODE_DATA.map((e) => e.block)).size;
  $("aboutCharCount").textContent = UNICODE_DATA.length.toLocaleString();
  $("aboutBlockCount").textContent = uniqueBlocks.toLocaleString();
  aboutModal.showModal?.() || aboutModal.setAttribute("open", "");
  aboutBackdrop.setAttribute("aria-hidden", "false");
  aboutBackdrop.classList.add("visible");
}
function closeAbout() {
  aboutModal.close?.() || aboutModal.removeAttribute("open");
  aboutBackdrop.setAttribute("aria-hidden", "true");
  aboutBackdrop.classList.remove("visible");
}
aboutBtn.addEventListener("click", openAbout);
aboutClose.addEventListener("click", closeAbout);
aboutBackdrop.addEventListener("click", closeAbout);
aboutModal.addEventListener("click", (e) => { if (e.target === aboutModal) closeAbout(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && aboutModal.open) closeAbout(); });

detailPrev.addEventListener("click", () => {
  if (detailContext.filteredIdx > 0) {
    const newFIdx = detailContext.filteredIdx - 1;
    const entry = state.filtered[newFIdx];
    const gIdx = UNICODE_DATA.findIndex((e) => e.cp === entry.cp);
    openDetail(gIdx, newFIdx);
  }
});

detailNext.addEventListener("click", () => {
  if (
    detailContext.filteredIdx >= 0 &&
    detailContext.filteredIdx < state.filtered.length - 1
  ) {
    const newFIdx = detailContext.filteredIdx + 1;
    const entry = state.filtered[newFIdx];
    const gIdx = UNICODE_DATA.findIndex((e) => e.cp === entry.cp);
    openDetail(gIdx, newFIdx);
  }
});

/* ── Keyboard ────────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  // Esc closes panel
  if (e.key === "Escape") {
    if (detailPanel.getAttribute("aria-hidden") === "false") {
      closeDetail();
    }
    return;
  }

  // Arrow left/right to browse when panel open
  if (detailPanel.getAttribute("aria-hidden") === "false") {
    if (e.key === "ArrowLeft" && !detailPrev.disabled) detailPrev.click();
    if (e.key === "ArrowRight" && !detailNext.disabled) detailNext.click();
  }

  // Slash to focus search
  if (e.key === "/" && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

/* ── Unrenderable character detection ───────────────── */
// Compares each character's canvas render against two Unicode noncharacters
// (U+FDD0, U+FDD1). These are permanently unassigned codepoints that no
// font should define glyphs for — both should produce the exact same
// "missing glyph" pixel pattern (the tofu box).
// Note: U+FFFD (Replacement Character) is NOT used here — it is a valid,
// intentionally designed glyph in every font, not a missing-glyph indicator.

function runRenderabilityCheck() {
  const SIZE = 28;
  const FONT = `${SIZE - 6}px sans-serif`;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";

  function alphaChecksum(char) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillText(char, SIZE / 2, SIZE / 2);
    const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let sum = 0;
    for (let i = 3; i < d.length; i += 4) sum += d[i]; // sum alpha channel
    return sum;
  }

  // Establish tofu reference using Unicode noncharacters U+FDD0–U+FDD2.
  // If all three produce the same checksum, that IS the missing-glyph pattern.
  const nc0 = alphaChecksum("\uFDD0");
  const nc1 = alphaChecksum("\uFDD1");
  const nc2 = alphaChecksum("\uFDD2");

  // At least two of the three must agree; if none agree, skip the check.
  let tofuSum;
  if (nc0 === nc1 || nc0 === nc2) {
    tofuSum = nc0;
  } else if (nc1 === nc2) {
    tofuSum = nc1;
  } else {
    console.warn(
      "[Unicode Index] Renderability check skipped — browser renders Unicode noncharacters inconsistently, unable to establish a reliable tofu reference.",
    );
    return;
  }

  const hiddenByBlock = new Map();
  let totalHidden = 0;

  // Build a card lookup from cp → DOM element
  const cards = charGrid.querySelectorAll(".char-card");
  const cardByCp = new Map();
  for (const card of cards) {
    const cp = parseInt(card.dataset.idx, 10);
    if (!isNaN(cp)) cardByCp.set(cp, card);
  }

  // Only test characters that aren't already shown as placeholders
  const candidates = UNICODE_DATA.filter(
    (e) =>
      !isControl(e) && !isCombining(e) && !isSpace(e) && cardByCp.has(e.cp),
  );

  let idx = 0;

  function processBatch(deadline) {
    while (
      idx < candidates.length &&
      (deadline.timeRemaining() > 1 || deadline.didTimeout)
    ) {
      const entry = candidates[idx++];
      const checksum = alphaChecksum(entry.char);

      // Unrenderable if: matches tofu pattern, or renders as fully transparent
      if (checksum === tofuSum || checksum === 0) {
        const card = cardByCp.get(entry.cp);
        if (card) {
          card.hidden = true;
          totalHidden++;
          if (!hiddenByBlock.has(entry.block))
            hiddenByBlock.set(entry.block, []);
          hiddenByBlock.get(entry.block).push(`U+${entry.hex}`);
        }
      }
    }

    if (idx < candidates.length) {
      requestIdleCallback(processBatch, { timeout: 200 });
    } else if (totalHidden > 0) {
      const lines = [""];
      for (const [block, cps] of hiddenByBlock) {
        lines.push(
          `  ${block} (${cps.length}): ${cps.slice(0, 8).join(" ")}${cps.length > 8 ? " …" : ""}`,
        );
      }
      console.warn(
        `[Unicode Index] ${totalHidden} character${totalHidden === 1 ? "" : "s"} hidden — not renderable by current system fonts:\n${lines.join("\n")}`,
      );
    }
  }

  if ("requestIdleCallback" in window) {
    requestIdleCallback(processBatch, { timeout: 500 });
  } else {
    // Fallback for browsers without rIC (Safari < 16.4)
    setTimeout(() => {
      const mockDeadline = { timeRemaining: () => 10, didTimeout: false };
      function runAll() {
        mockDeadline.didTimeout = true;
        processBatch(mockDeadline);
        if (idx < candidates.length) setTimeout(runAll, 0);
      }
      runAll();
    }, 300);
  }
}
/* ── Boot ────────────────────────────────────────────── */
(function init() {
  buildFilterChips();
  renderAll();
  // Run renderability check after paint
  requestAnimationFrame(() => requestAnimationFrame(runRenderabilityCheck));

  // Keyboard shortcut hint
  const hint = document.createElement("div");
  hint.style.cssText = `
    position:fixed; bottom:20px; right:20px; z-index:50;
    font-size:11px; color:rgba(139,148,158,0.5);
    font-family:ui-monospace,'Cascadia Code','Fira Code',monospace;
    pointer-events:none;
  `;
  hint.textContent = "/ to search";
  document.body.appendChild(hint);
})();
