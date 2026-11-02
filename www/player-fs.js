/* ملء الشاشة فـ المشغّل (Android): كيحتل الهاتف كامل، كيدور الشاشة أفقياً، وكيخبّي شريط الحالة.
   Element.requestFullscreen ما كيخدمش مزيان فـ WebView، لهذا كنستعملو CSS (class wa-fs) + إضافات Capacitor إلا كانو. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const plug = (n) => { const C = window.Capacitor; return C && C.Plugins && C.Plugins[n]; };
  let on = false;

  async function native(enter) {
    // 1) الإضافة الأصلية ديالنا (Immersive): أفقي + تخبية شريط الحالة وأزرار التنقل + الـ notch
    try {
      const C = window.Capacitor;
      if (C && C.isNativePlatform && C.isNativePlatform() && C.nativePromise) { await C.nativePromise('Immersive', enter ? 'enter' : 'exit', {}); return; }
    } catch {}
    // 2) احتياط: إضافات Capacitor الرسمية
    try { const so = plug('ScreenOrientation'); if (so) { if (enter) await so.lock({ orientation: 'landscape' }); else await so.unlock(); } } catch {}
    try { const sb = plug('StatusBar'); if (sb) { if (enter) await sb.hide(); else await sb.show(); } } catch {}
  }
  function set(v) {
    const pl = $('#pl'); if (v && !pl) return;
    on = v;
    if (pl) pl.classList.toggle('wa-fs', v);
    document.body.classList.toggle('wa-fs', v);
    native(v);
    zoomSoon();
  }
  // زر «تكبير الفيديو»: contain (كامل الصورة) ↔ cover (كيعمر الشاشة بلا حواف سوداء)
  let zoom = false; try { zoom = localStorage.getItem('wa-zoom') === '1'; } catch {}
  const ZI = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 12h8M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l-2 2"/></svg>';
  // التكبير (تمطيط) بـ transform:scale بدل object-fit — فـ WebView ديال Android تبديل object-fit كيخلي الفيديو يولي أسود (overlay ديال الـ GPU)
  function applyZoom() {
    const pl = $('#pl'); if (!pl) return;
    pl.classList.toggle('wa-zoom', zoom);
    const v = $('video', pl); if (!v) return;
    const cw = v.clientWidth, ch = v.clientHeight;
    if (!zoom || !v.videoWidth || !cw || !ch) { v.style.transform = ''; return; }
    const a = cw / ch, b = v.videoWidth / v.videoHeight;
    v.style.transformOrigin = 'center center';
    // تمطيط (stretch) بلا قص: الصورة كاملة كتبقى (والترجمة ما كتتقصش) وكتعمر الفراغ الأسود
    const sx = a > b ? a / b : 1, sy = a > b ? 1 : b / a;
    v.style.transform = 'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
  }
  const zoomSoon = () => { applyZoom(); setTimeout(applyZoom, 250); setTimeout(applyZoom, 800); };
  window.addEventListener('resize', zoomSoon);
  window.addEventListener('orientationchange', zoomSoon);
  document.addEventListener('loadedmetadata', applyZoom, true);
  document.addEventListener('resize', applyZoom, true);
  function addZoom() {
    const pl = $('#pl'); if (!pl) return;
    if (on) pl.classList.add('wa-fs');   // مشغّل جديد (الحلقة التالية) كيبقى فـ ملء الشاشة
    applyZoom();
    if ($('#pzoom', pl)) return;
    const fs = $('#pfs', pl); if (!fs) return;
    const b = document.createElement('button'); b.id = 'pzoom'; b.type = 'button'; b.title = 'ملء الفراغ (دون قصّ الترجمة)'; b.innerHTML = ZI;
    fs.parentNode.insertBefore(b, fs);
  }
  new MutationObserver(addZoom).observe(document.body, { childList: true });
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#pzoom'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    zoom = !zoom; try { localStorage.setItem('wa-zoom', zoom ? '1' : '0'); } catch {}
    zoomSoon();
  }, true);
  // كنعترضو الضغطة قبل ما توصل لـ requestFullscreen القديمة
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#pfs'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); set(!on);
  }, true);
  // سدّ المشغّل (زر X أو الحلقة اللي بعدها) → خرج من ملء الشاشة
  new MutationObserver(() => { if (on && !$('#pl')) set(false); }).observe(document.body, { childList: true });
  // زر الرجوع ديال Android كيبعت Escape (فـ android-api.js): إلا كنا فـ ملء الشاشة نخرجو منو بلا ما نسدو المشغّل
  document.addEventListener('keydown', (e) => {
    if (on && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); set(false); }
  }, true);
})();
