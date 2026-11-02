/* شريط تنقّل سفلي بحال Netflix: الرئيسية / بحث / المفضلة / السجل / المزيد */
(function () {
  const $ = (s) => document.querySelector(s);
  const ic = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const T = [
    ['nHome', 'الرئيسية', ic('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'), () => $('#nHome')],
    ['nFav', 'المفضلة', ic('<path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.3 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z"/>'), () => $('#nFav')],
    ['search', 'بحث', ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'), () => $('#qb')],
    ['nHist', 'السجل', ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), () => $('#nHist')],
    ['menu', 'القائمة', ic('<path d="M4 7h16M4 12h16M4 17h16"/>'), () => $('.brand')]
  ];
  function build() {
    if ($('#nfNav')) return;
    const nav = document.createElement('nav'); nav.id = 'nfNav';
    T.forEach(([id, label, svg, target]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = id;
      b.innerHTML = svg + '<span>' + label + '</span>';
      b.onclick = () => { const t = target(); if (t && t.click) t.click(); };
      nav.appendChild(b);
    });
    document.body.appendChild(nav);
    const q = $('#q'); if (q) q.placeholder = 'ابحث عن أنمي…';
    const sync = () => {
      const catOn = false;
      const on = document.querySelector('header .links button.on');
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', catOn ? b.dataset.k === 'cats' : (!!on && b.dataset.k === on.id)));
    };
    const h = $('header'); if (h) new MutationObserver(sync).observe(h, { subtree: true, attributes: true, attributeFilter: ['class'] });
    const v = $('#view'); if (v) new MutationObserver(sync).observe(v, { childList: true });
    window.__navSync = sync;
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
