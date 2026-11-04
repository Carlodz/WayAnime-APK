/* الصفحة الرئيسية المخصصة للهاتف (تُستدعى من arHome في renderer.js داخل تطبيق الأندرويد فقط)
   الترتيب: شريط أقسام ثابت ← متابعة المشاهدة ← مميّز (سحب أفقي) ← صفوف أفقية ← التصنيفات
   لإخفاء قسم «المميّز» غيّر MH_FEATURED إلى false. */
(function () {
  'use strict';
  const MH_FEATURED = true;
  const FEAT_N = 6;      // عدد الأنميات في «المميّز»
  const RANK_N = 10;     // عدد الأنميات في صف «الأعلى تقييماً»
  const DUB_N = 200;     // عدد المدبلج في الصف
  const CONT_N = 10;     // عدد الأنميات في «متابعة المشاهدة»

  const ICON_PLAY = svg('<path d="M7 4.5v15l13-7.5z"/>');
  const ICON_RETRY = svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>');
  const ICON_RESUME = svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>');
  const ICON_STAR = '<svg class="i" viewBox="0 0 24 24"><polygon fill="currentColor" stroke="none" points="12 3 14.9 9 21.5 9.8 16.6 14.3 17.9 21 12 17.7 6.1 21 7.4 14.3 2.5 9.8 9.1 9"/></svg>';

  // الأقسام بالترتيب: مفتاح القسم + عنوانه (من HOME_ROWS) + أيقونة
  // أقسام إضافية خاصة بالرئيسية: آخر الحلقات + آخر المانجا
  const EXTRA = {
    LATEST: { sec: 'LATEST', title: 'آخر الحلقات', icon: () => CHIP_ICONS.latest, load: async () => {
      const [a, w, sd] = await Promise.all([a4LatestPage(1).catch(() => []), witLatestPage(1).catch(() => []), sdLatestPage(1).catch(() => [])]);
      return dedupe([...a, ...w, ...sd], newSeen()).slice(0, 24);
    } },
    SUB: { sec: 'SUB', title: 'مترجم', icon: () => CHIP_ICONS.latest, load: async () => {
      const [af, a4, wt] = await Promise.all([
        window.api.ar.list({ limit: 80, from: 0, filterType: 'SORT', filterData: 'POPULARITY', type: 'SERIES' }).catch(() => []),
        a4SubPage(1).catch(() => []), witSubPage(1).catch(() => [])
      ]);
      return dedupe(mixLists([af, a4, wt]), newSeen()).slice(0, 120);
    } },
    DUB: { sec: 'DUB', title: 'مدبلج', icon: () => CHIP_ICONS.DUB, load: async () => {     // كل المصادر: Stardima + Animeify + WitAnime + Anime4up
      const [sd, af, wt, a4] = await Promise.all([
        window.api.sd.catalog({ type: 'series', skip: 0, limit: 40 }).then((l) => (l || []).map(sdToM)).catch(() => []),
        window.api.ar.list({ filterType: 'SEARCH', filterData: 'مدبلج', type: 'SERIES', limit: 40, from: 0 }).catch(() => []),
        witDub().catch(() => []),
        a4DubPage(1).catch(() => [])
      ]);
      return dedupe(mixLists([sd, af, wt, a4]), newSeen()).slice(0, DUB_N);
    } },
    MANGA: { sec: 'MANGA', kind: 'manga', title: 'آخر المانجا', icon: () => CHIP_ICONS.MANGA, load: async () => {
      const [md, ml] = await Promise.allSettled([mgApi(mgQuery(0)).then((r) => (r.data || []).map(mgMap)), mlkList(1)]);
      const lists = [md, ml].map((x) => (x.status === 'fulfilled' ? x.value : []));
      if (!lists[0].length && !lists[1].length) throw new Error('manga');
      const seen = new Set();
      return mixLists(lists).filter((m) => (seen.has(m.id) ? false : seen.add(m.id))).slice(0, 24);
    } }
  };
  const rowOf = (sec) => EXTRA[sec] || HOME_ROWS.find((r) => r.sec === sec);
  const iconOf = (s) => (EXTRA[s] ? EXTRA[s].icon() : CHIP_ICONS[s]);
  const ORDER = ['LATEST', 'POPULARITY', 'HIGHEST_RATE', 'AIRING', 'SUB', 'DUB', 'MANGA'];

  const posterOf = (m) => esc(m.poster || phSvg(m.name));
  const needOf = (m) => (m.poster ? '' : ' data-need="1"');

  /* بطاقة صغيرة داخل الصف */
  function miniCard(m, extra, kind) {
    if (kind === 'manga') {
      const st = mgStatus[m.status] ? `<em class="mc-ep">${esc(mgStatus[m.status])}</em>` : '';
      return `<div class="mc" role="button" tabindex="0" data-mid="${esc(m.id)}"><span class="mc-p"><img loading="lazy" src="${esc(m.poster ? mgImg(m.poster) : phSvg(m.name))}"${m.poster ? '' : ' data-need="1"'} alt="">${st}</span><span class="mc-t">${esc(m.name)}</span></div>`;
    }
    arCache.set(m.id, m);
    const ep = m.lastEp ? `<em class="mc-ep">ح${esc(m.lastEp)}</em>` : '';
    const nw = newIds.has(m.id) ? '<em class="mc-new">جديد</em>' : '';
    const sc = arOk(m.score) ? `<b class="mc-sc">${ICON_STAR}${esc(m.score)}</b>` : '';
    return `<div class="mc" role="button" tabindex="0" data-id="${esc(m.id)}"><span class="mc-p"><img loading="lazy" src="${posterOf(m)}"${needOf(m)} alt="">${ep}${nw}${sc}${extra || ''}</span><span class="mc-t">${esc(m.name)}</span></div>`;
  }

  const skeleton = (n) => Array.from({ length: n }, () => '<div class="mc sk"><span class="mc-p"></span><span class="mc-t">&nbsp;</span></div>').join('');

  /* صف «الأعلى تقييماً» بأرقام الترتيب */
  function rankCard(m, i) {
    return `<div class="mr"><span class="mr-n" aria-hidden="true">${i + 1}</span>${miniCard(m)}</div>`;
  }

  /* شريحة «المميّز» */
  function slide(m) {
    arCache.set(m.id, m);
    const meta = [arOk(m.type) ? esc(m.type) : '', arOk(m.score) ? `<b class="mh-sc">${ICON_STAR}${esc(m.score)}</b>` : ''].filter(Boolean).join('<i></i>');
    const gen = arOk(m.genres) ? String(m.genres).split(',').slice(0, 3).map((g) => `<span>${esc(g.trim())}</span>`).join('') : '';
    const syn = arOk(m.synopsis) ? `<p class="mh-sd">${esc(m.synopsis)}</p>` : '';
    return `<article class="mh-slide" role="button" tabindex="0" data-id="${esc(m.id)}">
      <img class="mh-sbg" src="${posterOf(m)}"${needOf(m)} alt="" aria-hidden="true">
      <img class="mh-sp" src="${posterOf(m)}"${needOf(m)} alt="">
      <div class="mh-si"><h3>${esc(m.name)}</h3>${meta ? `<div class="mh-sm">${meta}</div>` : ''}${gen ? `<div class="mh-sg">${gen}</div>` : ''}${syn}<span class="mh-go">${ICON_PLAY}شاهد الآن</span></div></article>`;
  }

  /* متابعة المشاهدة: من سجل resume المحفوظ */
  function continueItems() {
    const R = resumeAll(), items = Object.values(R.items || {});
    return items.filter((r) => r && r.id && r.d > 0).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, CONT_N);
  }
  function contCard(r) {
    const pct = Math.max(3, Math.min(100, Math.round((r.t / r.d) * 100)));
    const left = Math.max(1, Math.round((r.d - r.t) / 60));
    const p = r.poster || phSvg(r.name);
    return `<div class="mc" role="button" tabindex="0" data-resume="${esc(r.id)}"><span class="mc-p"><img loading="lazy" src="${esc(p)}"${r.poster ? '' : ' data-need="1"'} alt=""><em class="mc-ep">ح${esc(r.num)}</em><span class="mc-play">${ICON_PLAY}</span><span class="mc-pg"><i style="width:${pct}%"></i></span></span><span class="mc-t">${esc(r.name)}</span><span class="mc-s">${left} د متبقية</span></div>`;
  }

  /* «عرض الكل»: نفتح القائمة الكاملة ونكمل تحميل الصفحات تلقائياً حتى النهاية (حدّ أقصى 12 دفعة) */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function loadAllAnime(open) {
    await open();
    const tk = AF.token;
    for (let i = 0; i < 40; i++) {
      while (AF.busy && AF.token === tk) await sleep(250);
      if (AF.done || AF.token !== tk || !document.getElementById('agrid')) break;
      await arMore();
    }
  }
  async function loadAllManga() {
    openManga();
    const nav = MG.nav;
    for (let i = 0; i < 10; i++) {
      await sleep(400);
      while (MG.busy && MG.nav === nav) await sleep(300);
      if (MG.done || MG.nav !== nav || !document.getElementById('mgrid')) break;
      await mgMore();
    }
  }

  function secHead(icon, title, sec) {
    return `<div class="mh-hd"><h3>${icon || ''}<span>${esc(title)}</span></h3>${sec ? `<button type="button" class="mh-all" data-sec="${sec}"><span>عرض الكل</span>${HOME_ARR}</button>` : ''}</div>`;
  }

  window.waMobileHome = function (alive) {
    const cont = continueItems();
    const secs = [];                                   // [id, chipLabel, icon]
    if (cont.length) secs.push(['cont', 'متابعة', ICON_RESUME]);
    ORDER.forEach((s) => { const r = rowOf(s); if (r) secs.push([s, r.title, iconOf(s)]); });
    secs.push(['genres', 'التصنيفات', GENRE_ALL]);

    const nav = `<nav class="mh-nav" aria-label="أقسام الرئيسية">${secs.map(([id, t, ic], i) => `<button type="button" class="mh-chip${i ? '' : ' on'}" data-go="${id}">${ic}<span>${esc(t)}</span></button>`).join('')}</nav>`;

    const featBox = MH_FEATURED ? `<section class="mh-fs"><div class="mh-feat" id="mh-feat"><div class="mh-slide sk"></div></div><div class="mh-dots" id="mh-dots"></div></section>` : '';
    const contBox = cont.length ? `<section class="mh-sec" id="mh-cont">${secHead(ICON_RESUME, 'متابعة المشاهدة')}<div class="mh-rail">${cont.map(contCard).join('')}</div></section>` : '';
    const rows = ORDER.map((s) => {
      const r = rowOf(s); if (!r) return '';
      const rank = s === 'HIGHEST_RATE' ? ' mh-rank' : '';
      return `<section class="mh-sec" id="mh-${s}">${secHead(iconOf(s), r.title, s)}<div class="mh-rail${rank}" id="hr-${s}">${skeleton(5)}</div></section>`;
    }).join('');
    const genBox = `<section class="mh-sec" id="mh-genres">${secHead(GENRE_ALL, 'التصنيفات')}<div class="mh-gen">${AR_GENRES.map(([n, v]) => `<button type="button" class="mh-g" data-g="${esc(v)}">${GENRE_ICONS[v] || GENRE_ALL}<span>${esc(n)}</span></button>`).join('')}</div></section>`;

    const bar = `<button type="button" class="mh-search" data-search="1" aria-label="بحث">${svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>')}<span>ابحث عن أنمي…</span></button>`;
    view.innerHTML = `<div class="mh">${nav}${featBox}${contBox}${rows}${genBox}</div>`;
    view.scrollTop = 0;

    /* ----- الأحداث ----- */
    const root = view.querySelector('.mh');
    const open = (el) => {
      if (el.dataset.resume) { const r = (resumeAll().items || {})[el.dataset.resume]; if (r) { resumeGo(r); return; } }
      if (el.dataset.mid) { openMangaInfo(el.dataset.mid); return; }
      if (el.dataset.id) openMeta('ar', el.dataset.id);
    };
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-search],[data-id],[data-mid],[data-resume],[data-sec],[data-g],[data-go],[data-retry]'); if (!t || !root.contains(t)) return;
      if (t.dataset.search) { openSearch('bar', t); return; }
      if (t.dataset.go) { const el = document.getElementById('mh-' + t.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (t.dataset.sec === 'LATEST') { loadAllAnime(() => arLatest()); return; }
      if (t.dataset.sec === 'MANGA') { loadAllManga(); return; }
      if (t.dataset.sec) { loadAllAnime(() => { Object.assign(AF, { sec: t.dataset.sec, genre: '', type: 'SERIES' }); return arLoadCatalog(); }); return; }
      if (t.dataset.g) { loadAllAnime(() => { Object.assign(AF, { sec: 'latest', genre: t.dataset.g, type: 'SERIES' }); return arLoadCatalog(); }); return; }
      if (t.dataset.retry) { fill(t.dataset.retry, true); return; }
      open(t);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const t = e.target.closest('.mc,.mh-slide'); if (t) { e.preventDefault(); open(t); }
    });

    /* القسم النشط في الشريط العلوي أثناء التمرير */
    if (window.IntersectionObserver) {
      const chips = [...root.querySelectorAll('.mh-chip')];
      const io = new IntersectionObserver((es) => {
        if (!document.body.contains(root)) { io.disconnect(); return; }
        es.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = en.target.id.replace('mh-', '');
          chips.forEach((c) => c.classList.toggle('on', c.dataset.go === id));
          const on = chips.find((c) => c.dataset.go === id);
          if (on) { const nv = root.querySelector('.mh-nav'); nv.scrollTo({ left: on.offsetLeft - nv.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' }); }
        });
      }, { root: view, rootMargin: '-30% 0px -60% 0px' });
      secs.forEach(([id]) => { const el = document.getElementById('mh-' + id); if (el) io.observe(el); });
    }

    /* ----- تحميل الصفوف: كل صف بوحدو ----- */
    const cache = {};
    const load = (s, force) => (cache[s] && !force ? cache[s] : (cache[s] = Promise.resolve().then(() => rowOf(s).load()).then((l) => l || [])));

    async function fill(s, force) {
      const box = document.getElementById('hr-' + s); if (!box) return;
      if (force) box.innerHTML = skeleton(5);
      let list = null;
      try { list = await load(s, force); } catch (e) { list = null; }
      if (!alive() || !document.body.contains(box)) return;
      if (list === null || !list.length) {
        box.innerHTML = `<div class="mh-msg"><span>${list === null ? 'تعذّر تحميل هذا القسم.' : 'لا توجد نتائج حالياً.'}</span><button type="button" class="mh-retry" data-retry="${s}">${ICON_RETRY}<span>إعادة المحاولة</span></button></div>`;
        return;
      }
      box.innerHTML = s === 'HIGHEST_RATE' ? list.slice(0, RANK_N).map(rankCard).join('') : list.map((m) => miniCard(m, '', rowOf(s).kind)).join('');
    }
    ORDER.forEach((s) => { if (rowOf(s)) fill(s); });

    /* ----- «المميّز»: من أول قائمة (الأكثر شعبية) ----- */
    if (MH_FEATURED) {
      load('POPULARITY').then((list) => {
        if (!alive()) return;
        const fb = document.getElementById('mh-feat'), db = document.getElementById('mh-dots'); if (!fb) return;
        const items = list.filter((m) => m.poster).slice(0, FEAT_N);
        if (!items.length) { const fs = fb.closest('.mh-fs'); if (fs) fs.remove(); return; }
        fb.innerHTML = items.map(slide).join('');
        db.innerHTML = items.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('');
        const slides = [...fb.children], dots = [...db.children];
        const step = () => (slides.length > 1 ? Math.abs(slides[1].offsetLeft - slides[0].offsetLeft) || fb.clientWidth : fb.clientWidth);
        let raf = 0;
        fb.addEventListener('scroll', () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const i = Math.max(0, Math.min(slides.length - 1, Math.round(Math.abs(fb.scrollLeft) / step())));
            dots.forEach((d, k) => d.classList.toggle('on', k === i));
          });
        }, { passive: true });
      }).catch(() => { const fs = document.querySelector('.mh-fs'); if (fs) fs.remove(); });
    }
  };
})();
