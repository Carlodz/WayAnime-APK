/* القائمة الجانبية (Slide) — كتخرج كي تضغط على لوغو WayAnime. خاصة بنسخة Android */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/></svg>'
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STAR = '<svg class="st" viewBox="0 0 24 24"><polygon points="12 3 14.7 8.6 20.8 9.5 16.4 13.8 17.5 19.9 12 17 6.5 19.9 7.6 13.8 3.2 9.5 9.3 8.6"/></svg>';
  let ov, dr;

  function build() {
    ov = document.createElement('div'); ov.id = 'drOv';
    dr = document.createElement('aside'); dr.id = 'dr'; dr.setAttribute('dir', 'rtl');
    document.body.append(ov, dr);
    ov.addEventListener('click', close);
    document.addEventListener('wa-close-drawer', close);
  }

  function profile() {
    const a = null;
    const spans = a ? a.querySelectorAll('span') : [];
    const pic = a && $('#acPic', a);
    const name = spans[0] ? spans[0].textContent.trim() : '';
    const pts = a && $('.pt', a) ? $('.pt', a).textContent.trim() : '';
    const bg = a && a.style.backgroundImage && a.style.backgroundImage !== 'none' ? a.style.backgroundImage : '';
    return { name, pts, pic: pic ? pic.src : '', bg };
  }

  function render() {
    const chip = $('#fsec .chip.on'), secOn = chip ? chip.dataset.sec : '';
    const it = (k, icon, label, on) => '<button data-k="' + k + '" class="' + (on ? 'on' : '') + '">' + icon + '<span>' + label + '</span></button>';
    const DL = '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>';
    dr.innerHTML =
      '<nav style="padding-top:calc(env(safe-area-inset-top,0px) + 22px)">' +
        it('sec:EPS', SEC_ICON.EPS, 'آخر الحلقات', secOn === 'EPS') +
        it('sec:DUBBED', SEC_ICON.DUBBED, 'أنمي مدبلج', secOn === 'DUBBED') +
        it('genre', ICON.tag, 'التصنيفات', false) +
        it('dl', DL, 'الحلقات المحملة', false) +
        it('wp', window.waWpIcon || '', 'مشاهدة مشتركة', false) +
      '</nav>';
    dr.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k; close();
      if (k === 'genre') setTimeout(goGenre, 150);
      else if (k === 'dl') setTimeout(() => window.openDownloads && window.openDownloads(), 150);
      else if (k === 'wp') setTimeout(() => window.openWatchParty && window.openWatchParty(), 150);
      else if (k.indexOf('sec:') === 0) setTimeout(() => goSec(k.slice(4)), 150);
    }));
  }

  function open() { document.body.classList.remove('cb-open'); if (!dr) build(); render(); document.body.classList.add('dr-open'); }
  function close() { document.body.classList.remove('dr-open'); }

  document.addEventListener('DOMContentLoaded', () => {
    const q = $('#q'); if (q && q.placeholder) q.placeholder = q.placeholder.replace(/\s*\(Ctrl\+K\)/i, '');
    // تفويض على document (capture): كيخدم حتى إلا تعاود بناء الهيدر، وبلا ما يتأثر بترتيب السكريبتات
    const toggle = (e) => {
      const t = e.target && e.target.closest && e.target.closest('.brand');
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      document.body.classList.contains('dr-open') ? close() : open();
    };
    document.addEventListener('click', toggle, true);
  });

  /* ===== زر الكومبو (حدا البحث): الأقسام + المفضلة + الرئيسية + التصنيفات ===== */
  const SECS = [['EPS', 'آخر الحلقات'], ['latest', 'آخر الإضافات'], ['DUBBED', 'مدبلج'], ['POPULARITY', 'الأكثر شعبية'], ['HIGHEST_RATE', 'الأعلى تقييماً'], ['AIRING', 'يُعرض حالياً'], ['SEASON', 'أنمي الموسم'], ['SCHEDULE', 'جدول الحلقات']];
  const GRID = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>';
  const TAG = '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/></svg>';
  const sv = (p) => '<svg viewBox="0 0 24 24">' + p + '</svg>';
  const SEC_ICON = {
    EPS: sv('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>'),
    latest: sv('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>'),
    POPULARITY: sv('<path d="M12 21a6 6 0 006-6c0-3.5-3-5-3.5-9-2 1.5-3 3.5-3 5.5-1-.5-1.8-1.5-2-3C7.5 10 6 12 6 15a6 6 0 006 6z"/>'),
    HIGHEST_RATE: sv('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    AIRING: sv('<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M5 5a10 10 0 000 14M19 5a10 10 0 010 14"/>'),
    SEASON: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>'),
    SCHEDULE: sv('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    DUBBED: sv('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>')
  };
  let cb, cbOv, cbBtn;
  const waitFor = (fn, ms) => new Promise((res) => { const t0 = Date.now(); (function p() { const r = fn(); if (r) return res(r); if (Date.now() - t0 > ms) return res(null); setTimeout(p, 150); })(); });

  async function goSec(sec) {
    const chip = () => $('#fsec .chip[data-sec="' + sec + '"]');
    if (!chip()) { const h = $('#nHome'); if (h) h.click(); await waitFor(chip, 10000); }
    const c = chip(); if (c) c.click();
  }
  async function goGenre() {
    if (!$('#fgenre')) { const h = $('#nHome'); if (h) h.click(); await waitFor(() => $('#fgenre'), 10000); }
    const dd = $('#fgenre'); if (!dd) return;
    dd.scrollIntoView({ block: 'center' });
    setTimeout(() => { const b = dd.querySelector('.ddb'); if (b && dd.querySelector('.ddl').hidden) b.click(); }, 250);
  }

  function cbBuild() {
    cbOv = document.createElement('div'); cbOv.id = 'cbOv';
    cb = document.createElement('div'); cb.id = 'cb'; cb.setAttribute('dir', 'rtl');
    document.body.append(cbOv, cb);
    cbOv.addEventListener('click', cbClose);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cbClose(); });
    document.addEventListener('wa-close-drawer', cbClose);
  }
  function cbRender() {
    const fav = $('#nFav') && $('#nFav').classList.contains('on');
    const hist = $('#nHist') && $('#nHist').classList.contains('on');
    const chip = $('#fsec .chip.on');
    const secOn = !fav && !hist && chip ? chip.dataset.sec : '';
    const homeOn = !fav && !hist && !secOn;
    const it = (cls, key, icon, label, on) => '<button class="' + (on ? 'on ' : '') + cls + '" data-k="' + key + '">' + icon + '<span>' + label + '</span></button>';
    const pf = profile(), letter = esc((pf.name || 'W').charAt(0).toUpperCase());
    const prof = pf.name ? '<div class="cbp"' + (pf.bg ? ' style="background-image:' + pf.bg.replace(/"/g, '&quot;') + '"' : '') + '><div class="cbs"></div><div class="cbpi">' +
      (pf.pic ? '<img src="' + esc(pf.pic) + '" alt="" referrerpolicy="no-referrer">' : '<i>' + letter + '</i>') +
      '<div><b>' + esc(pf.name) + '</b>' + (pf.pts ? '<span>' + STAR + esc(pf.pts) + ' نقطة</span>' : '') + '</div></div></div>' : '';
    cb.innerHTML = prof +
      it('', 'nHome', ICON.home, 'الرئيسية', homeOn) +
      it('', 'nFav', ICON.heart, 'المفضلة', fav) +
      it('', 'nHist', ICON.clock, 'سجل المشاهدة', hist) +
      '<hr>' +
      SECS.map(([v, n]) => it('', 'sec:' + v, SEC_ICON[v] || '<i class="dot"></i>', n, secOn === v)).join('') +
      '<hr>' + it('', 'genre', TAG, 'التصنيفات', false) +
      '';
    cb.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k; cbClose();
      if (k === 'diag') { setTimeout(() => window.__waDiag && window.__waDiag(), 100); }
      else if (k === 'nHome' || k === 'nFav' || k === 'nHist') { const t = $('#' + k); if (t) setTimeout(() => t.click(), 100); }
      else if (k === 'genre') setTimeout(goGenre, 100);
      else if (k.indexOf('sec:') === 0) setTimeout(() => goSec(k.slice(4)), 100);
    }));
  }
  function cbOpen() { if (!cb) cbBuild(); close(); cbRender(); document.body.classList.add('cb-open'); }
  function cbClose() { document.body.classList.remove('cb-open'); }

  document.addEventListener('DOMContentLoaded', () => {
    const hostEl = $('.ub') || $('.sb'); if (!hostEl) return;
    cbBtn = document.createElement('button');
    cbBtn.id = 'cbBtn'; cbBtn.type = 'button'; cbBtn.setAttribute('aria-label', 'الأقسام'); cbBtn.innerHTML = GRID;
    hostEl.parentNode.insertBefore(cbBtn, hostEl);
    cbBtn.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.contains('cb-open') ? cbClose() : cbOpen(); });
  });
})();
