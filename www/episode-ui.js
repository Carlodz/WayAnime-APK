/* واجهة السيرفرات (تفتح عند الضغط على حلقة) + نافذة الحلقات الجانبية داخل المشغّل — Android */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ARROW = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const LIST = '<svg class="i" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
  const XI = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ========== 1) شاشة السيرفرات ========== */
  function closeEvs() {
    const s = $('#evs'); if (s) s.remove();
    document.body.classList.remove('evs-open');
  }
  // كترجع العنصر اللي غادي تتعمر فيه أزرار السيرفرات
  window.waEpScreen = function (m, e) {
    let s = $('#evs');
    if (!s) {
      s = document.createElement('div'); s.id = 'evs'; s.setAttribute('dir', 'rtl');
      s.innerHTML = '<div class="evbg"></div><div class="evh"><button type="button" class="evback" aria-label="رجوع">' + ARROW + '</button><div class="evt"><b></b><small></small></div></div><div class="evbody"></div>';
      document.body.appendChild(s);
      document.body.classList.add('evs-open');
      $('.evback', s).onclick = closeEvs;
    }
    const bg = $('.evbg', s);
    bg.style.backgroundImage = m.poster ? 'url("' + String(m.poster).replace(/"/g, '%22') + '")' : 'none';
    $('.evt b', s).textContent = m.name || '';
    $('.evt small', s).textContent = 'الحلقة ' + (e && e.num != null ? e.num : '') + ' · اختر السيرفر';
    const body = $('.evbody', s);
    body.innerHTML = '';
    body.scrollTop = 0;
    return body;
  };
  window.waCloseEpScreen = closeEvs;

  /* ========== 2) نافذة الحلقات الجانبية داخل المشغّل ========== */
  const epsData = () => [...document.querySelectorAll('.eps button')];

  function closePanel(pl) { if (pl) pl.classList.remove('pep-open'); }

  function fill(pl) {
    const btns = epsData();
    const body = $('.pepb', pl);
    $('.peph span', pl).textContent = btns.length + ' حلقة';
    body.innerHTML = btns.map((b, i) => {
      const num = b.textContent.trim(), on = b.classList.contains('on'), miss = b.classList.contains('miss'), seen = b.classList.contains('seen');
      return '<button type="button" class="pepi' + (on ? ' on' : '') + (miss ? ' miss' : '') + (seen && !on ? ' seen' : '') + '" data-i="' + i + '"' + (miss ? ' disabled' : '') + '>' +
        '<span class="pepn">' + esc(num) + '</span><span class="pept">الحلقة ' + esc(num) + '</span>' +
        '<em>' + (on ? 'يعمل الآن' : miss ? 'غير متوفرة' : seen ? 'شوهدت' : '') + '</em></button>';
    }).join('');
    body.querySelectorAll('.pepi').forEach((it) => {
      it.onclick = () => {
        const b = epsData()[it.dataset.i]; if (!b) return;
        if (b.classList.contains('on')) { closePanel(pl); return; }
        const v = $('video', pl); if (v) v.pause();
        const pm = $('#pmode', pl); if (pm) pm.textContent = 'جارٍ تحميل الحلقة…';
        window.__autoNext = { t: window.__lastSrc || '', pl };   // المشغّل كيبقى مفتوح حتى تجهز الحلقة الجديدة (نفس آلية «التالي»)
        closePanel(pl);
        b.click();
        setTimeout(() => { if ($('#pl') === pl && window.closePlayer) window.closePlayer(); }, 40000);
      };
    });
  }

  function openPanel(pl) {
    fill(pl);
    pl.classList.add('pep-open');
    const on = $('.pepi.on', pl); if (on) on.scrollIntoView({ block: 'center' });
  }

  function inject() {
    const pl = $('#pl'); if (!pl || $('#pep', pl)) return;
    const top = $('.ptop', pl), box = $('.pbox', pl); if (!top || !box) return;
    if (!epsData().length) return;   // تشغيل بلا حلقات (ملف/رابط) → ما كاينش زر
    const btn = document.createElement('button');
    btn.id = 'pep'; btn.type = 'button'; btn.title = 'الحلقات'; btn.innerHTML = LIST;
    top.insertBefore(btn, $('#pfs', pl) || $('#pb', pl));
    const panel = document.createElement('div');
    panel.className = 'pepw'; panel.setAttribute('dir', 'rtl');
    panel.innerHTML = '<div class="pepbg"></div><aside class="pepl"><div class="peph"><b>الحلقات</b><span></span><button type="button" class="pepx" aria-label="إغلاق">' + XI + '</button></div><div class="pepb"></div></aside>';
    box.appendChild(panel);
    btn.onclick = (e) => { e.stopPropagation(); pl.classList.contains('pep-open') ? closePanel(pl) : openPanel(pl); };
    $('.pepbg', panel).onclick = () => closePanel(pl);
    $('.pepx', panel).onclick = () => closePanel(pl);
  }
  new MutationObserver(() => { if ($('#pl') && !$('#pep')) inject(); }).observe(document.body, { childList: true });

  /* زر الرجوع / Escape: نسدّو النافذة الجانبية أولاً، ثم المشغّل، ثم شاشة السيرفرات */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const pl = $('#pl');
    if (pl && pl.classList.contains('pep-open')) { e.stopImmediatePropagation(); e.preventDefault(); closePanel(pl); return; }
    if (!pl && $('#evs')) { e.stopImmediatePropagation(); e.preventDefault(); closeEvs(); }
  }, true);
})();
