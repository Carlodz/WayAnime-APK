/* WayAnime — categories.js : تبويب «تصنيفات»
   فيه: التصنيفات + آخر الحلقات الحقيقية (Anime4up · WitAnime · Animeify · Stardima) + توقيع فـ الأسفل.
   كيعتمد على دوال renderer.js (latestEpisodes, epFilt, epCard, bindCards, AF, arLoadCatalog…) */
(function () {
  const PAGE = 30, TTL = 5 * 60 * 1000;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const C = { list: [], at: 0, shown: 0, busy: false, tk: 0 };

  const alive = () => !!document.getElementById('catPage');
  const chipsGenres = () => AR_GENRES.map(([n, v]) => '<button type="button" class="chip cg" data-g="' + esc(v) + '">' + esc(n) + '</button>').join('');

  function statusHtml() {
    return EP_TOOLS.filter((t) => ['wit', 'a4u', 'afy', 'sd'].includes(t.key)).map((t) => {
      const st = EPM.status[t.key];
      const col = !st ? '#999' : st.ok ? '#3ecf6e' : '#ff6b6b';
      const mark = !st ? '…' : st.ok ? I.check + ' ' + st.n : I.cross;
      return '<span class="cst" title="' + esc(st && !st.ok ? st.err : '') + '" style="color:' + col + ';border-color:' + col + '">' + esc(t.name) + ' ' + mark + '</span>';
    }).join('');
  }

  function paint() {
    const box = document.getElementById('catEps'); if (!box) return;
    const all = epFilt(C.list), part = all.slice(0, C.shown);
    box.innerHTML = part.length ? part.map(epCard).join('')
      : '<p class="mute" style="grid-column:1/-1">' + (C.busy ? 'جارٍ جلب آخر الحلقات…' : 'لم نعثر على حلقات حاليًا. راجع حالة المصادر في الأعلى، وجرّب زر التحديث.') + '</p>';
    bindCards();
    const n = document.getElementById('catCount'); if (n) n.textContent = all.length ? all.length + ' حلقة' : '';
    const more = document.getElementById('catMore'); if (more) more.classList.toggle('hide', C.shown >= all.length);
    const st = document.getElementById('catSt'); if (st) st.innerHTML = statusHtml();
    document.querySelectorAll('#catPage .epf').forEach((b) => b.classList.toggle('on', b.dataset.f === EPM.f));
  }

  async function load(force) {
    if (C.busy) return;
    if (!force && C.list.length && Date.now() - C.at < TTL) { C.shown = Math.max(C.shown, PAGE); return paint(); }
    C.busy = true; const tk = ++C.tk;
    const rb = document.getElementById('catNow'); if (rb) { rb.disabled = true; rb.textContent = '…'; }
    C.shown = PAGE; paint();
    try {
      const list = await latestEpisodes();
      if (tk !== C.tk) return;
      C.list = list; C.at = Date.now();
      try { store.set('epSeen2', [...new Set([...store.get('epSeen2', []), ...list.map(epKey)])].slice(-3000)); } catch (e) {}
    } catch (e) {
      if (alive()) toast('خطأ: ' + errMsg(e));
    } finally {
      C.busy = false;
      const b = document.getElementById('catNow'); if (b) { b.disabled = false; b.innerHTML = I.sync; }
      if (alive()) paint();
    }
  }

  function open() {
    if (typeof view === 'undefined') return;
    setNav(null);
    document.body.classList.remove('dr-open', 'cb-open');
    view.innerHTML =
      '<div id="catPage">' +
        '<h2 class="cth">التصنيفات</h2>' +
        '<div class="cgen">' + chipsGenres() + '</div>' +
        '<div class="ctop"><h3>آخر الحلقات</h3><span class="mute" id="catCount"></span></div>' +
        '<div class="cfil">' +
          [['sub', 'مترجم'], ['all', 'الكل'], ['dub', 'مدبلج']].map(([v, n]) => '<button type="button" class="chip epf' + (EPM.f === v ? ' on' : '') + '" data-f="' + v + '">' + n + '</button>').join('') +
          '<button type="button" class="chip" id="catNow" title="تحديث الآن" style="margin-inline-start:auto">' + I.sync + '</button>' +
        '</div>' +
        '<div class="cstw" id="catSt">' + statusHtml() + '</div>' +
        '<div class="grid" id="catEps"></div>' +
        '<div style="text-align:center;margin-top:22px"><button type="button" class="primary hide" id="catMore">عرض المزيد</button></div>' +
        '<footer class="cfoot">Wayanime . Carlodz.2026</footer>' +
      '</div>';
    view.scrollTop = 0;
    const page = document.getElementById('catPage');
    page.querySelectorAll('.cg').forEach((b) => b.onclick = () => {      // تصنيف ← كتالوج التصنيف (AniList)
      AF.genre = b.dataset.g; AF.sec = 'latest'; AF.type = 'SERIES'; arLoadCatalog();
    });
    page.querySelectorAll('.epf').forEach((b) => b.onclick = () => { EPM.f = b.dataset.f; C.shown = PAGE; paint(); });
    document.getElementById('catNow').onclick = () => load(true);
    document.getElementById('catMore').onclick = () => { C.shown += PAGE; paint(); };
    if (window.__navSync) window.__navSync();
    load(false);
  }
  window.openCategories = open;
})();
