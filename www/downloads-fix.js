/* إصلاح تحميل الحلقات: يعمل مع أي سيرفر، ويفتح الرابط المباشر في المتصفح/مدير التنزيلات بدون أي تعديل native.
   يُحمَّل بعد downloads.js فيحلّ محلّه في: أيقونة السيرفر، زر «تحميل الحلقة»، ومعالج الضغط. */
(function () {
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>';
  window.waDlIcon = ICON;
  var say = function (m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} };
  var isHls = function (u) { return /\.m3u8(\?|$)/i.test(u || ''); };
  var isFile = function (u) { return /\.(mp4|mkv|webm|mov)(\?|$)/i.test(u || ''); };
  var host = function (u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  var withTimeout = function (p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); };

  /* يرجّع رابط تحميل مباشر للسيرفر (أو null) */
  async function direct(b) {
    var u;
    try { if (b.dlf) { u = await withTimeout(Promise.resolve(b.dlf()), 20000); if (u) return u; } } catch (e) {}
    if (b.du && !isHls(b.du)) return b.du;
    var src = b.u || b.du; if (!src) return null;
    try {
      if (/mediafire\./i.test(host(src)) && window.api && window.api.ar && window.api.ar.direct) { u = await withTimeout(window.api.ar.direct(src).catch(function () { return null; }), 15000); if (u) return u; }
      if (isFile(src)) return src;
      if (window.api && window.api.resolveHost) { var r = await withTimeout(window.api.resolveHost(src).catch(function () { return null; }), 20000); if (r && r.url && !isHls(r.url)) return r.url; }
    } catch (e) {}
    return null;
  }
  function save(url) {
    try { if (window.api && window.api.openExternal) { window.api.openExternal(url); return true; } } catch (e) {}
    try { window.open(url, '_system'); return true; } catch (e) {}
    try { var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); return true; } catch (e) {}
    return false;
  }
  function fallbackPage(b) {   // السيرفر ما عندوش رابط مباشر: نفتحو صفحتو (غالباً فيها زر تحميل)
    var u = b && (b.u || b.du); if (!u) return false;
    say('لا يوجد رابط مباشر لهذا السيرفر — سنفتح صفحته في المتصفح للتحميل منها');
    return save(u);
  }
  async function dlOne(b) {
    say('جارٍ تجهيز رابط التحميل…');
    var u = await direct(b);
    if (u) { say('بدأ التحميل — تابعه في إشعارات التنزيل أو المتصفح'); return save(u); }
    if (!fallbackPage(b)) say('تعذّر التحميل من هذا السيرفر — جرّب سيرفرًا آخر');
  }
  async function dlAuto(btns) {
    var c = (btns || []).filter(function (b) { return b && !b.dl && (b.u || b.du || b.dlf); });
    if (!c.length) { say('لا توجد سيرفرات قابلة للتحميل لهذه الحلقة'); return; }
    // الأقرب للتحميل المباشر أولاً: روابط ملفات/Mediafire/dlf ثم الباقي
    var rank = function (b) { return b.dlf ? 0 : (b.du && isFile(b.du)) ? 0 : /mediafire/i.test(host(b.u || b.du || '')) ? 1 : 2; };
    c = c.slice().sort(function (a, b) { return rank(a) - rank(b); }).slice(0, 12);
    say('جارٍ البحث عن أول سيرفر يسمح بالتحميل…');
    for (var i = 0; i < c.length; i++) {
      var u = await direct(c[i]);
      if (u) { say('بدأ التحميل من ' + (host(u) || 'السيرفر') + ' — تابعه في إشعارات التنزيل'); return save(u); }
    }
    say('لم نجد رابط تحميل مباشر — سنفتح صفحة أول سيرفر'); if (!fallbackPage(c[0])) say('تعذّر التحميل');
  }
  window.waDlEntry = function (btns) {
    return { t: '@@dl@@ تحميل الحلقة', dl: true, f: function () { return dlAuto(window.__srvBtns || btns); } };
  };
  window.waDownloadDirect = direct;

  function onTap(e) {
    var s = e.target && e.target.closest && e.target.closest('.sdl'); if (!s) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var b = (window.__srvBtns || [])[+s.dataset.di]; if (!b) { say('تعذّر تحديد السيرفر'); return; }
    if (s.dataset.busy) return; s.dataset.busy = '1';
    Promise.resolve(dlOne(b)).catch(function () { say('فشل التحميل — جرّب سيرفرًا آخر'); }).then(function () { delete s.dataset.busy; });
  }
  document.addEventListener('click', onTap, true);
  document.addEventListener('keydown', onTap, true);
})();
