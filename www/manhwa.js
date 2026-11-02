/* WayAnime — manhwa.js : إضافات صغيرة للستايل الجديد (ما كيبدّل منطق التطبيق، غير كيزيد عناصر فـ الواجهة)
   1) حبوب التصنيفات فـ الهيرو   2) صف «تابع المشاهدة» من سجل المشاهدة   3) عنوان «استكشف» */
(function () {
  const view = document.getElementById('view');
  if (!view) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem('way:' + k)) ?? d; } catch { return d; } };
  const AR = /[\u0600-\u06FF]/;
  const PLAY = '<svg viewBox="0 0 24 24"><polygon points="8 5 19 12 8 19"/></svg>';

  /* 1) الهيرو: النص «اسم إنجليزي · تصنيف · تصنيف» كيولي حبوب (التصنيفات العربية فقط) */
  function pills() {
    document.querySelectorAll('.hbody .sub:not([data-p])').forEach((el) => {
      el.dataset.p = '1';
      let parts = el.textContent.split('·').map((x) => x.trim()).filter(Boolean);
      const ar = parts.filter((x) => AR.test(x));
      parts = ar.length ? ar : parts.length > 1 ? parts.slice(1) : parts;
      if (!parts.length) return el.remove();
      el.innerHTML = parts.slice(0, 3).map((x) => '<span class="pill">' + esc(x) + '</span>').join('');
    });
  }

  /* 2) + 3) صف «تابع المشاهدة» وعنوان القسم فوق الفلاتر */
  function home() {
    const bar = view.querySelector('.sec > .fbar');
    if (!bar || view.querySelector('.mrow') || view.querySelector('.mh')) return;
    const box = bar.parentNode;
    const hist = read('hist', []).filter((x) => x && x.id && x.poster).slice(0, 10);
    if (hist.length) {
      const seen = read('seen', {});
      const row = document.createElement('section');
      row.className = 'mrow';
      row.innerHTML = '<div class="mh"><h3>تابع المشاهدة</h3></div><div class="mscroll">' + hist.map((x) => {
        const n = (seen[x.id] || []).length;
        const pr = x.ep ? (read('prog', {})[x.id + '#' + x.ep] || null) : null;
        const mm = pr && pr.t > 15 ? Math.floor(pr.t / 60) + ':' + String(pr.t % 60).padStart(2, '0') : '';
        return '<div class="cw" tabindex="0" data-id="' + esc(x.id) + '" data-type="' + esc(x.type || 'ar') + '" data-ep="' + esc(x.ep || '') + '">'
          + '<img loading="lazy" src="' + esc(x.poster) + '" alt=""><span class="cwp">' + PLAY + '</span>'
          + '<div class="cwt"><b>' + esc(x.name) + '</b><small>' + (x.ep ? 'الحلقة ' + esc(x.ep) + (mm ? ' · ' + mm : '') : n ? 'شاهدت ' + n + ' حلقة' : 'ابدأ المشاهدة') + '</small></div></div>';
      }).join('') + '</div>';
      const open = (c) => {
        if (!c) return;
        if (c.dataset.ep && c.dataset.type === 'ar' && typeof openAr === 'function') return openAr(c.dataset.id, c.dataset.ep, { resume: true });
        if (typeof openMeta === 'function') openMeta(c.dataset.type, c.dataset.id);
      };
      row.addEventListener('click', (e) => open(e.target.closest('.cw')));
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(e.target.closest('.cw')); });
      box.insertBefore(row, bar);
    }
    const h = document.createElement('div');
    h.className = 'mh';
    h.innerHTML = '<h3>استكشف</h3>';
    box.insertBefore(h, bar);
  }

  /* الضغط على نص الهيرو كيفتح الأنمي (بحال الزر) */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.hbody');
    if (b && !e.target.closest('.hbtn')) { const btn = b.querySelector('.hbtn'); if (btn) btn.click(); }
  });

  let queued = false;
  const run = () => { queued = false; pills(); home(); };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } }).observe(view, { childList: true, subtree: true });
  run();
})();
