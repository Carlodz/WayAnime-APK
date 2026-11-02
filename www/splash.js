/* شاشة البداية: صورة + «انتظر حتى يتم تحميل البيانات» — تختفي أول ما تظهر الصفحة الرئيسية (أو بعد 15 ثانية كحد أقصى) */
(function () {
  var el = document.getElementById('wasplash'); if (!el) return;
  var msg = document.getElementById('wasmsg'), t0 = Date.now(), MIN = 900, MAX = 15000, done = false, iv;
  function hide() {
    if (done) return; done = true; clearInterval(iv);
    el.classList.add('out'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
  }
  function ready() { return !!document.querySelector('#agrid .card, .ecard, .hhero .hslide, .hero'); }
  function say(t) { if (msg && msg.textContent !== t) msg.textContent = t; }
  iv = setInterval(function () {
    var dt = Date.now() - t0;
    if (ready() && dt >= MIN) return hide();
    if (navigator.onLine === false) say('لا يوجد اتصال بالإنترنت');
    else if (dt > 8000) say('الاتصال بطيء قليلًا… لحظات من فضلك');
    else if (dt > 3500) say('جارٍ جلب آخر الأنمي…');
    if (dt > MAX) hide();
  }, 150);
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () { var l = document.getElementById('gfonts'); if (l) l.media = 'all'; }, 300);
  });
})();
