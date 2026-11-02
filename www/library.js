/* المكتبة الكاملة: زحف تدريجي في الخلفية لكل أنمي Animeify (مسلسلات/أفلام/OVA/خاصة)، يُحفظ على الهاتف ويُحدَّث أسبوعياً.
   + صفحة «حالة المصادر» (أي نطاق يتعطل يتوقف عنه التطبيق تلقائياً). */
(function () {
  var KEY = 'wa_lib2', TYPES = ['SERIES', 'MOVIE', 'OVA', 'SPECIAL'], WEEK = 7 * 864e5;
  var db = { v: 2, t: {} }, idx = {}, dirty = 0;
  try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.v === 2) db = j; } catch (e) {}
  TYPES.forEach(function (t) { db.t[t] = db.t[t] || { off: 0, done: false, at: 0, rows: [] }; });
  function toObj(r) { return { id: r[0], name: r[1], nameEn: r[2], poster: r[3], genres: r[4], score: r[5], episodes: r[6], status: r[7], season: r[8], type: r[9], logo: '', synopsis: '' }; }
  function reindex(t) { idx[t] = {}; db.t[t].rows.forEach(function (r, i) { idx[t][r[0]] = i; }); }
  TYPES.forEach(reindex);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); dirty = 0; return true; } catch (e) { return false; } }
  var L = window.WALIB = {
    running: false,
    count: function (t) { return (db.t[t] || { rows: [] }).rows.length; },
    total: function () { return TYPES.reduce(function (a, t) { return a + L.count(t); }, 0); },
    isDone: function (t) { return !L.running || db.t[t].done; },
    get: function (t) { return db.t[t].rows.map(toObj); }
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function add(t, m) {
    var row = [String(m.id), m.name || '', m.nameEn || '', m.poster || '', m.genres || '', m.score || '', m.episodes || '', m.status || '', m.season || '', m.type || t];
    if (!row[0] || !row[1]) return false;
    var i = idx[t][row[0]];
    if (i == null) { idx[t][row[0]] = db.t[t].rows.length; db.t[t].rows.push(row); return true; }
    db.t[t].rows[i] = row; return false;
  }
  async function crawl(t) {
    var st = db.t[t], fails = 0;
    if (st.done && Date.now() - st.at > WEEK) { st.off = 0; st.done = false; }     // تحديث أسبوعي: نعاود المرور ونحدّث/نضيف
    while (!st.done) {
      var r;
      try { r = await window.api.ar.list({ filterType: 'SORT', filterData: 'POPULARITY', type: t, from: st.off, limit: 90 }); fails = 0; }
      catch (e) { if (++fails >= 3) return false; await sleep(1500 * fails); continue; }
      if (!r || !r.length) { st.done = true; st.at = Date.now(); break; }
      r.forEach(function (m) { add(t, m); });
      st.off += r.length; dirty++;
      if (r.length < 10) { st.done = true; st.at = Date.now(); }
      if (dirty >= 3 || st.done) { if (!save()) return false; }
      document.dispatchEvent(new CustomEvent('walib', { detail: { t: t, n: st.rows.length } }));
      await sleep(250);
    }
    save(); return true;
  }
  L.sync = async function () {
    if (L.running) return; L.running = true;
    try { for (var i = 0; i < TYPES.length; i++) { if (!(await crawl(TYPES[i]))) break; } }
    finally { L.running = false; save(); document.dispatchEvent(new CustomEvent('walib', { detail: { done: true } })); }
  };
  // نبدأ بعد ما تفتح الصفحة الأولى (ما نزاحم التحميل)
  setTimeout(function () { if (window.api && window.api.ar) L.sync(); }, 9000);

  /* ===== مدير المصادر الأوتوماتيكي =====
     يفحص المصادر وحده: يختار أسرع نطاق شغّال لـ Anime4up وWitAnime، يوقف المعطّل ويعيد فحصه، ويتجاهل Animeify إذا تعطل.
     Anime4up هو المصدر الأول فـ كل الترتيبات. بلا أي أزرار. */
  var ICON = '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0116 0M7.5 12a4.5 4.5 0 019 0M12 16h.01"/></svg>';
  window.waSrcIcon = ICON;
  var SKEY = 'wa_srcstate', ST = {};
  try { ST = JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) {}
  var saveST = function () { try { localStorage.setItem(SKEY, JSON.stringify(ST)); } catch (e) {} };
  var ORDER = [['a4u', 'Anime4up', 'المصدر الأول'], ['afy', 'Animeify', ''], ['wit', 'WitAnime', ''], ['sd', 'Stardima (مدبلج)', ''], ['a3r', 'Anime3rb', '']];
  var timeout = function (ms) { return new Promise(function (_, rj) { setTimeout(function () { rj(new Error('timeout')); }, ms); }); };
  var checking = false, timer = 0;
  window.WASRC = {
    dead: function (k) { var s = ST[k]; return !!(s && s.dead && Date.now() - s.at < 20 * 60e3); },
    state: function () { return ST; }
  };
  async function probeHost(u) {
    var h; try { h = new URL(u).host; } catch (e) { return null; }
    if (window.__srcReset) window.__srcReset(h);                               // نتجاوز الإيقاف المؤقت لنختبر فعلاً
    var t0 = Date.now();
    try { var t = await Promise.race([window.api.html(u), timeout(8000)]); if (t && t.length > 500) return { host: h, url: u, ms: Date.now() - t0 }; } catch (e) {}
    return { host: h, url: u, ms: 0, bad: true };
  }
  async function checkGroup(key, hosts, apply) {
    var res = (await Promise.all(hosts.map(probeHost))).filter(Boolean), good = res.filter(function (r) { return !r.bad; }).sort(function (a, b) { return a.ms - b.ms; });
    res.forEach(function (r) { if (r.bad && window.__srcBan) window.__srcBan(r.host, 10); });   // النطاق المعطل ما نطلبوش 10 دقائق
    if (good.length) { try { apply(good[0].url); } catch (e) {} ST[key] = { dead: false, host: good[0].host, ms: good[0].ms, alive: good.length, total: res.length, at: Date.now() }; }
    else ST[key] = { dead: true, host: '', ms: 0, alive: 0, total: res.length, at: Date.now() };
  }
  async function checkAll() {
    if (checking || !window.api) return; checking = true;
    try {
      var jobs = [];
      if (typeof A4U_HOSTS !== 'undefined') jobs.push(checkGroup('a4u', A4U_HOSTS, function (u) { a4uBase = u; try { store.set('a4uHost', u); } catch (e) {} }));
      if (typeof WIT_HOSTS !== 'undefined') jobs.push(checkGroup('wit', WIT_HOSTS, function (u) { WIT = u; try { store.set('witHost', u); } catch (e) {} }));
      jobs.push((async function () {
        var t0 = Date.now();
        try { var r = await Promise.race([window.api.ar.list({ filterType: 'SORT', filterData: 'POPULARITY', type: 'SERIES', from: 0, limit: 1 }), timeout(12000)]); ST.afy = { dead: !(r && r.length), host: 'Animeify API', ms: Date.now() - t0, alive: r && r.length ? 1 : 0, total: 1, at: Date.now() }; }
        catch (e) { ST.afy = { dead: true, host: 'Animeify API', ms: 0, alive: 0, total: 1, at: Date.now() }; }
      })());
      await Promise.all(jobs);
      // Stardima + Anime3rb: من واقع الاستعمال (القاطع + التعطيل التلقائي)
      var H = window.__srcHealth ? window.__srcHealth() : {}, sdh = Object.keys(H).filter(function (h) { return /stardima/i.test(h); });
      ST.sd = sdh.length ? { dead: sdh.every(function (h) { return H[h].until > Date.now(); }), host: sdh[0], ms: H[sdh[0]].ms || 0, alive: 1, total: sdh.length, at: Date.now() } : (ST.sd || null);
      saveST();
    } finally { checking = false; document.dispatchEvent(new CustomEvent('wasrc')); schedule(); }
  }
  function schedule() {
    clearTimeout(timer);
    var anyDead = Object.keys(ST).some(function (k) { return ST[k] && ST[k].dead; });
    timer = setTimeout(checkAll, anyDead ? 2 * 60e3 : 8 * 60e3);               // معطّل؟ نعيد الفحص كل دقيقتين، سليم؟ كل 8 دقائق
  }
  setTimeout(checkAll, 5000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { var last = Math.max.apply(null, [0].concat(Object.keys(ST).map(function (k) { return ST[k] ? ST[k].at : 0; }))); if (Date.now() - last > 5 * 60e3) checkAll(); }
  });

  /* ===== صفحة «حالة المصادر» (للعرض فقط — المدير شغّال لوحده) ===== */
  var css = document.createElement('style');
  css.textContent = '#srcPage{padding:6px var(--gut,14px) 90px;direction:rtl}#srcPage h2{margin:4px 0 6px;font-size:22px;font-weight:900}#srcPage .sub{color:var(--mute,#9a98b5);font-size:13px;margin-bottom:14px;line-height:1.8}' +
    '#srcPage .r{display:flex;align-items:center;gap:12px;background:var(--panel,#16122e);border:1px solid var(--line,#ffffff1a);border-radius:14px;padding:12px 14px;margin-bottom:9px}' +
    '#srcPage .r.first{border-color:#7b4dffaa;background:#7b4dff14}' +
    '#srcPage .n{width:26px;height:26px;border-radius:50%;background:#7b4dff33;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none}' +
    '#srcPage .d{width:10px;height:10px;border-radius:50%;background:#4ade80;flex:none}#srcPage .d.bad{background:#f87171}#srcPage .d.na{background:#8b89a3}' +
    '#srcPage .t{flex:1;min-width:0}#srcPage .t b{display:block;font-size:15px}#srcPage .t small{display:block;color:var(--mute,#9a98b5);font-size:12px;margin-top:2px;direction:ltr;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#srcPage .s{font-size:12.5px;color:#d9d6ee;white-space:nowrap}';
  document.head.appendChild(css);
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function draw() {
    var p = document.getElementById('srcPage'); if (!p) return;
    var off = {}; try { off = JSON.parse(localStorage.getItem('way:toolOff') || '{}'); } catch (e) {}
    var rows = ORDER.map(function (o, i) {
      var k = o[0], s = ST[k], cls = 'na', txt = 'قيد الفحص…', sub = '';
      if (k === 'a3r' && off.a3r > Date.now()) { cls = 'bad'; txt = 'موقوف تلقائيًا'; sub = 'محمي بـ Cloudflare — لا يعمل على أندرويد'; }
      else if (s) {
        if (s.dead) { cls = 'bad'; txt = 'لا يعمل — يُعاد فحصه تلقائيًا'; sub = s.total > 1 ? '0 من ' + s.total + ' نطاقات تعمل' : ''; }
        else { cls = ''; txt = 'يعمل · ' + (s.ms || 0) + ' ms'; sub = (s.total > 1 ? s.alive + ' من ' + s.total + ' نطاقات · ' : '') + s.host; }
      }
      return '<div class="r' + (i === 0 ? ' first' : '') + '"><span class="n">' + (i + 1) + '</span><i class="d ' + cls + '"></i><div class="t"><b>' + E(o[1]) + (o[2] ? ' · ' + o[2] : '') + '</b>' + (sub ? '<small>' + E(sub) + '</small>' : '') + '</div><span class="s">' + txt + '</span></div>';
    }).join('');
    p.innerHTML = '<h2>حالة المصادر</h2><div class="sub">المدير يعمل تلقائيًا: يفحص المصادر كل بضع دقائق، يختار أسرع نطاق، ويتوقف عن أي مصدر معطّل ثم يعيد فحصه وحده. الترتيب = الأولوية (Anime4up أولاً). المكتبة المحفوظة: ' + L.total() + ' أنمي.</div>' + rows;
  }
  window.openSources = function () {
    if (typeof view === 'undefined') return;
    try { setNav(null); } catch (e) {}
    document.body.classList.remove('dr-open', 'cb-open'); view.scrollTop = 0;
    view.innerHTML = '<div id="srcPage"></div>'; draw();
    if (Date.now() - (ST.a4u ? ST.a4u.at : 0) > 60e3) checkAll();
  };
  document.addEventListener('wasrc', draw); document.addEventListener('walib', function () { if (document.getElementById('srcPage')) draw(); });
})();
