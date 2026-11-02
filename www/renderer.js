const DEFAULT_ADDON = 'https://anime-kitsu.strem.fun';
const DEFAULT_STREAM = 'https://torrentio.strem.fun/providers=nyaasi,tokyotosho,anidex,horriblesubs'; // إضافة المصادر (Torrentio)
const errMsg = (e) => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const $ = (s) => document.querySelector(s);
const svg = (b, f) => `<svg class="i${f ? ' f' : ''}" viewBox="0 0 24 24">${b}</svg>`;
const HP = '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>';
const SP = '<polygon points="3 9 8 9 13 5 13 19 8 15 3 15"/>';
const I = {
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6"/>'),
  play: svg('<polygon points="6 4 20 12 6 20"/>', 1),
  pause: svg('<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>', 1),
  next: svg('<polygon points="5 4 15 12 5 20"/><line x1="19" y1="5" x2="19" y2="19"/>', 1),
  vol: svg(SP + '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  mute: svg(SP + '<line x1="17" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="17" y2="15"/>'),
  full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  arrowL: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  back: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  sync: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  cc: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.5a2 2 0 1 0 0 3M16 10.5a2 2 0 1 0 0 3"/>'),
  heart: svg(HP), heartF: svg(HP, 1),
  home: svg('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  bolt: svg('<polygon points="13 2 4 14 11 14 10 22 20 9 13 9"/>', 1),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  star: svg('<polygon points="12 3 14.7 8.6 20.8 9.5 16.4 13.8 17.5 19.9 12 17 6.5 19.9 7.6 13.8 3.2 9.5 9.3 8.6"/>', 1),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cross: svg('<path d="M6 6l12 12M18 6L6 18"/>')
};
const view = $('#view');
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('way:' + k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('way:' + k, JSON.stringify(v)); } catch {} if ((k === 'fav' || k === 'hist') && window.syncDirty) window.syncDirty(); }
};
const norm = (u) => (u || '').trim().replace(/\/manifest\.json$/i, '').replace(/\/$/, '');
let catalogAddon = norm(store.get('catalogAddon', DEFAULT_ADDON));
let streamAddon = norm(store.get('streamAddon', '')) || DEFAULT_STREAM;
let subAddon = norm(store.get('subAddon', 'https://opensubtitles-v3.strem.io'));
let translateOn = store.get('translateOn', true);
let notifyOn = store.get('notifyOn', true);
const pushBg = () => window.api.bg && window.api.bg({ keep: store.get('bgOn', true), autostart: store.get('autoStart', false) }).catch(() => {});
let cur = { type: '', vid: '' };
let catalogs = [];

const get = (base, path) => window.api.get(base + path);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ===== لوغو الأنمي مكان الاسم فـ الهيرو ===== */
const logoSlug = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
let LOGO_FILES = [];
const logoKey = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/uu/g, 'u').replace(/ou/g, 'o');
if (window.api && window.api.logos) window.api.logos().then((l) => { LOGO_FILES = (l || []).map((f) => ({ f, k: logoKey(f.replace(/\.png$/i, '')) })).filter((x) => x.k).sort((a, b) => b.k.length - a.k.length); }).catch(() => {});
function heroTitle(m) {
  const urls = [];
  const l = m && (m.logo || m.titleLogo || m.clearlogo); if (typeof l === 'string' && l) urls.push(l);
  [m && m.nameEn, m && m.name].forEach((t) => {
    const k = logoKey(t); if (!k) return;
    const hit = LOGO_FILES.find((x) => k === x.k || (x.k.length >= 4 && k.startsWith(x.k)) || (x.k.length >= 6 && k.includes(x.k)));
    if (hit) urls.push('assets/logos/' + hit.f);
    const sl = logoSlug(t); if (sl) urls.push('assets/logos/' + sl + '.png');
  });
  const nm = esc(m && m.name);
  return urls.length ? `<h2 class="hlogo" data-logo="${esc([...new Set(urls)].join('|'))}" data-name="${nm}">${nm}</h2>` : `<h2>${nm}</h2>`;
}
function applyLogos(root) {
  root.querySelectorAll('h2.hlogo[data-logo]').forEach((h) => {
    const urls = h.dataset.logo.split('|').filter(Boolean); h.removeAttribute('data-logo');
    const next = (i) => {
      if (i >= urls.length) return;
      const im = new Image(); im.alt = h.dataset.name || '';
      im.onload = () => { if (!h.isConnected || im.naturalWidth < 40) return next(i + 1); h.textContent = ''; h.title = im.alt; h.classList.add('has'); h.appendChild(im); };
      im.onerror = () => next(i + 1);
      im.src = urls[i];
    };
    next(0);
  });
}
new MutationObserver(() => applyLogos(view)).observe(view, { childList: true, subtree: true });
/* ===== استئناف المشاهدة: كنحفظو الدقيقة ديال كل حلقة (way:prog) ===== */
const progKey = (np) => np ? np.id + '#' + np.ep : '';
function progGet(np) {
  const r = (store.get('prog', {}) || {})[progKey(np)];
  return r && r.t > 15 && (!r.d || r.t < r.d - 40) ? r.t : 0;
}
function progSave(np, t, d) {
  if (!np || !(t > 0)) return;
  const all = store.get('prog', {}) || {}, k = progKey(np);
  if (d && t >= d - 40) delete all[k]; else all[k] = { t: Math.floor(t), d: Math.floor(d || 0), at: Date.now() };
  const ks = Object.keys(all); if (ks.length > 200) ks.sort((a, b) => all[a].at - all[b].at).slice(0, ks.length - 200).forEach(x => delete all[x]);
  store.set('prog', all);
}
const say = (t) => (window.__np = null, view.innerHTML = `<p class="mute">${esc(t)}</p>`);
const setNav = (id) => { document.querySelectorAll('header [id^="n"]').forEach(b => b.classList.toggle('on', b.id === id)); $('.wrap').classList.remove('hh'); $('header').classList.remove('solid'); };

async function init() {
  say('جارٍ التحميل…');
  try {
    const manifest = await get(catalogAddon, '/manifest.json');
    catalogs = manifest.catalogs.filter(c => !(c.extra || []).some(e => e.isRequired && e.name !== 'search'));
    $('#catalog').innerHTML = catalogs.map((c, i) => `<option value="${i}">${esc(c.name || c.id)}</option>`).join('');
    loadCatalog();
  } catch (e) { say('تعذّر الاتصال بالإضافة: ' + errMsg(e)); }
}

async function loadCatalog(search) {
  setNav('nHome');
  const c = catalogs[$('#catalog').value];
  if (!c) return;
  say('جارٍ التحميل…');
  try {
    const extra = search ? `/search=${encodeURIComponent(search)}` : '';
    const data = await get(catalogAddon, `/catalog/${c.type}/${c.id}${extra}.json`);
    const metas = data.metas || [];
    if (!metas.length) return say('لا توجد نتائج.');
    const hero = !search && metas[0];
    view.innerHTML = (hero ? `<div class="hero" tabindex="0" data-id="${esc(hero.id)}" data-type="${esc(hero.type || c.type)}" style="background-image:url('${esc(hero.background || hero.poster)}')"><div>${heroTitle(hero)}<p>${esc(hero.description || '')}</p></div></div>` : '')
      + `<h3>${search ? 'نتائج: ' + esc(search) : esc(c.name || c.id)}</h3>` + grid(hero ? metas.slice(1) : metas, c.type);
    bindCards();
  } catch (e) { say('خطأ: ' + errMsg(e)); }
}

function grid(metas, type) {
  return '<div class="grid">' + metas.map(m =>
    `<div class="card" tabindex="0" data-id="${esc(m.id)}" data-type="${esc(m.type || type)}">
       <img loading="lazy" src="${esc(m.poster)}" alt=""><p>${esc(m.name)}</p></div>`).join('') + '</div>';
}
function bindCards() {
  view.querySelectorAll('.card,.hero').forEach(el => {
    const open = () => (el.classList.contains('alc') ? openByTitle(el) : el.classList.contains('ecard') ? openEpCard(el) : openMeta(el.dataset.type, el.dataset.id));
    el.onclick = open; el.onkeydown = (e) => e.key === 'Enter' && open();
  });
}

async function openMeta(type, id) {
  say('جارٍ التحميل…');
  try {
    const { meta } = await get(catalogAddon, `/meta/${type}/${encodeURIComponent(id)}.json`);
    const vids = meta.videos && meta.videos.length ? meta.videos : [{ id: meta.id, title: 'مشاهدة' }];
    const seen = new Set(store.get('seen', {})[meta.id] || []);
    const isFav = () => store.get('fav', []).some(f => f.id === meta.id);
    view.innerHTML = `<div class="detail">
      <img src="${esc(meta.poster)}" alt="">
      <div><h2>${esc(meta.name)}</h2>
        <div class="row"><button class="primary" id="fav"></button></div>
        <p class="mute" id="desc">${esc(meta.description)}</p>
        <h3>الحلقات</h3>
        <div class="eps">${vids.map((v, i) => `<button data-i="${i}" class="${seen.has(v.id) ? 'seen' : ''}">${esc(v.episode ?? v.title ?? i + 1)}</button>`).join('')}</div>
        <div id="out"></div></div></div>`;
    if (translateOn && meta.description) translateDesc(meta);
    const favBtn = $('#fav'), paint = () => (favBtn.innerHTML = isFav() ? I.heartF + ' في المفضلة' : I.heart + ' أضف للمفضلة');
    paint();
    favBtn.onclick = () => {
      let f = store.get('fav', []);
      f = isFav() ? f.filter(x => x.id !== meta.id) : [{ id: meta.id, type, name: meta.name, poster: meta.poster }, ...f];
      store.set('fav', f); paint();
    };
    view.querySelectorAll('.eps button').forEach(b => b.onclick = () => {
      view.querySelectorAll('.eps button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); b.classList.add('seen');
      const v = vids[b.dataset.i];
      const s = store.get('seen', {}); s[meta.id] = [...new Set([...(s[meta.id] || []), v.id])]; store.set('seen', s);
      let h = store.get('hist', []).filter(x => x.id !== meta.id);
      store.set('hist', [{ id: meta.id, type, name: meta.name, poster: meta.poster }, ...h].slice(0, 40));
      loadStreams(type, v.id);
    });
  } catch (e) { say('خطأ: ' + errMsg(e)); }
}

async function translateDesc(meta) {
  const cache = store.get('tr', {});
  try {
    if (!cache[meta.id]) {
      cache[meta.id] = await window.api.translate(meta.description);
      const keys = Object.keys(cache); if (keys.length > 150) delete cache[keys[0]];
      store.set('tr', cache);
    }
    const el = $('#desc'); if (el) el.textContent = cache[meta.id];
  } catch (e) {
    const el = $('#desc'); if (el) el.insertAdjacentHTML('afterend', `<p class="mute" style="font-size:12px">تعذّرت الترجمة: ${esc(errMsg(e))}</p>`);
  }
}

async function loadStreams(type, vid) {
  const out = $('#out');
  cur = { type, vid };
  out.innerHTML = '<p class="mute">جارٍ البحث عن مصادر…</p>';
  try {
    const { streams = [] } = await get(streamAddon, `/stream/${type}/${encodeURIComponent(vid)}.json`);
    if (!streams.length) return (out.innerHTML = '<p class="mute">لا توجد مصادر لهذه الحلقة. أضف رابط إضافة ستريم من الإعدادات.</p>');
    out.innerHTML = '<div class="streams">' + streams.map((s, i) =>
      `<button data-i="${i}">${I.play} سيرفر ${i + 1}</button>`).join('') + '</div><div id="player"></div>';
    out.querySelectorAll('.streams button').forEach(b => b.onclick = () => play(streams[b.dataset.i]));
  } catch (e) { out.innerHTML = `<p class="mute">${/404/.test(errMsg(e)) ? 'إضافة المصادر لا تتعرّف على هذه الحلقة، أو الرابط في الإعدادات خاطئ.' : 'خطأ: ' + esc(errMsg(e))}</p>`; }
}

const srtToVtt = (t) => 'WEBVTT\n\n' + t.replace(/\r/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

async function addArabicSubs(v) {
  if (!subAddon) return;
  try {
    const { subtitles = [] } = await get(subAddon, `/subtitles/${cur.type}/${encodeURIComponent(cur.vid)}.json`);
    const sub = subtitles.find(x => /^(ara|ar)/i.test(x.lang || ''));
    if (!sub) return;
    const txt = await window.api.text(sub.url);
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.label = 'العربية'; tr.srclang = 'ar'; tr.default = true;
    tr.src = URL.createObjectURL(new Blob([txt.trim().startsWith('WEBVTT') ? txt : srtToVtt(txt)], { type: 'text/vtt' }));
    v.appendChild(tr);
  } catch {}
}

function attach(url) {
  const box = $('#player');
  box.innerHTML = '<video controls autoplay></video>';
  const v = box.firstChild;
  if (url.includes('.m3u8') && window.Hls && Hls.isSupported()) { const h = new Hls(); h.loadSource(url); h.attachMedia(v); }
  else v.src = url;
  v.onerror = () => box.insertAdjacentHTML('beforeend', '<p class="mute">تعذّر تشغيل هذا الملف داخل التطبيق (ربما صيغة غير مدعومة). جرّب مصدراً آخر.</p>');
  addArabicSubs(v);
}

async function play(s) {
  const box = $('#player');
  if (s.url) attach(s.url);
  else if (s.externalUrl) window.api.openExternal(s.externalUrl);
  else if (s.infoHash) {
    box.innerHTML = '<p class="mute">جارٍ الاتصال بالتورنت… قد يستغرق دقيقة.</p>';
    try { attach((await window.api.torrent({ infoHash: s.infoHash, fileIdx: s.fileIdx, sources: s.sources })).url); }
    catch (e) { box.innerHTML = `<p class="mute">فشل التورنت: ${esc(errMsg(e))}</p>`; }
  }
}

function showList(title, key, navId) {
  setNav(navId);
  const items = store.get(key, []);
  view.innerHTML = `<div class="page"><div class="ph"><h3>${title}</h3><span class="mute">${items.length || ''}</span></div>` + (items.length ? grid(items) : '<p class="mute">لا شيء هنا بعد.</p>') + '</div>';
  bindCards();
}

function showSettings() {
  setNav('nSet');
  view.innerHTML = `<h3>الإعدادات</h3><div class="set">
    <label class="mute">إضافة الكتالوج</label><input id="sc" dir="ltr" value="${esc(catalogAddon)}">
    <label class="mute">إضافة الستريم (اتركها فارغة لاستعمال Torrentio)</label><input id="ss" dir="ltr" value="${esc(store.get('streamAddon', ''))}">
    <label class="mute">إضافة الترجمة (Subtitles)</label><input id="sb" dir="ltr" value="${esc(subAddon)}">
    <label class="mute"><input type="checkbox" id="tr" ${translateOn ? 'checked' : ''} style="width:auto"> ترجمة وصف الأنمي إلى العربية</label>
    <label class="mute"><input type="checkbox" id="nt" ${notifyOn ? 'checked' : ''} style="width:auto"> إشعار عند نزول حلقة جديدة (للمفضلة وآخر ما شاهدته)</label>
    <label class="mute"><input type="checkbox" id="bgk" ${store.get('bgOn', true) ? 'checked' : ''} style="width:auto"> يستمر العمل في الخلفية عند إغلاق النافذة (أيقونة في شريط النظام)</label>
    <label class="mute"><input type="checkbox" id="aut" ${store.get('autoStart', false) ? 'checked' : ''} style="width:auto"> يشتغل تلقائياً مع ويندوز (بالخلفية)</label>
    <button class="primary" id="save">حفظ</button></div>`;
  $('#save').onclick = () => {
    store.set('catalogAddon', norm($('#sc').value) || DEFAULT_ADDON);
    store.set('streamAddon', norm($('#ss').value));
    store.set('subAddon', norm($('#sb').value)); store.set('translateOn', $('#tr').checked); store.set('notifyOn', $('#nt').checked); notifyOn = $('#nt').checked; if (notifyOn) { try { window.api.notifyPerm(); } catch {} setTimeout(() => watchNew(), 500); } else { try { window.api.notifySync({ enabled: false, items: [] }); } catch {} } store.set('bgOn', $('#bgk').checked); store.set('autoStart', $('#aut').checked); pushBg();
    subAddon = norm(store.get('subAddon')); translateOn = $('#tr').checked;
    catalogAddon = norm(store.get('catalogAddon')); streamAddon = norm(store.get('streamAddon')) || DEFAULT_STREAM;
    init();
  };
}

$('#nHome').onclick = () => { $('#q').value = ''; loadCatalog(); };
$('#nFav').onclick = () => showList(I.heartF + ' المفضلة', 'fav', 'nFav');
$('#nHist').onclick = () => showList(I.clock + ' آخر ما شاهدته', 'hist', 'nHist');
$('#q').onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) loadCatalog(e.target.value.trim()); };

/* ===== التصميم الجديد (تُعيد تعريف الدوال القديمة) ===== */

async function init() {
  say('جارٍ التحميل…');
  try {
    const m = await get(catalogAddon, '/manifest.json');
    catalogs = m.catalogs.filter(c => !(c.extra || []).some(e => e.isRequired && e.name !== 'search'));
    loadCatalog();
  } catch (e) { say('تعذّر الاتصال بالإضافة: ' + errMsg(e)); }
}

const starSvg = (on) => svg('<polygon ' + (on ? 'fill="currentColor" ' : '') + 'points="12 3 14.9 9 21.5 9.8 16.6 14.3 17.9 21 12 17.7 6.1 21 7.4 14.3 2.5 9.8 9.1 9"/>');
I.plus = svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>');
I.playc = svg('<circle cx="12" cy="12" r="9"/><polygon fill="currentColor" points="10 8 16 12 10 16"/>');
const isFavId = (id) => store.get('fav', []).some(f => f.id === id);
const toggleFav = (o) => { const f = store.get('fav', []); store.set('fav', f.some(x => x.id === o.id) ? f.filter(x => x.id !== o.id) : [o, ...f]); };
const metaRow = (m) => {
  const r = parseFloat(m.imdbRating);
  const h = (r ? `<span class="stars">${[1, 2, 3, 4, 5].map(i => `<span class="ys">${starSvg(i <= Math.round(r / 2))}</span>`).join('')}</span><b>${r}</b>` : '') + (m.releaseInfo ? `<span>${esc(m.releaseInfo)}</span>` : '');
  return h ? `<div class="hmeta">${h}</div>` : '';
};
const cardHtml = (m, type) => `<div class="card" tabindex="0" data-id="${esc(m.id)}" data-type="${esc(m.type || type)}"><img loading="lazy" src="${esc(m.poster)}" alt=""><p>${esc(m.name)}</p><div class="cm"><span>${esc(m.releaseInfo || '')}</span></div><div class="cm"><b class="rt">${m.imdbRating ? esc(m.imdbRating) : ''}</b><button class="star" data-id="${esc(m.id)}" data-type="${esc(m.type || type)}" data-name="${esc(m.name)}" data-poster="${esc(m.poster)}">${starSvg(isFavId(m.id))}</button></div></div>`;
function grid(metas, type) { return '<div class="grid">' + metas.map(m => cardHtml(m, type)).join('') + '</div>'; }
function bindCards() {
  view.querySelectorAll('.card,.hero').forEach(el => {
    const open = () => (el.classList.contains('alc') ? openByTitle(el) : el.classList.contains('ecard') ? openEpCard(el) : openMeta(el.dataset.type, el.dataset.id));
    el.onclick = open; el.onkeydown = (e) => e.key === 'Enter' && open();
  });
  view.querySelectorAll('.star').forEach(b => b.onclick = (e) => {
    e.stopPropagation(); const d = b.dataset;
    toggleFav({ id: d.id, type: d.type, name: d.name, poster: d.poster }); b.innerHTML = starSvg(isFavId(d.id));
  });
}

async function loadCatalog(search) {
  setNav('nHome'); say('جارٍ التحميل…');
  const fetchCat = async (c, s) => (await get(catalogAddon, `/catalog/${c.type}/${c.id}${s ? '/search=' + encodeURIComponent(s) : ''}.json`)).metas || [];
  try {
    if (search) {
      const m = await fetchCat(catalogs[0], search);
      view.innerHTML = `<h3>نتائج: ${esc(search)}</h3>` + (m.length ? grid(m, catalogs[0].type) : '<p class="mute">لا توجد نتائج.</p>');
      return bindCards();
    }
    const cats = catalogs.slice(0, 6), cache = {};
    cache[0] = await fetchCat(cats[0]);
    if (!cache[0].length) return say('لا توجد نتائج.');
    const h = cache[0][0];
    view.innerHTML = `<div class="hero" tabindex="0" data-id="${esc(h.id)}" data-type="${esc(h.type || cats[0].type)}" style="background-image:url('${esc(h.background || h.poster)}')"><div>${heroTitle(h)}<p class="sub">${esc((h.genres || []).slice(0, 3).join(' · ') || h.releaseInfo || '')}</p><div class="acts"><span class="ghost">${I.playc} شاهد الآن</span><button class="ghost" id="hfav"></button></div>${metaRow(h)}</div><span class="bigplay">${I.playc}</span></div>`
      + `<div class="sec"><div class="tabs">${cats.map((c, i) => `<button data-i="${i}" class="${i ? '' : 'on'}">${esc(c.name || c.id)}</button>`).join('')}</div><div id="tabc"></div></div>`;
    $('.wrap').classList.add('hh'); view.scrollTop = 0; $('header').classList.remove('solid');
    const hp = () => ($('#hfav').innerHTML = isFavId(h.id) ? starSvg(true) + ' في المفضلة' : I.plus + ' أضف للمفضلة');
    hp();
    $('#hfav').onclick = (e) => { e.stopPropagation(); toggleFav({ id: h.id, type: h.type || cats[0].type, name: h.name, poster: h.poster }); hp(); };
    const show = async (i) => {
      const box = $('#tabc');
      try {
        if (!cache[i]) { box.innerHTML = '<p class="mute">جارٍ التحميل…</p>'; cache[i] = await fetchCat(cats[i]); }
        box.innerHTML = cache[i].length ? grid(cache[i], cats[i].type) : '<p class="mute">لا توجد نتائج.</p>'; bindCards();
      } catch (e) { box.innerHTML = '<p class="mute">خطأ: ' + esc(errMsg(e)) + '</p>'; }
    };
    view.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { view.querySelectorAll('.tabs button').forEach(x => x.classList.remove('on')); b.classList.add('on'); show(+b.dataset.i); });
    show(0);
  } catch (e) { say('تعذّر تحميل الأنمي: ' + errMsg(e)); }
}

async function openMeta(type, id) {
  say('جارٍ التحميل…');
  try {
    const { meta } = await get(catalogAddon, `/meta/${type}/${encodeURIComponent(id)}.json`);
    const vids = meta.videos && meta.videos.length ? meta.videos : [{ id: meta.id, title: 'مشاهدة' }];
    const seen = new Set(store.get('seen', {})[meta.id] || []);
    view.innerHTML = `<div class="hero" style="background-image:url('${esc(meta.background || meta.poster)}')"><div>${heroTitle(meta)}<p class="sub">${esc((meta.genres || []).slice(0, 4).join(' · ') || meta.releaseInfo || '')}</p><div class="acts"><button class="ghost" id="watch">${I.playc} شاهد الآن</button><button class="ghost" id="fav"></button></div>${metaRow(meta)}</div></div>`
      + `<div class="sec"><div class="tabs"><button class="on" data-t="eps">الحلقات</button><button data-t="ds">الوصف</button></div>`
      + `<div id="t_eps"><div class="eps">${vids.map((v, i) => `<button data-i="${i}" class="${seen.has(v.id) ? 'seen' : ''}">${esc(v.episode ?? v.title ?? i + 1)}</button>`).join('')}</div><div id="out"></div></div>`
      + `<div id="t_ds" class="hide"><p class="mute" id="desc">${esc(meta.description)}</p></div></div>`;
    $('.wrap').classList.add('hh'); view.scrollTop = 0; $('header').classList.remove('solid');
    if (translateOn && meta.description) translateDesc(meta);
    const fp = () => ($('#fav').innerHTML = isFavId(meta.id) ? starSvg(true) + ' في المفضلة' : I.plus + ' أضف للمفضلة');
    fp();
    $('#fav').onclick = () => { toggleFav({ id: meta.id, type, name: meta.name, poster: meta.poster }); fp(); };
    view.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      view.querySelectorAll('.tabs button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      $('#t_eps').classList.toggle('hide', b.dataset.t !== 'eps'); $('#t_ds').classList.toggle('hide', b.dataset.t !== 'ds');
    });
    view.querySelectorAll('.eps button').forEach(b => b.onclick = () => {
      view.querySelectorAll('.eps button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); b.classList.add('seen');
      const v = vids[b.dataset.i];
      const s = store.get('seen', {}); s[meta.id] = [...new Set([...(s[meta.id] || []), v.id])]; store.set('seen', s);
      const h = store.get('hist', []).filter(x => x.id !== meta.id);
      store.set('hist', [{ id: meta.id, type, name: meta.name, poster: meta.poster }, ...h].slice(0, 40));
      loadStreams(type, v.id);
    });
    $('#watch').onclick = () => { const b = view.querySelector('.eps button:not(.seen)') || view.querySelector('.eps button'); b && b.click(); };
  } catch (e) { say('خطأ: ' + errMsg(e)); }
}

let plKey = null;
function closePlayer() {
  const pl = $('#pl');
  if (pl) { pl._hls && pl._hls.destroy(); const v = pl.querySelector('video'); v.pause(); v.removeAttribute('src'); v.load(); pl.remove(); window.api.media && window.api.media.stop().catch(() => {}); }
  if (plKey) { document.removeEventListener('keydown', plKey); plKey = null; }
  if (document.fullscreenElement) document.exitFullscreen();
}

/* ===== المشغّل الشامل: تشغيل مباشر إلا كانت الصيغة مدعومة، وإلا تحويل ذكي عبر ffmpeg (نسخ الفيديو + تحويل الصوت، أو تحويل كامل) ===== */
const NV = new Set(['h264', 'vp8', 'vp9', 'av1', 'theora']);                                   // فيديو كيقراه Chromium
const NA = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac', 'pcm_s16le', 'pcm_s24le', 'pcm_f32le', 'pcm_u8']); // صوت كيقراه Chromium
const NC = /matroska|webm|mov|mp4|ogg|wav|mp3|flac|aac|m4a/;                                   // حاويات مدعومة
const hevcOk = () => { try { return !!(window.MediaSource && MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"')); } catch { return false; } };
const L3 = { jpn: 'ja', eng: 'en', ara: 'ar', fre: 'fr', fra: 'fr', spa: 'es', ger: 'de', deu: 'de', ita: 'it', por: 'pt', rus: 'ru', tur: 'tr', kor: 'ko', chi: 'zh', zho: 'zh', ind: 'id', hin: 'hi' };
const langName = (c) => { if (!c) return ''; const k = L3[c.toLowerCase()] || c; try { return new Intl.DisplayNames(['ar'], { type: 'language' }).of(k) || c; } catch { return c; } };
const fmtT = (t) => { if (!isFinite(t) || t < 0) t = 0; const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = String(Math.floor(t % 60)).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`; };

function decidePlan(info, a) {
  const v = info.video[0], au = info.audio[a];
  const aOk = !au || NA.has(au.codec);
  const hevc = !!v && v.codec === 'hevc' && !v.ten && hevcOk();
  const vOk = !v || (NV.has(v.codec) && !v.ten);
  const copyOk = !v || (v.codec === 'h264' && !v.ten) || v.codec === 'vp9' || v.codec === 'av1' || hevc;
  const base = { a, v: v ? v.idx : 0, hevc, acopy: !!au && au.codec === 'aac' };
  if (vOk && aOk && NC.test(info.format || '') && a === 0 && info.defA <= 0) return { mode: 'direct', ...base };
  if (copyOk) return { mode: 'copy', ...base };
  return { mode: 'full', ...base };
}

// إزاحة وقت الترجمة (كي يبدأ التحويل من نص الفيديو)
function vttShift(vtt, off) {
  if (!off) return vtt;
  const ts = (x) => { const m = /^(?:(\d+):)?(\d+):(\d+)[.,](\d+)$/.exec(x); return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + parseFloat('0.' + m[4]) : 0; };
  const fm = (t) => String(Math.floor(t / 3600)).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0') + ':' + (t % 60).toFixed(3).padStart(6, '0');
  return vtt.replace(/\r/g, '').split(/\n\n+/).map((blk, i) => {
    if (i === 0 && /^WEBVTT/.test(blk)) return blk;
    const l = blk.split('\n'), k = l.findIndex(x => x.includes('-->'));
    if (k < 0) return blk;
    const m = /^\s*(\S+)\s+-->\s+(\S+)(.*)$/.exec(l[k]);
    if (!m) return blk;
    const e = ts(m[2]) - off;
    if (e <= 0) return null;
    l[k] = fm(Math.max(0, ts(m[1]) - off)) + ' --> ' + fm(e) + m[3];
    return l.join('\n');
  }).filter(x => x !== null).join('\n\n');
}

function attach(url, s = {}) {
  closePlayer();
  const title = s.title || ($('.hero h2') || {}).textContent || '';
  const ep = s.title ? '' : (($('.eps button.on') || {}).textContent || '');
  const pl = document.createElement('div');
  pl.id = 'pl';
  pl.innerHTML = `<div class="pbox"><video autoplay></video>
    <div class="ptop"><button id="pcc" title="الإعدادات">${I.gear}</button><b>${esc(title)} ${esc(ep)}</b><small id="pmode"></small><span class="sp"></span><button id="pfs" title="ملء الشاشة">${I.full}</button><button id="pb" title="إغلاق">${I.close}</button></div>
    <button class="pcen" id="pcn">${I.pause}</button>
    <div class="pbot"><button id="pp">${I.pause}</button><span id="pt">0:00 / 0:00</span><input type="range" id="ps" min="0" max="1000" value="0"><button id="pn" title="الحلقة التالية">${I.next}</button><div class="pvol"><input type="range" id="pv" min="0" max="1" step="0.05" value="1"><button id="pm">${I.vol}</button></div></div>
    <div class="smenu"><button id="pc" title="وضع التوافق (تحويل الفيديو)">${I.sync} وضع التوافق</button></div></div>`;
  document.body.appendChild(pl);
  const v = pl.querySelector('video'), $$ = (i) => pl.querySelector(i);
  const isHls = /\.m3u8|master\.txt/i.test(url) || !!s.hls;
  const st = { mode: 'direct', off: 0, dur: 0, a: 0, info: null, plan: null, last: 0, token: 0 };
  pl._off = 0;

  const msg = (t) => { const o = pl.querySelector('.perr'); o ? (o.textContent = t) : pl.querySelector('.pbox').insertAdjacentHTML('beforeend', `<p class="perr">${esc(t)}</p>`); };
  const clearMsg = () => { const o = pl.querySelector('.perr'); o && o.remove(); };
  const setMode = () => { $$('#pmode').textContent = st.mode === 'copy' ? '· تحويل سريع' : st.mode === 'full' ? '· تحويل كامل' : ''; };

  // ترجمة: نص WebVTT محفوظ + إعادة بناء الـ track حسب الإزاحة الحالية
  pl._applySub = () => {
    v.querySelectorAll('track').forEach(t => t.remove());
    if (!pl._vtt) return;
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.default = true;
    tr.src = URL.createObjectURL(new Blob([vttShift(pl._vtt, pl._off || 0)], { type: 'text/vtt' }));
    v.appendChild(tr); tr.track.mode = 'showing';
  };
  pl._setSub = (txt) => { pl._vtt = txt ? (txt.trim().startsWith('WEBVTT') ? txt : srtToVtt(txt)) : null; pl._applySub(); };

  const T = () => st.off + (v.currentTime || 0);
  const D = () => (st.mode === 'direct' ? (isFinite(v.duration) ? v.duration : st.dur) : st.dur);

  const loadDirect = (at = 0) => {
    st.token++; st.mode = 'direct'; st.off = 0; pl._off = 0; st.plan = null;
    if (pl._hls) { pl._hls.destroy(); pl._hls = null; }
    if (isHls && window.Hls && Hls.isSupported()) { const h = new Hls(at ? { startPosition: at } : {}); pl._hls = h; h.loadSource(url); h.attachMedia(v); }
    else { v.src = url; if (at > 0) v.addEventListener('loadedmetadata', () => { v.currentTime = at; }, { once: true }); }
    pl._applySub(); setMode(); clearMsg();
  };
  const startTc = async (plan, at = 0) => {
    const my = ++st.token;
    if (at < 1) at = 0;
    const full = at > 0 || plan.mode === 'full';          // seek وسط الفيديو = تحويل كامل (دقيق)
    msg('جارٍ تجهيز الفيديو…');
    try {
      const r = await window.api.media.start({ url, start: at, mode: full ? 'full' : 'copy', v: plan.v, a: plan.a, acopy: !full && plan.acopy, hevc: !full && plan.hevc });
      if (my !== st.token) return;
      if (pl._hls) { pl._hls.destroy(); pl._hls = null; }
      st.mode = full ? 'full' : 'copy'; st.off = at; pl._off = at; st.plan = plan;
      v.src = r.url; pl._applySub(); setMode();
      await v.play().catch(() => {});
    } catch (e) { if (my === st.token) msg('تعذّر التحويل: ' + errMsg(e)); }
  };
  const fullPlan = () => ({ mode: 'full', a: st.a, v: st.info && st.info.video[0] ? st.info.video[0].idx : 0, hevc: false, acopy: false });
  const tc = () => startTc(fullPlan(), st.last);

  const seekTo = (t) => {
    const d = D(); t = Math.max(0, d ? Math.min(t, d - 0.5) : t);
    if (st.mode === 'direct') { v.currentTime = t; return; }
    const rel = t - st.off;
    if (rel >= 0) for (let i = 0; i < v.buffered.length; i++) if (rel >= v.buffered.start(i) - 0.1 && rel <= v.buffered.end(i) - 0.5) { v.currentTime = rel; return; }
    startTc(st.plan || fullPlan(), t);
  };

  // ===== فحص الملف (بالتوازي): يحدّد الصيغة، المسارات الصوتية، والترجمات الداخلية =====
  const switchAudio = (i) => {
    st.a = i;
    const plan = decidePlan(st.info, i), at = T();
    plan.mode === 'direct' ? loadDirect(at) : startTc(plan, at);
  };
  const buildMenu = () => {
    const info = st.info, menu = $$('.smenu');
    if (!info) return;
    if (!pl._item) return setTimeout(buildMenu, 200);
    info.subs.filter(x => x.text).forEach(sb => {
      const b = pl._item(`داخل الملف · ${langName(sb.lang) || 'ترجمة'}${sb.title ? ' · ' + sb.title : ''}`, async (btn) => {
        const o = btn.textContent; btn.textContent = 'جارٍ استخراج الترجمة…';
        try { pl._setSub(await window.api.media.subs({ url, index: sb.idx })); } finally { btn.textContent = o; }
      });
      if (!pl._arSub && /^(ara|ar)/i.test(sb.lang || '')) { pl._arSub = b; b.click(); }
    });
    if (info.audio.length > 1) {
      const h = document.createElement('div'); h.className = 'mh'; h.textContent = 'الصوت'; menu.appendChild(h);
      info.audio.forEach((au, i) => {
        const b = document.createElement('button'); b.dataset.g = 'a';
        b.textContent = `${langName(au.lang) || 'صوت ' + (i + 1)}${au.title ? ' · ' + au.title : ''} · ${au.codec.toUpperCase()}${au.ch ? ' ' + au.ch : ''}`;
        if (i === st.a) b.classList.add('on');
        b.onclick = () => { menu.querySelectorAll('[data-g="a"]').forEach(x => x.classList.remove('on')); b.classList.add('on'); switchAudio(i); };
        menu.appendChild(b);
      });
    }
  };
  st.probeP = (!isHls && /^https?:/i.test(url)) ? window.api.media.probe(url).catch(() => null) : Promise.resolve(null);
  st.probeP.then((info) => {
    if (!info || !pl.isConnected) return;
    st.info = info; st.dur = info.duration || 0;
    st.a = info.defA > 0 ? info.defA : 0;
    const plan = decidePlan(info, st.a);
    if (plan.mode !== 'direct' && st.mode === 'direct') startTc(plan, v.currentTime);
    buildMenu();
  });

  // ===== بداية التشغيل: مباشر أولاً (سريع للـ mp4)، والفحص يحوّل إلا لزم =====
  const np = window.__np || null, rs = progGet(np);
  loadDirect(rs);
  if (rs) toast('نكمل من الدقيقة ' + fmtT(rs));
  const fall = () => { if (st.mode === 'full') msg('تعذّر تشغيل هذا المصدر. جرّب مصدراً آخر.'); else startTc(fullPlan(), st.last); };
  v.onerror = fall;
  v.onloadedmetadata = () => {
    if (st.mode === 'direct' && v.videoWidth === 0) st.probeP.then((i) => { if (!i || i.video.length) fall(); });   // صوت فقط؟ ما نحوّلوش
  };
  v.addEventListener('playing', () => { clearMsg(); setTimeout(() => { if (st.mode === 'direct' && !v.paused && !v.muted && v.webkitAudioDecodedByteCount === 0 && (!st.info || st.info.audio.length)) fall(); }, 2500); });
  v.onwaiting = () => { if (st.mode !== 'direct') msg('جارٍ التحميل…'); };
  v.oncanplay = clearMsg;
  $$('#pc').onclick = tc;

  const toggle = () => (v.paused ? v.play() : v.pause());
  v.onclick = toggle; $$('#pp').onclick = toggle; $$('#pcn').onclick = toggle;
  v.onplay = () => { $$('#pp').innerHTML = I.pause; $$('#pcn').innerHTML = I.pause; pl.classList.remove('paused'); };
  v.addEventListener('pause', () => { if (np) progSave(np, T(), D()); });
  v.addEventListener('ended', () => { if (np) progSave(np, D() || 1e9, D() || 1); });
  v.onpause = () => { $$('#pp').innerHTML = I.play; $$('#pcn').innerHTML = I.play; pl.classList.add('paused'); };
  v.ontimeupdate = () => {
    const t = T(), d = D(); st.last = t;
    if (np && Date.now() - (st.sv || 0) > 5000 && !v.paused) { st.sv = Date.now(); progSave(np, t, d); }
    $$('#pt').textContent = fmtT(t) + ' / ' + fmtT(d);
    if (d) { const p = Math.min(1000, t / d * 1000); $$('#ps').value = p; $$('#ps').style.setProperty('--p', (p / 10) + '%'); }
  };
  $$('#ps').oninput = (e) => {
    const d = D(); e.target.style.setProperty('--p', (e.target.value / 10) + '%');
    if (!d) return;
    $$('#pt').textContent = fmtT(e.target.value / 1000 * d) + ' / ' + fmtT(d);
    if (st.mode === 'direct') v.currentTime = e.target.value / 1000 * d;
  };
  $$('#ps').onchange = (e) => { const d = D(); if (d && st.mode !== 'direct') seekTo(e.target.value / 1000 * d); };
  $$('#pv').oninput = (e) => { v.volume = e.target.value; v.muted = false; e.target.style.setProperty('--p', (e.target.value * 100) + '%'); };
  $$('#pm').onclick = () => { v.muted = !v.muted; $$('#pm').innerHTML = v.muted ? I.mute : I.vol; };
  const fs = () => (document.fullscreenElement ? document.exitFullscreen() : pl.querySelector('.pbox').requestFullscreen());
  $$('#pfs').onclick = fs;
  $$('#pb').onclick = closePlayer;
  $$('#pn').onclick = () => {
    const n = $('.eps button.on'), nx = n && n.nextElementSibling;
    if (!nx) { closePlayer(); return; }
    v.pause(); const pm = $$('#pmode'); if (pm) pm.textContent = 'جارٍ تحميل الحلقة التالية…';
    window.__autoNext = { t: window.__lastSrc || '', pl };   // المشغّل كيبقى مفتوح (وملء الشاشة) حتى تجهز الحلقة الجديدة
    nx.click();
    setTimeout(() => { if ($('#pl') === pl) closePlayer(); }, 40000);   // إلا ما لقينا رابط: نسدو المشغّل ونرجعو لقائمة السيرفرات
  };
  let tm; const wake = () => { pl.classList.remove('idle'); clearTimeout(tm); tm = setTimeout(() => pl.classList.add('idle'), 3000); };
  pl.onmousemove = wake; wake();
  pl.onclick = (e) => { if (e.target === pl) closePlayer(); };
  plKey = (e) => {
    if (e.key === 'Escape') closePlayer();
    else if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') seekTo(T() + 10);
    else if (e.key === 'ArrowLeft') seekTo(T() - 10);
    else if (e.key === 'ArrowUp') { e.preventDefault(); v.volume = Math.min(1, v.volume + 0.05); $$('#pv').value = v.volume; $$('#pv').style.setProperty('--p', (v.volume * 100) + '%'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.05); $$('#pv').value = v.volume; $$('#pv').style.setProperty('--p', (v.volume * 100) + '%'); }
    else if (e.key === 'f' || e.key === 'F') fs();
    else if (e.key === 'm' || e.key === 'M') $$('#pm').click();
  };
  document.addEventListener('keydown', plKey);
  subsUI(v, pl);
}

async function play(s) {
  const box = $('#player');
  if (s.url) attach(s.url, s);
  else if (s.externalUrl) window.api.openExternal(s.externalUrl);
  else if (s.infoHash) {
    box.innerHTML = '<p class="mute">جارٍ الاتصال بالتورنت… قد يستغرق دقيقة.</p>';
    try { const r = await window.api.torrent({ infoHash: s.infoHash, fileIdx: s.fileIdx, sources: s.sources }); box.innerHTML = ''; attach(r.url, s); }
    catch (e) { box.innerHTML = `<p class="mute">فشل التورنت: ${esc(errMsg(e))}</p>`; }
  }
}


async function trSub(txt, prog) {
  const vtt = txt.trim().startsWith('WEBVTT') ? txt : srtToVtt(txt);
  const bl = vtt.replace(/\r/g, '').split(/\n\n+/).slice(1).map(b => b.split('\n')).map(l => {
    const i = l.findIndex(x => x.includes('-->'));
    return i < 0 ? null : { t: l[i], s: l.slice(i + 1).join(' ').replace(/<[^>]+>|\{[^}]*\}/g, '').trim() };
  }).filter(Boolean);
  for (let i = 0; i < bl.length;) {
    let j = i, n = 0;
    while (j < bl.length && n + bl[j].s.length < 1400) { n += bl[j].s.length + 1; j++; }
    if (j === i) j++;
    const g = bl.slice(i, j);
    try { const o = (await window.api.translate(g.map(b => b.s).join('\n'))).split('\n'); if (o.length === g.length) g.forEach((b, k) => (b.s = o[k])); } catch {}
    i = j; prog && prog(Math.round(i / bl.length * 100));
  }
  return 'WEBVTT\n\n' + bl.map(b => b.t + '\n' + b.s).join('\n\n');
}

async function subsUI(v, pl) {
  const menu = pl.querySelector('.smenu');
  pl.querySelector('#pcc').onclick = () => menu.classList.toggle('show');
  const toVtt = (t) => (t.trim().startsWith('WEBVTT') ? t : srtToVtt(t));
  const setTrack = (vtt) => pl._setSub(vtt);
  const item = (label, fn) => {
    const b = document.createElement('button');
    if (/^<svg/.test(label)) b.innerHTML = label; else b.textContent = label;
    b.onclick = async () => {
      menu.querySelectorAll('button:not([data-g])').forEach(x => x.classList.remove('on')); b.classList.add('on');
      try { await fn(b); } catch { b.textContent = label.replace(/<[^>]*>/g, '') + ' — تعذّر'; }
    };
    menu.appendChild(b); return b;
  };
  item('بدون ترجمة', () => setTrack(null)).classList.add('on');
  pl._item = item;
  item(I.folder + ' ملف ترجمة من الجهاز…', async (b) => { const t = await window.api.media.subFile(); if (!t) return b.classList.remove('on'); setTrack(toVtt(t)); });
  if (!subAddon) return;
  let subs = [];
  try { subs = (await get(subAddon, `/subtitles/${cur.type}/${encodeURIComponent(cur.vid)}.json`)).subtitles || []; } catch {}
  const nm = (c) => { try { return new Intl.DisplayNames(['ar'], { type: 'language' }).of(c); } catch { return c; } };
  const by = {};
  subs.forEach(s => { const l = (s.lang || '?').toLowerCase(); (by[l] = by[l] || []).push(s); });
  const isAr = (l) => /^ar/.test(l);
  let first = null;
  Object.keys(by).sort((a, b) => (isAr(b) - isAr(a)) || a.localeCompare(b)).slice(0, 12).forEach(l =>
    by[l].slice(0, 2).forEach((s, k) => {
      const b = item(nm(l) + (k ? ' ' + (k + 1) : ''), async () => setTrack(toVtt(await window.api.text(s.url))));
      if (!first && isAr(l)) first = b;
    }));
  const en = by.eng || by.en;
  if (en) item('ترجمة تلقائية إلى العربية', async (b) => {
    const o = b.textContent;
    const vtt = await trSub(await window.api.text(en[0].url), p => (b.textContent = 'جارٍ الترجمة ' + p + '%'));
    b.textContent = o; setTrack(vtt);
  });
  first && first.click();
}

/* ===== فتح ملف من الجهاز (أي صيغة) + سحب وإفلات ===== */
const nOpenBtn = $('#nOpen'); if (nOpenBtn) nOpenBtn.onclick = async () => { try { const r = await window.api.media.open(); if (r) attach(r.url, { title: r.name }); } catch (e) { toast(errMsg(e)); } };
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files[0]; if (!f) return;
  try {
    const p = window.api.pathOf(f), pl = $('#pl');
    if (/\.(srt|vtt|ass|ssa|sub|sbv)$/i.test(p)) { if (pl && pl._setSub) { const t = await window.api.media.subFile(p); t && pl._setSub(t); toast('تمت إضافة الترجمة'); } return; }
    const r = await window.api.media.serve(p); attach(r.url, { title: r.name });
  } catch (err) { toast(errMsg(err)); }
});
$('#qb').onclick = () => { const v = $('#q').value.trim(); v && loadCatalog(v); };
view.onscroll = () => $('header').classList.toggle('solid', view.scrollTop > 40);
window.addEventListener('error', (e) => say('خطأ في البرنامج: ' + e.message));
window.addEventListener('unhandledrejection', (e) => say('خطأ: ' + errMsg(e.reason)));

/* ===== المصدر العربي (Animeify): أنمي مترجم/مدبلج بالعربية، روابط مباشرة ===== */
const arCache = new Map();
const arOk = (v) => v && v !== 'N/A' && v !== '0';
/* ===== «جديد»: الأنمي اللي ما شفناهش في المرات السابقة ===== */
const knownAtStart = new Set(store.get('known', []));
const firstRun = knownAtStart.size === 0;
const newIds = new Set();
function markKnown(list) {
  const k = store.get('known', []); const set = new Set(k);
  list.forEach(m => set.add(m.id));
  store.set('known', [...set].slice(-4000));
}
function flagNew(list) { if (!firstRun) list.forEach(m => { if (!knownAtStart.has(m.id)) newIds.add(m.id); }); }
const toast = (t) => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 4000); };

const arCard = (m) => {
  arCache.set(m.id, m);
  return `<div class="card" tabindex="0" data-id="${esc(m.id)}" data-type="ar">${newIds.has(m.id) ? '<span class="badge">جديد</span>' : ''}<img loading="lazy" src="${esc(m.poster)}" alt=""><p>${esc(m.name)}</p><div class="cm"><span>${esc(arOk(m.type) ? m.type : '')}${isDub(m) ? ' ' + I.mic + ' مدبلج' : ''}</span></div><div class="cm"><b class="rt">${arOk(m.score) ? esc(m.score) : ''}</b><button class="star" data-id="${esc(m.id)}" data-type="ar" data-name="${esc(m.name)}" data-poster="${esc(m.poster)}">${starSvg(isFavId(m.id))}</button></div></div>`;
};
const arGrid = (list) => '<div class="grid">' + list.map(arCard).join('') + '</div>';

/* ===== منع التكرار: نفس الأنمي ما يظهر مرتين (حتى لو جا من مصدرين أو بـ id مختلف) ===== */
const normT = (t) => String(t || '').toLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[^a-z0-9\u0600-\u06FF]+/g, '');
const keysOf = (m) => [...new Set([m.name, m.nameEn].map(normT).filter(k => k.length > 1))];
const newSeen = () => ({ ids: new Set(), keys: new Set() });
function dedupe(list, seen) {
  const out = [];
  for (const m of list) {
    if (!m || !m.id || seen.ids.has(m.id)) continue;
    const ks = keysOf(m);
    if (ks.some(k => seen.keys.has(k))) continue;
    seen.ids.add(m.id); ks.forEach(k => seen.keys.add(k)); out.push(m);
  }
  return out;
}

/* ===== أنمي من custom.json ===== */
const customMap = (c, i) => ({
  id: 'custom:' + (c.id || normT(c.nameEn || c.name) || i), name: c.name || c.nameEn || 'بدون اسم', nameEn: c.nameEn || '',
  poster: c.poster || '', logo: c.logo || '', genres: c.genres || '', score: c.score ? String(c.score) : '', synopsis: c.synopsis || '',
  type: c.type || '', status: c.status || '', season: '', src: 'custom', episodes: Array.isArray(c.episodes) ? c.episodes : [],
  dubbed: !!c.dubbed || /مدبلج|دبلج/.test((c.name || '') + ' ' + (c.nameEn || ''))
});
async function customList(strict) {
  try { const out = (await window.api.custom.list()).map(customMap); out.forEach(m => arCache.set(m.id, m)); return out; }
  catch (e) { if (strict) throw e; return []; }
}

/* ===== قسم «مدبلج» =====
   المصادر: (0) Stardima (دبلجة عربية، من ani-cli-arabic) (1) بحث «مدبلج/دبلجة» فـ WitAnime و Animeify  (2) أنمي custom.json اللي فيه "dubbed": true أو «مدبلج» فـ السمية
   (3) فهرس خارجي اختياري: حط رابط ملف JSON (نفس صيغة custom.json) فـ DUBBED_CATALOG_URL — مثلا رابط raw من GitHub. */
const DUBBED_CATALOG_URL = '';
const isDub = (m) => !!(m && (m.dubbed || /مدبلج|دبلج/.test(m.name || '')));
let dubRemoteP = null;
function dubbedRemote() {
  if (!DUBBED_CATALOG_URL) return Promise.resolve([]);
  if (!dubRemoteP) dubRemoteP = window.api.get(DUBBED_CATALOG_URL)
    .then(j => (Array.isArray(j) ? j : (j.anime || [])).map((c, i) => ({ ...customMap(c, i), dubbed: true })).map(m => (arCache.set(m.id, m), m)))
    .catch(() => { dubRemoteP = null; return []; });
  return dubRemoteP;
}
async function dubbedList() {
  const qs = ['مدبلج', 'دبلجة'];
  const [a4, sd, cu, rem, ...rs] = await Promise.all([
    a4uDubbed(),
    window.api.dub.list().then(l => l.map(m => (arCache.set(m.id, m), m))).catch(e => { console.log('[dub]', e && e.message); return []; }),
    customList().then(l => l.filter(isDub)), dubbedRemote(),
    ...qs.map(q => witSearch(q)), ...qs.map(q => window.api.ar.search(q).catch(() => []))
  ]);
  return dedupe([...a4, ...sd, ...cu, ...rem, ...rs.flat().map(m => ({ ...m, dubbed: true }))], newSeen());
}

/* ===== WitAnime (منقول من anime_scraper) — التحليل بـ DOMParser ===== */
/* إذا تغيّر نطاق WitAnime زيد النطاق الجديد فـ أول القائمة WIT_HOSTS (كيجرّب الباقي وحدو) */
const WIT_HOSTS = ['https://witanime.art/', 'https://witanime.you/', 'https://witanime.com/', 'https://witanime.world/'];
let WIT = WIT_HOSTS[0];
async function witHtml(u) {
  let path = String(u || '');
  if (/^https?:/i.test(path)) { try { const x = new URL(path); path = x.pathname + x.search; } catch {} }
  path = path.replace(/^\//, '');
  for (const h of [WIT, ...WIT_HOSTS.filter(x => x !== WIT)]) {
    try {
      const t = await window.api.html(h + path);
      if (t && t.length > 500) { WIT = h; return new DOMParser().parseFromString(t, 'text/html'); }
    } catch (e) {}
  }
  throw new Error('تعذّر الاتصال بـ WitAnime (جرّب تغيير النطاق في WIT_HOSTS)');
}
const abs = (h) => { try { return new URL(h, WIT).href; } catch { return ''; } };
const witSlug = (href) => {
  try { const p = new URL(href, WIT).pathname.split('/').filter(Boolean); const i = p.indexOf('anime'); return p[i >= 0 ? i + 1 : p.length - 1] || ''; } catch { return ''; }
};
const imgOf = (el) => { const i = el && el.querySelector('img'); if (!i) return ''; const s = i.getAttribute('src') || ''; return abs(s.startsWith('data:') ? (i.getAttribute('data-src') || '') : (s || i.getAttribute('data-src') || '')); };
const witCard = (c) => {
  const a = c.querySelector('.anime-card-title h3 > a') || c.querySelector('h3 > a');
  if (!a) return null;
  const url = abs(a.getAttribute('href')), slug = witSlug(url);
  if (!slug) return null;
  const story = (c.querySelector('.anime-card-title') || {}).getAttribute ? c.querySelector('.anime-card-title').getAttribute('data-content') : '';
  const t = c.querySelector('.anime-card-type a'), st = c.querySelector('.anime-card-status a');
  const m = { id: 'wit:' + slug, name: a.textContent.trim(), nameEn: '', poster: imgOf(c), genres: '', score: '', synopsis: story || '',
    type: t ? t.textContent.trim() : '', status: st ? st.textContent.trim() : '', url, src: 'wit' };
  arCache.set(m.id, m); return m;
};
const witCards = (doc) => [...doc.querySelectorAll('.anime-card-container')].map(witCard).filter(Boolean);
const witCache = new Map();
async function witSearch(q) {
  q = String(q || '').trim(); if (!q) return [];
  if (!witCache.has(q)) witCache.set(q, witHtml(`?search_param=animes&s=${encodeURIComponent(q)}`).then(witCards).catch(() => { witCache.delete(q); return []; }));
  return witCache.get(q);
}
async function witLatest() { try { return witCards(await witHtml('episode')); } catch { return []; } }
async function witSeason() {
  try {
    const home = await witHtml(WIT);
    const a = home.querySelector('#menu-item-107 a'); if (!a) return [];
    return witCards(await witHtml(abs(a.getAttribute('href'))));
  } catch { return []; }
}

/* ===== anime4up — مصدر الأنمي المدبلج (نفس قالب WitAnime) =====
   إذا تغيّر النطاق (كيتبدّل بزاف) زيد النطاق الجديد فـ أول القائمة A4U_HOSTS */
const A4U_HOSTS = ['https://anime4up.rest/', 'https://w1.anime4up.rest/', 'https://anime4up.cam/', 'https://anime4up.pro/'];
let a4uBase = A4U_HOSTS[0];
const a4uAbs = (h) => { try { return new URL(h, a4uBase).href; } catch { return ''; } };
async function a4uHtml(u) {
  const isAbs = /^https?:/i.test(u), bad = [];
  const order = [a4uBase, ...A4U_HOSTS.filter(h => h !== a4uBase)];
  let path = u;
  if (isAbs) { try { const x = new URL(u); path = x.pathname + x.search; } catch {} }
  path = path.replace(/^\//, '');
  for (const h of order) {
    try {
      const t = await window.api.html(h + path);
      if (t && t.length > 500) { a4uBase = h; return new DOMParser().parseFromString(t, 'text/html'); }
    } catch (e) { bad.push(h); }
  }
  throw new Error('تعذّر الاتصال بـ anime4up (جرّب تغيير النطاق في A4U_HOSTS)');
}
const a4uSlug = (href) => { try { const p = new URL(href, a4uBase).pathname.split('/').filter(Boolean); const i = p.indexOf('anime'); return p[i >= 0 ? i + 1 : p.length - 1] || ''; } catch { return ''; } };
const a4uImg = (el) => { const i = el && el.querySelector('img'); if (!i) return ''; const s = i.getAttribute('src') || ''; return a4uAbs(s.startsWith('data:') ? (i.getAttribute('data-src') || '') : (s || i.getAttribute('data-src') || '')); };
const a4uCard = (c) => {
  const a = c.querySelector('.anime-card-title h3 > a') || c.querySelector('h3 > a') || c.querySelector('a[href*="/anime/"]');
  if (!a) return null;
  const url = a4uAbs(a.getAttribute('href')), slug = a4uSlug(url);
  if (!slug) return null;
  const t = c.querySelector('.anime-card-type a'), st = c.querySelector('.anime-card-status a');
  const tt = c.querySelector('.anime-card-title'), story = tt ? (tt.getAttribute('data-content') || '') : '';
  const name = (a.textContent || '').trim() || (c.querySelector('img') || {}).alt || '';
  const m = { id: 'a4u:' + slug, name, nameEn: '', poster: a4uImg(c), genres: '', score: '', synopsis: story,
    type: t ? t.textContent.trim() : '', status: st ? st.textContent.trim() : '', url, src: 'a4u', dubbed: true };
  arCache.set(m.id, m); return m;
};
const a4uCards = (doc) => [...doc.querySelectorAll('.anime-card-container')].map(a4uCard).filter(Boolean);
const a4uCache = new Map();
async function a4uSearch(q) {
  q = String(q || '').trim(); if (!q) return [];
  if (!a4uCache.has(q)) a4uCache.set(q, a4uHtml(`?search_param=animes&s=${encodeURIComponent(q)}`).then(a4uCards).catch(() => { a4uCache.delete(q); return []; }));
  return a4uCache.get(q);
}
const A4U_DUB_RE = /مدبلج|دبلج|dubbed|dub\b/i;
let a4uDubP = null;
/* الأنمي المدبلج من anime4up: صفحات قسم المدبلج (إن وُجد) + بحث «مدبلج» و«دبلجة» (عدة صفحات) */
function a4uDubbed() {
  if (a4uDubP) return a4uDubP;
  const pages = (base, n) => Array.from({ length: n }, (_, i) => {
    if (!i) return base;
    const q = base.indexOf('?');
    return q < 0 ? `${base}page/${i + 1}/` : `${base.slice(0, q)}page/${i + 1}/${base.slice(q)}`;   // WordPress: page/2/?s=…
  });
  const urls = [
    ...pages('anime-type/dubbed/', 4),
    ...pages('?search_param=animes&s=' + encodeURIComponent('مدبلج'), 5),
    ...pages('?search_param=animes&s=' + encodeURIComponent('دبلجة'), 2)
  ];
  a4uDubP = Promise.all(urls.map(u => a4uHtml(u).then(a4uCards).catch(() => []))).then(r => {
    const all = r.flat(), onlyDub = all.filter(m => A4U_DUB_RE.test(m.name));
    const out = onlyDub.length ? onlyDub : all;     // إلا السمية ما فيهاش «مدبلج» نخليو كلشي (النتائج أصلاً من بحث المدبلج)
    out.forEach(m => { m.dubbed = true; });
    if (!out.length) a4uDubP = null;
    return out;
  }).catch(() => { a4uDubP = null; return []; });
  return a4uDubP;
}
async function a4uEpisodes(id) {
  const m = arCache.get(id), slug = id.replace(/^a4u:/, '');
  const doc = await a4uHtml(m && m.url ? m.url : `anime/${slug}/`);
  const eps = [...doc.querySelectorAll('.episodes-card')].map((c, i) => {
    const a = c.querySelector('.episodes-card-title h3 > a') || c.querySelector('h3 > a') || c.querySelector('a[href]'); if (!a) return null;
    return { num: lastNum(a.textContent) || String(i + 1), url: a4uAbs(a.getAttribute('href')) };
  }).filter(Boolean);
  const seen = new Set();
  return eps.filter(e => (seen.has(e.url) ? false : (seen.add(e.url), true))).sort((a, b) => parseFloat(a.num) - parseFloat(b.num));
}
async function a4uDetails(id) {
  const m = arCache.get(id) || { id, name: id.replace(/^a4u:/, ''), nameEn: '', poster: '', genres: '', score: '', synopsis: '', src: 'a4u', dubbed: true };
  try {
    const doc = await a4uHtml(m.url || `anime/${id.replace(/^a4u:/, '')}/`);
    const h = doc.querySelector('h1.anime-details-title'), g = [...doc.querySelectorAll('ul.anime-genres a')].map(x => x.textContent.trim());
    const st = doc.querySelector('p.anime-story');
    if (h) m.name = h.textContent.trim();
    if (g.length) m.genres = g.join(',');
    if (st) m.synopsis = st.textContent.trim();
    if (!m.poster) m.poster = a4uImg(doc.querySelector('.anime-thumbnail, .anime-info-container, .anime-page-container') || doc.body);
  } catch {}
  m.dubbed = true; arCache.set(id, m); return m;
}
/* سيرفرات المشاهدة + روابط التحميل ديال الحلقة (روابط مباشرة، base64، أو iframe) */
async function siteServers(kind, epUrl) {
  const doc = kind === 'a4u' ? await a4uHtml(epUrl) : await witHtml(epUrl), out = [], seen = new Set();
  const selfHost = kind === 'a4u' ? hostOf(a4uBase) : hostOf(WIT);
  const b64 = (x) => { try { let b = String(x).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return atob(b); } catch { return ''; } };
  const urlOf = (raw) => {
    raw = String(raw || '').trim(); if (!raw) return '';
    let m = raw.match(/https?:\/\/[^\s"'<>]+/); if (m) return m[0].replace(/&amp;/g, '&');
    if (raw.startsWith('//')) return 'https:' + raw;
    const d = b64(raw); m = d.match(/https?:\/\/[^\s"'<>]+/); return m ? m[0].replace(/&amp;/g, '&') : '';
  };
  const push = (label, raw) => {
    const u = urlOf(raw);
    if (!u || seen.has(u) || /(facebook|twitter|telegram|t\.me|discord|disqus|google|doubleclick)\./i.test(u) || hostOf(u) === selfHost) return;
    seen.add(u); out.push({ label: (label || '').replace(/\s+/g, ' ').trim(), url: u });
  };
  doc.querySelectorAll('[data-ep-url]').forEach(a => push(a.textContent, a.getAttribute('data-ep-url')));
  doc.querySelectorAll('#episode-servers iframe[src], .episode-container iframe[src], iframe[src]').forEach(f => push('مشاهدة', f.getAttribute('src')));
  doc.querySelectorAll('ul.quality-list').forEach(ul => {
    const q = ((ul.querySelector('li') || {}).textContent || '').trim();
    ul.querySelectorAll('a[href]').forEach(a => push('تحميل ' + q + ' ' + a.textContent, a.getAttribute('href')));
  });
  doc.querySelectorAll('#download a[href], .download-links a[href]').forEach(a => push('تحميل ' + a.textContent, a.getAttribute('href')));
  return out;
}
const a4uServers = (u) => siteServers('a4u', u);
async function witMatch(m) {
  const ks = keysOf(m);
  for (const q of [m.nameEn, m.name].filter(Boolean)) {
    const r = await witSearch(q);
    const hit = r.find(x => keysOf(x).some(k => ks.includes(k)));
    if (hit) return hit;
  }
  return null;
}
const lastNum = (t) => { const x = String(t || '').match(/(\d+(?:\.\d+)?)(?!.*\d)/); return x ? x[1] : ''; };
async function witEpisodes(id) {
  const m = arCache.get(id), slug = id.replace(/^wit:/, '');
  const doc = await witHtml(m && m.url ? m.url : `anime/${slug}/`);
  const eps = [...doc.querySelectorAll('.episodes-card')].map((c, i) => {
    const a = c.querySelector('h3 > a'); if (!a) return null;
    return { num: lastNum(a.textContent) || String(i + 1), url: abs(a.getAttribute('href')) };
  }).filter(Boolean);
  return eps.sort((a, b) => parseFloat(a.num) - parseFloat(b.num));
}
async function witDetails(id) {
  const m = arCache.get(id) || { id, name: id.replace(/^wit:/, ''), nameEn: '', poster: '', genres: '', score: '', synopsis: '', src: 'wit' };
  try {
    const doc = await witHtml(m.url || `anime/${id.replace(/^wit:/, '')}/`);
    const h = doc.querySelector('h1.anime-details-title'), g = [...doc.querySelectorAll('ul.anime-genres a')].map(x => x.textContent.trim());
    const st = doc.querySelector('p.anime-story');
    if (h) m.name = h.textContent.trim();
    if (g.length) m.genres = g.join(',');
    if (st) m.synopsis = st.textContent.trim();
    if (!m.poster) m.poster = imgOf(doc.querySelector('.anime-thumbnail, .anime-info-container, .anime-page-container') || doc.body);
  } catch {}
  arCache.set(id, m); return m;
}
async function witQualities(epUrl) {
  const doc = await witHtml(epUrl), out = [];
  doc.querySelectorAll('ul.quality-list').forEach(ul => {
    const q = (ul.querySelector('li') || {}).textContent;
    const links = [...ul.querySelectorAll('a')].map(a => {
      try { let b = (a.getAttribute('href') || '').replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const u = atob(b); return /^https?:\/\//i.test(u) ? u : null; } catch { return null; }
    }).filter(Boolean);
    if (links.length) out.push({ q: (q || '').trim(), links });
  });
  return out;
}
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
async function tryPlayLink(u) {   // يشغّل داخل المشغّل؛ كيرجع false إلا السيرفر ما قدرناش نفتحوه داخل التطبيق
  if (/mediafire\./i.test(hostOf(u))) { const d = await window.api.ar.direct(u).catch(() => null); if (d) { play({ url: d }); return true; } }
  if (/\.(mp4|m3u8|webm|mkv)(\?|$)/i.test(u)) { play({ url: u }); return true; }
  const rh = await window.api.resolveHost(u).catch(() => null);   // Uqload / Mixdrop / Streamtape / Dood / OK.ru / Streamwish… → داخل المشغّل
  if (rh && rh.url) { play({ url: rh.url }); return true; }
  return false;
}
/* سيرفر ما قدرناش نفكّو رابطو المباشر (كيحتاج Referer…): نفتحوه كـ embed داخل التطبيق (iframe) مع زر «فتح في المتصفح» */
function embedPlay(u) {
  closePlayer();
  const title = ($('.hero h2') || {}).textContent || '', ep = ($('.eps button.on') || {}).textContent || '';
  const pl = document.createElement('div'); pl.id = 'pl';
  pl.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#000;display:flex;flex-direction:column';
  pl.innerHTML = `<style>#pl #pzoom{display:none!important}</style><div class="pbox" style="display:flex;flex-direction:column;height:100vh;height:100dvh;background:#000"><video style="display:none"></video>
    <div style="display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;background:#0b0b10;color:#fff"><b style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title)} ${esc(ep)} <small style="color:#999;font-weight:400">· ${esc(hostOf(u))}</small></b><button id="pxo" style="background:#333;color:#fff;border:0;border-radius:8px;padding:8px 12px">فتح في المتصفح</button><button id="pfs" title="ملء الشاشة" style="background:#333;color:#fff;border:0;border-radius:8px;padding:8px 12px">${I.full}</button><button id="pxc" style="background:#e50914;color:#fff;border:0;border-radius:8px;padding:8px 12px">${I.close}</button></div>
    <iframe src="${esc(u)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen style="flex:1;width:100%;border:0;background:#000"></iframe></div>`;
  document.body.appendChild(pl);
  pl.querySelector('#pxc').onclick = () => closePlayer();
  pl.querySelector('#pxo').onclick = () => window.api.openExternal(u);
  plKey = (e) => { if (e.key === 'Escape') closePlayer(); };
  document.addEventListener('keydown', plKey);
}
async function playWitLink(u) { if (!(await tryPlayLink(u))) embedPlay(u); }
const lkBtn = (t, u, dub) => ({ t: (dub ? '@@mic@@ ' : '') + t, u, f: () => playWitLink(u), try: () => tryPlayLink(u) });

/* Anime3rb: صفحة الحلقة → روابط التحميل (جودات) → رابط مباشر → المشغّل (كيخدم غير فـ نسخة ويندوز، بسبب Cloudflare) */
async function a3rButtons(epUrl) {
  if (!epUrl || !window.api.htmlBrowser || !window.api.a3r) return [];
  let html; try { html = await window.api.htmlBrowser(epUrl); } catch { return []; }
  const doc = new DOMParser().parseFromString(html, 'text/html'), found = [];
  const has = (x) => x.querySelector('label') && x.querySelector('a');
  [...doc.querySelectorAll('div')].filter(d => /^download\./.test(d.getAttribute('wire:key') || '')).forEach(blk => {
    const sm = blk.querySelector('small'), tr = sm ? sm.textContent.replace('ترجمة', '').trim() : '';
    [...blk.querySelectorAll('div')].forEach(d => {
      if (!has(d) || [...d.children].some(c => c.tagName === 'DIV' && has(c))) return;
      const a = d.querySelector('a'), lb = d.querySelector('label'), label = lb.textContent.trim(), href = a.getAttribute('href');
      if (!href || /HEVC/i.test(label) || found.some(x => x.href === href)) return;
      found.push({ href, label, size: a.textContent.trim().replace(/\s+/g, ' '), tr });
    });
  });
  return found.slice(0, 8).map(x => {
    const run = async () => {
      const r = await window.api.a3r.direct(x.href).catch(() => null);
      if (r && r.url) { play({ url: r.url }); return true; }
      return false;
    };
    return { t: `Anime3rb · ${x.tr ? x.tr + ' · ' : ''}${x.label} · ${x.size}`, dlf: async () => { const r = await window.api.a3r.direct(x.href).catch(() => null); return r && r.url; }, f: async () => { toast('جارٍ تحضير الرابط…'); if (!(await run())) { toast('تعذّر التشغيل داخل المشغّل — تم فتحها في المتصفح'); window.api.openExternal(epUrl); } }, try: run };
  });
}

/* سيرفرات نفس الحلقة من المواقع الأخرى (WitAnime / Anime4up): نقلبو بالاسم ونجيبو نفس رقم الحلقة */
const xEpCache = new Map();
async function crossButtons({ names, ep, skip = [], have = new Set() }) {
  names = (names || []).filter(Boolean);
  const ks = names.map(epAnimeKey).filter(Boolean); if (!ks.length) return [];
  const kinds = [['wit', witSearch, witEpisodes, 'WitAnime', false], ['a4u', a4uSearch, a4uEpisodes, 'Anime4up', true]].filter(k => !skip.includes(k[0]));
  const lists = await Promise.all(kinds.map(([kind, search, episodes, label, dub]) => epWithTimeout((async () => {
    let hit = null;
    for (const q of names) { const r = await search(q); hit = r.find(x => ks.some(k => epSame(k, epAnimeKey(x.name)))); if (hit) break; }
    if (!hit) return [];
    if (!xEpCache.has(hit.id)) xEpCache.set(hit.id, episodes(hit.id));
    const eps = await xEpCache.get(hit.id), e = eps.find(x => parseFloat(x.num) === parseFloat(ep));
    if (!e) return [];
    return (await siteServers(kind, e.url)).map(x => lkBtn(`${label} · ${x.label || 'سيرفر'} · ${hostOf(x.url)}`, x.url, dub));
  })(), 20000).catch(() => [])));
  if (!skip.includes('afy')) lists.push(await epWithTimeout((async () => {          // Animeify (Mediafire مباشر) لنفس الحلقة
    for (const q of names) {
      const r = await window.api.ar.search(q).catch(() => []);
      const hit = r.find(x => ks.some(k => epSame(k, epAnimeKey(x.name)) || epSame(k, epAnimeKey(x.nameEn))));
      if (!hit) continue;
      const eps = await window.api.ar.episodes(hit.id), e = eps.find(x => (x.type || 'Episode') === 'Episode' && parseFloat(x.num) === parseFloat(ep));
      if (!e) return [];
      return (await window.api.ar.streams(e.raw).catch(() => [])).map(x => ({ t: `Animeify · Mediafire · ${x.q}`, u: x.url, du: x.url, dd: true, f: () => play({ url: x.url }), try: async () => { play({ url: x.url }); return true; } }));
    }
    return [];
  })(), 20000).catch(() => []));
  return lists.flat().filter(b => !have.has(b.u) && (have.add(b.u), true));
}
function streamsHtml(btns) {
  const ok = btns.filter(b => b.try).slice(0, 30);
  if (ok.length >= 2) btns.unshift({ t: '@@bolt@@ تشغيل تلقائي (أول سيرفر يخدم داخل المشغّل)', f: async () => {
    toast('جارٍ تجربة السيرفرات…');
    for (const b of ok) { try { if (await b.try()) return; } catch {} }
    const emb = btns.find(b => b.u && b.u !== undefined);
    if (emb) { toast('لم نجد سيرفرًا مباشرًا — سنفتح أول سيرفر داخل التطبيق'); return embedPlay(emb.u); }
    toast('لم نجد أي سيرفر يعمل داخل المشغّل — جرّب سيرفرًا يدويًا');
  } });
  if (window.waDlEntry && !btns.some(b => b.dl)) btns.push(window.waDlEntry(btns));   // زر «تحميل الحلقة» تحت السيرفرات
  window.__srvBtns = btns;   // باش أيقونات التحميل (downloads.js) تعرف السيرفر ديالها
  return '<div class="streams">' + btns.map((x, i) => {
    const b = `<button data-i="${i}"${x.dl ? ' class="dlb"' : ''}>${x.dl ? '' : I.play} ${esc(x.t).replace('@@mic@@', I.mic).replace('@@bolt@@', I.bolt).replace('@@dl@@', window.waDlIcon || '')}</button>`;
    if (x.dl || !window.waDlIcon || !(x.u || x.du || x.dlf)) return b;
    return `<div class="srow">${b}<span class="sdl" role="button" tabindex="0" data-di="${i}" title="تحميل من هذا السيرفر">${window.waDlIcon}</span></div>`;
  }).join('') + '</div><div id="player"></div>';
}

const AR_GENRES = [["أكشن", "Action"], ["مغامرة", "Adventure"], ["كوميدي", "Comedy"], ["دراما", "Drama"], ["خيال", "Fantasy"], ["رعب", "Horror"], ["غموض", "Mystery"], ["نفسي", "Psychological"], ["رومانسي", "Romance"], ["خيال علمي", "Sci-Fi"], ["الحياة اليومية", "Slice-Of-Life"], ["رياضي", "Sports"], ["خارق للطبيعة", "Supernatural"], ["تشويق", "Thriller"], ["ميكا", "Mecha"], ["موسيقى", "Music"], ["إيتشي", "Ecchi"], ["فتاة سحرية", "Mahou-Shoujo"], ["إيسيكاي", "Isekai"], ["شونين", "Shounen"], ["سينين", "Seinen"], ["شوجو", "Shoujo"], ["جوسي", "Josei"], ["مدرسي", "School"], ["حريم", "Harem"], ["عسكري", "Military"], ["تاريخي", "Historical"], ["قوى خارقة", "Super-Power"], ["سحر", "Magic"], ["أساطير", "Mythology"], ["طعام", "Gourmet"], ["فضاء", "Space"], ["بوليسي", "Detective"], ["سفر عبر الزمن", "Time-Travel"], ["مصاصي دماء", "Vampire"], ["سايبربانك", "Cyberpunk"], ["فنون قتالية", "Martial-Arts"], ["ساموراي", "Samurai"], ["بطولة راشدين", "Adult-Cast"]];
/* خريطة التصنيف → AniList: g = genre رسمي، t = tag (موضوع/فئة) */
const ALG = { 'Action': ['g', 'Action'], 'Adventure': ['g', 'Adventure'], 'Comedy': ['g', 'Comedy'], 'Drama': ['g', 'Drama'], 'Fantasy': ['g', 'Fantasy'], 'Horror': ['g', 'Horror'], 'Mystery': ['g', 'Mystery'], 'Psychological': ['g', 'Psychological'], 'Romance': ['g', 'Romance'], 'Sci-Fi': ['g', 'Sci-Fi'], 'Slice-Of-Life': ['g', 'Slice of Life'], 'Sports': ['g', 'Sports'], 'Supernatural': ['g', 'Supernatural'], 'Thriller': ['g', 'Thriller'], 'Suspense': ['g', 'Thriller'], 'Mecha': ['g', 'Mecha'], 'Music': ['g', 'Music'], 'Ecchi': ['g', 'Ecchi'], 'Mahou-Shoujo': ['g', 'Mahou Shoujo'],
  'Isekai': ['t', 'Isekai'], 'Shounen': ['t', 'Shounen'], 'Seinen': ['t', 'Seinen'], 'Shoujo': ['t', 'Shoujo'], 'Josei': ['t', 'Josei'], 'School': ['t', 'School'], 'Harem': ['t', 'Harem'], 'Military': ['t', 'Military'], 'Historical': ['t', 'Historical'], 'Super-Power': ['t', 'Super Power'], 'Magic': ['t', 'Magic'], 'Mythology': ['t', 'Mythology'], 'Gourmet': ['t', 'Food'], 'Space': ['t', 'Space'], 'Detective': ['t', 'Detective'], 'Time-Travel': ['t', 'Time Manipulation'], 'Vampire': ['t', 'Vampire'], 'Cyberpunk': ['t', 'Cyberpunk'], 'Martial-Arts': ['t', 'Martial Arts'], 'Samurai': ['t', 'Samurai'], 'Adult-Cast': ['t', 'Adult Cast'] };
const alGenreOf = (v) => ALG[v] || ['g', String(v || '').replace(/-/g, ' ')];
const alToM = (x) => ({ id: 'al:' + x.id, name: x.title, nameEn: x.romaji, poster: x.img, score: x.score ? (x.score / 10).toFixed(1) : '', type: x.format, eps: x.eps, al: true, genres: '', synopsis: '' });
function alCard(m) {
  return `<div class="card alc" tabindex="0" data-q="${esc(m.name)}" data-q2="${esc(m.nameEn)}"><img loading="lazy" src="${esc(m.poster)}" alt=""><p>${esc(m.name)}</p><div class="cm"><span>${esc(m.type || '')}${m.eps ? ' · ' + esc(m.eps) + ' حلقة' : ''}</span></div><div class="cm"><b class="rt">${esc(m.score || '')}</b></div></div>`;
}
const anyCard = (m) => (m.al ? alCard(m) : arCard(m));
const AR_SECS = [['EPS', 'آخر الحلقات'], ['latest', 'آخر الإضافات'], ['DUBBED', 'مدبلج'], ['POPULARITY', 'الأكثر شعبية'], ['HIGHEST_RATE', 'الأعلى تقييماً'], ['AIRING', 'يُعرض حالياً'], ['SEASON', 'أنمي الموسم'], ['SCHEDULE', 'جدول الحلقات']];
const AR_TYPES = [['SERIES', 'مسلسلات'], ['MOVIE', 'أفلام'], ['OVA', 'OVA'], ['SPECIAL', 'خاصة']];
const AR_PAGE = 48;

/* ===== جدول الحلقات القادمة (7 أيام) — من AniList، والضغط على أنمي كيقلب عليه فـ المصادر ===== */
async function scheduleHtml() {
  const list = await window.api.schedule(7);
  if (!list.length) return '<p class="mute">لم نجد جدول حلقات حاليًا.</p>';
  const dayKey = (t) => { const d = new Date(t * 1000); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
  const todayK = dayKey(Date.now() / 1000);
  const days = new Map();
  list.forEach(x => { const k = dayKey(x.at); if (!days.has(k)) days.set(k, []); days.get(k).push(x); });
  return [...days.entries()].map(([k, items]) => {
    const d = new Date(items[0].at * 1000);
    const head = (k === todayK ? 'اليوم · ' : '') + d.toLocaleDateString('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
    return `<h3 style="margin:26px 0 12px">${esc(head)} <span class="mute" style="font-size:13px">(${items.length})</span></h3><div class="grid">`
      + items.map(x => `<div class="card sch" tabindex="0" data-q="${esc(x.title)}" data-q2="${esc(x.romaji)}"><img loading="lazy" src="${esc(x.img)}" alt=""><p>${esc(x.title)}</p><div class="cm"><span>الحلقة ${esc(x.ep)}</span><b class="rt">${esc(new Date(x.at * 1000).toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' }))}</b></div></div>`).join('') + '</div>';
  }).join('');
}
/* مطابقة دقيقة: نختار الأنمي الصحيح (نفس الاسم + نفس الموسم) وما نفتحوش أنمي آخر بالغلط */
const _seasonOf = (t) => {
  t = String(t || '').toLowerCase();
  let m = t.match(/(?:season|s|part|cour)\s*(\d+)/) || t.match(/(\d+)(?:st|nd|rd|th)\s*season/);
  if (m) return +m[1];
  if (/\b(iii)\b/.test(t)) return 3; if (/\b(ii)\b/.test(t)) return 2; if (/\b(iv)\b/.test(t)) return 4;
  m = t.match(/\s(\d)\s*$/); return m ? +m[1] : 1;
};
const _tok = (t) => new Set(normT(t).split(/\s+/).filter(w => w.length > 1));
function _score(cand, titles) {
  let best = 0;
  const names = [cand.name, cand.nameEn].filter(Boolean);
  for (const a of titles) {
    const A = _tok(a); if (!A.size) continue;
    for (const n of names) {
      if (normT(n) === normT(a)) return 1 - (_seasonOf(n) === _seasonOf(a) ? 0 : 0.5);
      const B = _tok(n); if (!B.size) continue;
      let inter = 0; A.forEach(w => { if (B.has(w)) inter++; });
      let sc = inter / Math.max(A.size, B.size);
      if (_seasonOf(n) !== _seasonOf(a)) sc *= 0.5;
      best = Math.max(best, sc);
    }
  }
  return best;
}
async function openByTitle(c) {
  const t = c.dataset.q, r = c.dataset.q2 || t;
  toast('جارٍ فتح «' + t + '»…');
  try {
    const titles = [...new Set([t, r].filter(Boolean))];
    const batches = await Promise.all(titles.map(q => Promise.all([window.api.ar.search(q).catch(() => []), witSearch(q)])));
    const pool = dedupe(batches.flat(2), newSeen());
    let hit = null, hs = 0;
    for (const m of pool) { const sc = _score(m, titles); if (sc > hs) { hs = sc; hit = m; } }
    if (hit && hs >= 0.6) { arCache.set(hit.id, hit); return openAr(hit.id, c.dataset.ep || undefined); }
  } catch {}
  arLoadCatalog(r);   // ما لقيناش تطابق مؤكد: نعرضو نتائج البحث باش تختار نتا
}
function bindSchedule(box) {
  box.querySelectorAll('.sch').forEach(c => {
    const go = () => openByTitle(c);
    c.onclick = go; c.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  });
}

/* ===== آخر الحلقات الحقيقية: من anime4up + WitAnime + Stardima (مدبلج) — بدون AniList ===== */
function siteEpCards(doc, kind) {
  const A = kind === 'a4u' ? a4uAbs : abs, SL = kind === 'a4u' ? a4uSlug : witSlug, IM = kind === 'a4u' ? a4uImg : imgOf;
  return [...doc.querySelectorAll('.episodes-card')].map(c => {
    const ea = c.querySelector('.episodes-card-title a') || c.querySelector('h3 a'), aa = c.querySelector('.ep-card-anime-title a, a[href*="/anime/"]');
    if (!ea) return null;
    const etitle = ea.textContent.trim(), num = lastNum(etitle);
    const name = ((aa && aa.textContent.trim()) || etitle.replace(/\s*(?:الحلقة|الحلقه|episode|ep)?\s*\d+(?:\.\d+)?\s*$/i, '')).trim();
    const slug = aa ? SL(A(aa.getAttribute('href'))) : '';
    if (!name || !num) return null;
    return { id: slug ? kind + ':' + slug : '', name, ep: num, poster: IM(c), src: kind, dubbed: kind === 'a4u' && A4U_DUB_RE.test(name + ' ' + etitle) };
  }).filter(Boolean);
}
/* ===================================================================
   آخر الحلقات = 4 أدوات (كل وحدة تخدم بروحها) + مدير واحد يجمعهم ويمنع تكرار الأنمي
   الأدوات: Anime3rb · WitAnime · Anime4up · Animeify   (+ Stardima للمدبلج)
   =================================================================== */
// أداة 1: Anime3rb (JSON-LD فـ الصفحة الرئيسية — منقول من Anime3rbDL). محمي بـ Cloudflare: نجربو عادي ثم متصفح مخفي (ويندوز)
const A3R = 'https://anime3rb.com/';
async function a3rLatest() {
  let html = '';
  try { html = await window.api.html(A3R); } catch {}
  if (!/application\/ld\+json/.test(html)) {
    if (!window.api.htmlBrowser) throw new Error('محمي بـ Cloudflare (يعمل في نسخة ويندوز فقط)');
    html = await window.api.htmlBrowser(A3R).catch(() => { throw new Error('محمي بـ Cloudflare (يعمل في نسخة ويندوز فقط)'); });
  }
  const doc = new DOMParser().parseFromString(html, 'text/html'), out = [];
  const find = (d, name) => {
    if (Array.isArray(d)) { for (const x of d) { const r = find(x, name); if (r) return r; } return null; }
    if (d && typeof d === 'object') {
      if (d['@type'] === 'ItemList' && d.name === name) return d.itemListElement || [];
      for (const v of Object.values(d)) { const r = find(v, name); if (r) return r; }
    }
    return null;
  };
  for (const sc of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let j; try { j = JSON.parse(sc.textContent); } catch { continue; }
    const items = find(j, 'أحدث الحلقات'); if (!items) continue;
    items.forEach(it => {
      it = it.item || it;
      const u = String(it.url || ''), m = u.match(/\/episode\/([^/]+)\/(\d+(?:\.\d+)?)\/?$/);
      if (!m) return;
      const name = String(it.name || '').replace(/\s*(?:الحلقة|الحلقه)?\s*\d+(?:\.\d+)?\s*$/, '').replace(/\s*(?:الحلقة|الحلقه)\s*$/, '').trim();
      if (name) out.push({ id: '', name, ep: m[2], poster: it.image || '', src: 'a3r', url: u, dubbed: false });
    });
    if (out.length) break;
  }
  if (!out.length) throw new Error('لم نجد قائمة الحلقات في الصفحة');
  return out;
}
// أداة 2: WitAnime  |  أداة 3: Anime4up  (نفس القالب)
const witLatestEps = () => witHtml('episode').then(d => siteEpCards(d, 'wit'));
const a4uLatestEps = () => a4uHtml('episode/').then(d => siteEpCards(d, 'a4u'));
// أداة 4: Animeify — ما عندوش feed ديال الحلقات: نجيبو آخر أنمي مضاف ونقرا آخر حلقة حقيقية فـ كل واحد
async function afyLatestEpisodes() {
  const list = await window.api.ar.list({ latest: true, limit: 26, from: 0 });
  const res = await Promise.all(list.filter(m => !/movie|film|فيلم/i.test(m.type || '')).slice(0, 22).map(async m => {
    try {
      const eps = (await window.api.ar.episodes(m.id)).filter(e => (e.type || 'Episode') === 'Episode' && parseFloat(e.num) > 0);
      if (!eps.length) return null;
      arCache.set(m.id, m);
      return { id: m.id, name: m.name, alt: m.nameEn, ep: String(eps[eps.length - 1].num), poster: m.poster, src: 'afy', dubbed: isDub(m) };
    } catch { return null; }
  }));
  return res.filter(Boolean);
}
const sdLatestEps = () => window.api.dub.latest().then(l => l.map(m => ({ id: m.id, name: m.name, ep: m.ep, poster: m.poster, src: 'sd', dubbed: true })));

const EP_TOOLS = [
  { key: 'a3r', name: 'Anime3rb', run: a3rLatest },
  { key: 'wit', name: 'WitAnime', run: witLatestEps },
  { key: 'a4u', name: 'Anime4up', run: a4uLatestEps },
  { key: 'afy', name: 'Animeify', run: afyLatestEpisodes },
  { key: 'sd', name: 'Stardima (مدبلج)', run: sdLatestEps }
];
const epWithTimeout = (p, ms) => Promise.race([p, new Promise((_, rj) => setTimeout(() => rj(new Error('انتهى الوقت')), ms))]);

/* مدير الأنمي: اسم موحّد (بلا «مترجم/مدبلج/الحلقة…») + نفس الأنمي من عدة مواقع = بطاقة وحدة بأعلى حلقة */
const epBaseName = (n) => String(n || '')
  .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
  .replace(/(?:الحلقة|الحلقه|حلقة|episode|ep)\s*\d+(?:\.\d+)?/gi, ' ')
  .replace(/(^|\s)(?:مترجم[ةه]?|مدبلج[ةه]?|اون\s*لاين|أون\s*لاين|online|dubbed|subbed|الاخيرة|الأخيرة)(?=\s|$)/gi, ' ')
  .replace(/\s+/g, ' ').trim();
const epAnimeKey = (n) => normT(epBaseName(n));
function epSame(a, b) {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 7 && l.includes(s) && _seasonOf(a) === _seasonOf(b) && s.length / l.length >= 0.8;
}
const epKey = (x) => (x.akey || epAnimeKey(x.name)) + '#' + x.ep;
function epMerge(batches) {
  const order = ['afy', 'a4u', 'wit', 'sd', 'a3r'];     // أي مصدر نفتحو بيه داخل التطبيق (id)
  const maxLen = Math.max(0, ...batches.map(b => b.length)), flat = [];
  for (let i = 0; i < maxLen; i++) batches.forEach(b => { if (b[i]) flat.push(b[i]); });   // نخلطو المصادر باش ما يغلبش واحد
  const keysFor = (x) => [epAnimeKey(x.name), x.alt ? epAnimeKey(x.alt) : '', x.q2 ? epAnimeKey(x.q2) : ''].filter(Boolean);
  const groups = [];
  flat.forEach(x => {
    const ks = keysFor(x); if (!ks.length) return;
    const dub = !!x.dubbed;                                   // المترجم والمدبلج بطاقتين منفصلتين
    let g = groups.find(g => g.dub === dub && g.ks.some(a => ks.some(b => epSame(a, b))));
    if (!g) { g = { ks: [], dub, items: [] }; groups.push(g); }
    ks.forEach(k => { if (!g.ks.includes(k)) g.ks.push(k); });
    g.items.push(x);
  });
  return groups.map(g => {
    const pool = g.items;
    const top = Math.max(...pool.map(x => parseFloat(x.ep) || 0));
    const at = pool.filter(x => (parseFloat(x.ep) || 0) === top);
    const pick = (f) => order.map(k => at.find(x => x.src === k && f(x))).find(Boolean);
    const main = pick(x => x.id) || at[0];
    const alIt = g.items.find(x => x.q2);
    return {
      id: main.id || '', name: epBaseName(main.name) || main.name, ep: String(top), akey: g.ks[0], q2: (alIt && alIt.q2) || main.alt || '',
      poster: (at.find(x => x.poster) || {}).poster || '', src: main.src, srcs: [...new Set(at.map(x => x.src))],
      url: (at.find(x => x.url) || {}).url || '', dubbed: g.dub
    };
  });
}
const EPM = { status: {}, at: 0, f: 'sub' };   // f: sub (مترجم) | all | dub
const epFilt = (list) => EPM.f === 'dub' ? list.filter(x => x.dubbed) : EPM.f === 'sub' ? list.filter(x => !x.dubbed) : [...list.filter(x => !x.dubbed), ...list.filter(x => x.dubbed)];
async function latestEpisodes() {
  const res = await Promise.all(EP_TOOLS.map(async t => {
    try { const l = await epWithTimeout(t.run(), 40000); EPM.status[t.key] = { ok: true, n: l.length }; return l; }
    catch (e) { EPM.status[t.key] = { ok: false, err: errMsg(e) }; return []; }
  }));
  EPM.at = Date.now();
  return epMerge(res);
}
const epSrcName = { a3r: 'Anime3rb', a4u: 'Anime4up', wit: 'WitAnime', sd: 'Stardima', afy: 'Animeify' };
const epNew = new Set();                                   // حلقات جديدة (تزادت من آخر فحص)
function epCard(x) {
  const srcs = (x.srcs || [x.src]).map(k => epSrcName[k] || '').filter(Boolean).join(' · ');
  return `<div class="card ecard" tabindex="0" data-id="${esc(x.id)}" data-ep="${esc(x.ep)}" data-q="${esc(x.name)}" data-src="${esc(x.src)}" data-srcs="${esc((x.srcs || [x.src]).join(','))}" data-url="${esc(x.url || '')}" data-q2="${esc(x.q2 || '')}"><span class="badge epb">الحلقة ${esc(x.ep)}</span>${epNew.has(epKey(x)) ? '<span class="badge" style="top:auto;bottom:58px">جديد</span>' : ''}<img loading="lazy" src="${esc(x.poster)}" alt=""><p>${esc(x.name)}</p><div class="cm"><span>${x.dubbed ? I.mic + ' مدبلج' : ''}</span></div></div>`;
}
/* شريط حالة الأدوات (واش كل أداة خدمات ولا لا) + زر تحديث الآن */
function epStatusHtml() {
  const chips = EP_TOOLS.map(t => {
    const st = EPM.status[t.key];
    const mark = !st ? '…' : st.ok ? I.check + ' ' + st.n : I.cross;
    const col = !st ? '#999' : st.ok ? '#3ecf6e' : '#ff6b6b';
    return `<span title="${esc(st && !st.ok ? st.err : '')}" style="display:inline-block;margin:2px 4px;padding:3px 10px;border-radius:999px;border:1px solid ${col};color:${col};font-size:12px">${esc(t.name)} ${mark}</span>`;
  }).join('');
  const okN = EP_TOOLS.filter(t => EPM.status[t.key] && EPM.status[t.key].ok).length;
  const t = EPM.at ? new Date(EPM.at).toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' }) : '';
  const fch = [['sub', 'مترجم'], ['all', 'الكل'], ['dub', 'مدبلج']].map(([v, n]) => `<button class="chip epf${EPM.f === v ? ' on' : ''}" data-f="${v}">${n}</button>`).join('');
  return `<div style="grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:6px">${fch}<button class="chip" id="epNow" style="font-size:14px;padding:8px 12px" title="تحديث الآن">${I.sync}</button></div>`;
}
function epGridHtml(list) {
  const shown = epFilt(list);
  const empty = EPM.f === 'sub' && list.length ? 'لم نجد حلقات مترجمة حاليًا — اضغط «الكل» أو «مدبلج».' : 'لم نجد حلقات جديدة حاليًا. راجع الأدوات في الأعلى: التي تحمل علامة الخطأ (X) لم تعمل (تغيّر النطاق أو الموقع محمي).';
  return epStatusHtml() + (shown.length ? shown.map(epCard).join('') : `<p class="mute" style="grid-column:1/-1">${empty}</p>`);
}
function bindEpStatus() {
  document.querySelectorAll('.epf').forEach(c => c.onclick = () => {
    EPM.f = c.dataset.f; const box = $('#agrid'); if (!box) return;
    box.innerHTML = epGridHtml(AF.list); bindCards(); bindEpStatus();
    const n = $('#acount'); if (n) n.textContent = epFilt(AF.list).length + ' حلقة';
  });
  const st = $('#epSt'); if (st) st.onclick = () => { const d = $('#epStD'); if (d) d.hidden = !d.hidden; };
  const b = $('#epNow'); if (b) b.onclick = async () => { b.disabled = true; b.textContent = '…'; await window.epCheck(true); };
}
/* حلقة جات من Anime3rb فقط: نعرضو سيرفراتها + سيرفرات نفس الحلقة من WitAnime/Anime4up، كلشي داخل المشغّل */
async function openA3rEpisode(d) {
  cur = { type: 'ar', vid: '' }; window.__np = null;
  view.innerHTML = `<div class="sec" style="padding-top:24px"><h2>${esc(d.q)} <span class="mute">· الحلقة ${esc(d.ep)}</span></h2><div id="out"><p class="mute">جارٍ البحث عن مصادر…</p></div></div>`;
  view.scrollTop = 0;
  const have = new Set();
  const [a3, xb] = await Promise.all([a3rButtons(d.url).catch(() => []), crossButtons({ names: [d.q], ep: d.ep, have }).catch(() => [])]);
  const btns = [...a3, ...xb], out = $('#out'); if (!out) return;
  if (!btns.length) { out.innerHTML = '<p class="mute">لم نجد روابط تعمل داخل التطبيق لهذه الحلقة.</p><button class="primary" id="a3x">فتحها في المتصفح</button>'; $('#a3x').onclick = () => window.api.openExternal(d.url); return; }
  out.innerHTML = streamsHtml(btns);
  out.querySelectorAll('.streams button').forEach(sb => sb.onclick = () => btns[sb.dataset.i].f());
}
async function openEpCard(el) {
  const d = el.dataset, extra = (d.srcs || '').split(',').includes('a3r') && d.url ? { a3r: d.url } : {};
  if (d.id) return openAr(d.id, d.ep, extra);
  if (d.src === 'a3r' && d.url) return openA3rEpisode(d);
  say('جارٍ التحميل…');
  const r = d.src === 'a4u' ? await a4uSearch(d.q) : await witSearch(d.q);
  const nq = normT(d.q), hit = r.find(m => normT(m.name) === nq) || r[0];
  if (hit) return openAr(hit.id, d.ep, extra);
  arLoadCatalog(d.q);
}
const AF = { sec: 'latest', genre: '', type: 'SERIES', list: [], seen: newSeen(), off: 0, busy: false, done: false, token: 0 };

function arQuery() {
  const base = { limit: AR_PAGE, from: AF.off };
  if (AF.genre) return { ...base, filterType: 'GENRE', filterData: AF.genre, type: AF.type };
  if (AF.sec === 'latest') return AF.type === 'SERIES' ? { ...base, latest: true } : { ...base, type: AF.type };
  if (AF.sec === 'AIRING') return { ...base, filterType: 'STATUS', filterData: 'AIRING', type: AF.type };
  return { ...base, filterType: 'SORT', filterData: AF.sec, type: AF.type };
}

async function arMore(reset) {
  if (AF.busy || (AF.done && !reset)) return;
  if (reset) { AF.list = []; AF.seen = newSeen(); AF.off = 0; AF.done = false; AF.token++; AF.alFail = false; }
  const tk = AF.token; AF.busy = true;
  const box = $('#agrid'), btn = $('#amore'), cnt = $('#acount');
  if (!box) { AF.busy = false; return; }
  btn.textContent = 'جارٍ التحميل…'; btn.disabled = true;
  if (reset) box.innerHTML = '<p class="mute">جارٍ التحميل…</p>';
  try {
    let fresh = [], alOk = false;
    if (AF.genre && !AF.alFail) {                                   // تصنيف حقيقي من AniList (genre/tag) — مرتب بالشعبية
      try {
        const [k, v] = alGenreOf(AF.genre);
        const r = await window.api.genre({ kind: k, value: v, type: AF.type, page: AF.off + 1, status: AF.sec === 'AIRING' ? 'RELEASING' : '' });
        if (tk !== AF.token) return;
        AF.off += 1; AF.done = !r.next; alOk = true;
        fresh = dedupe(r.list.map(alToM), AF.seen);
        if (!fresh.length && !r.next && !AF.list.length) box.innerHTML = '<p class="mute">لم نجد أنمي في هذا التصنيف.</p>';
      } catch (e) { if (tk !== AF.token) return; if (AF.list.length) { AF.done = true; alOk = true; } else { AF.alFail = true; AF.off = 0; } }
    }
    if (alOk) { /* تم */ } else if (AF.sec === 'CUSTOM' && !AF.genre) {                        // أنمي أضفته أنت (custom.json)
      fresh = dedupe(await customList(true), AF.seen); AF.done = true;
      if (!fresh.length) { box.innerHTML = '<p class="mute">لم تُضف أي أنمي بعد. افتح الملف وأضف أنمي (يوجد مثال في custom.example.json).</p><button class="primary" id="copen">فتح custom.json</button>'; $('#copen').onclick = () => window.api.custom.open(); }
    } else if (AF.sec === 'EPS' && !AF.genre) {                         // آخر الحلقات الحقيقية
      const list = await latestEpisodes(); if (tk !== AF.token) return;
      AF.done = true;
      store.set('epSeen2', [...new Set([...store.get('epSeen2', []), ...list.map(epKey)])].slice(-3000));
      box.innerHTML = epGridHtml(list);
      AF.list = list; bindCards(); bindEpStatus();
    } else if (AF.sec === 'SCHEDULE' && !AF.genre) {                     // جدول الحلقات القادمة
      const html = await scheduleHtml(); if (tk !== AF.token) return;
      AF.done = true; box.innerHTML = `<div style="grid-column:1/-1">${html}</div>`; bindSchedule(box);
    } else if (AF.sec === 'DUBBED' && !AF.genre) {                       // أنمي مدبلج (بحث + custom.json + فهرس خارجي)
      const all = await dubbedList(); if (tk !== AF.token) return;
      fresh = dedupe(all, AF.seen); AF.done = true;
      if (!fresh.length) box.innerHTML = '<p class="mute">لم نجد أي أنمي مدبلج في المصادر. يمكنك إضافة أنمي مدبلج في custom.json بإضافة <code>"dubbed": true</code> (يوجد مثال في custom.example.json).</p>';
    } else if (AF.sec === 'SEASON' && !AF.genre) {                       // أنمي الموسم: من WitAnime فقط (صفحة واحدة)
      fresh = dedupe(await witSeason(), AF.seen); AF.done = true;
    } else {
      for (let tries = 0; tries < 4 && !fresh.length; tries++) {   // إذا الدفعة كلها مكررة نجيب اللي بعدها
        const wantWit = reset && tries === 0 && !AF.genre && AF.sec === 'latest' && AF.type === 'SERIES';
        const [r, w, cu] = await Promise.all([window.api.ar.list(arQuery()), wantWit ? witLatest() : [], wantWit ? customList() : []]);
        if (tk !== AF.token) return;
        if (!r.length) { AF.done = true; fresh = dedupe([...cu, ...w], AF.seen); break; }
        AF.off += r.length;
        fresh = dedupe([...cu, ...r, ...w], AF.seen);
      }
      if (!fresh.length) AF.done = true;
    }
    if (tk !== AF.token) return;
    if (reset && AF.sec === 'latest' && !AF.genre && AF.type === 'SERIES') { flagNew(fresh.filter(m => m.src !== 'custom')); markKnown(fresh); }
    AF.list.push(...fresh);
    if (reset && fresh.length) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', fresh.map(anyCard).join(''));
    if (!AF.list.length && AF.sec !== 'CUSTOM' && !(['DUBBED', 'SCHEDULE', 'EPS'].includes(AF.sec) && !AF.genre)) box.innerHTML = '<p class="mute">لا توجد نتائج لهذا الفلتر.</p>';
    bindCards();
    cnt.textContent = AF.sec === 'SCHEDULE' && !AF.genre ? 'الأسبوع القادم' : AF.sec === 'EPS' && !AF.genre ? epFilt(AF.list).length + ' حلقة' : AF.list.length + ' أنمي';
  } catch (e) { if (tk === AF.token) box.insertAdjacentHTML('beforeend', '<p class="mute">خطأ: ' + esc(errMsg(e)) + '</p>'); }
  finally {
    AF.busy = false;
    if (tk === AF.token) { btn.disabled = false; btn.textContent = AF.done ? 'لا يوجد المزيد' : 'تحميل المزيد'; btn.classList.toggle('hide', AF.done); }
  }
}

async function arLoadCatalog(search) {
  setNav('nHome');
  if (search) {
    say('جارٍ البحث…');
    try {
      const nq = normT(search);
      const [a, w, cu, sd, a4] = await Promise.all([window.api.ar.search(search).catch(() => []), witSearch(search), customList().then(l => l.filter(m => keysOf(m).some(k => k.includes(nq)))), window.api.dub.search(search).catch(() => []), a4uSearch(search)]);
      const r = dedupe([...cu, ...sd, ...a4, ...a, ...w], newSeen());
      view.innerHTML = `<div class="sec"><h3>نتائج: ${esc(search)} (${r.length})</h3>` + (r.length ? arGrid(r) : '<p class="mute">لا توجد نتائج.</p>') + '</div>';
      bindCards();
    } catch (e) { say('خطأ: ' + errMsg(e)); }
    return;
  }
  const chips = (arr, cur, attr) => arr.map(([v, n]) => `<button class="chip${v === cur ? ' on' : ''}" data-${attr}="${esc(v)}">${esc(n)}</button>`).join('');
  view.innerHTML = `<div class="sec"><div class="fbar">
      <div class="chips" id="fsec">${chips(AR_SECS, AF.genre ? '' : AF.sec, 'sec')}</div>
      <div class="chips" id="ftype">${chips(AR_TYPES, AF.type, 'type')}</div>
      <div class="dd" id="fgenre"><button type="button" class="ddb"><span class="ddt">كل التصنيفات</span><svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><div class="ddl" hidden><button type="button" data-v="">كل التصنيفات</button>${AR_GENRES.map(([n, v]) => `<button type="button" data-v="${esc(v)}">${esc(n)}</button>`).join('')}</div></div>
      <span class="mute" id="acount"></span></div>
    <div class="grid" id="agrid"></div>
    <div style="text-align:center;margin-top:26px"><button class="primary" id="amore">تحميل المزيد</button></div></div>`;
  $('.wrap').classList.add('hh'); view.scrollTop = 0; $('header').classList.remove('solid');
  /* قائمة التصنيفات (بستايل التطبيق، بلا scroll: شبكة بعدة أعمدة) */
  (() => {
    const dd = $('#fgenre'), ddb = dd.querySelector('.ddb'), ddl = dd.querySelector('.ddl'), ddt = dd.querySelector('.ddt');
    let val = '';
    const paint = () => { const b = [...ddl.children].find(x => x.dataset.v === val) || ddl.children[0]; ddt.textContent = b.textContent; [...ddl.children].forEach(x => x.classList.toggle('on', x === b)); dd.classList.toggle('has', !!val); };
    Object.defineProperty(dd, 'value', { get: () => val, set: (v) => { val = v || ''; paint(); } });
    const close = () => { ddl.hidden = true; dd.classList.remove('open'); };
    ddb.onclick = (e) => { e.stopPropagation(); const o = ddl.hidden; document.querySelectorAll('.dd .ddl').forEach(l => { l.hidden = true; }); ddl.hidden = !o; dd.classList.toggle('open', o); };
    ddl.onclick = (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; val = b.dataset.v; paint(); close(); dd.dispatchEvent(new Event('change')); };
    document.addEventListener('click', (e) => { if (!dd.isConnected) return; if (!dd.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    val = AF.genre || ''; paint();
  })();
  const syncChips = () => {
    view.querySelectorAll('#fsec .chip').forEach(c => c.classList.toggle('on', !AF.genre && c.dataset.sec === AF.sec));
    view.querySelectorAll('#ftype .chip').forEach(c => c.classList.toggle('on', c.dataset.type === AF.type));
    $('#ftype').style.display = ['DUBBED', 'SCHEDULE', 'EPS'].includes(AF.sec) && !AF.genre ? 'none' : '';
  };
  view.querySelectorAll('#fsec .chip').forEach(c => c.onclick = () => { AF.sec = c.dataset.sec; AF.genre = ''; $('#fgenre').value = ''; syncChips(); arMore(true); });
  view.querySelectorAll('#ftype .chip').forEach(c => c.onclick = () => { AF.type = c.dataset.type; syncChips(); arMore(true); });
  $('#fgenre').onchange = (e) => { AF.genre = e.target.value; syncChips(); arMore(true); };
  $('#amore').onclick = () => arMore();
  syncChips();
  await arMore(true);
  buildHomeHero();
}

async function arDetails(id) {
  if (arCache.has(id)) return arCache.get(id);
  for (const type of ['SERIES', 'MOVIE']) {
    const r = await window.api.ar.list({ filterType: 'SEARCH', filterData: id, type, limit: 10 }).catch(() => []);
    const m = r.find(x => x.id === id) || r[0];
    if (m) { arCache.set(id, m); return m; }
  }
  return { id, name: id, nameEn: '', poster: '', genres: '', score: '', synopsis: '' };
}

/* ===== إشعارات الحلقات الجديدة (للأنمي المستمر في المفضلة وآخر ما شاهدته) ===== */
function noteEps(id, name, latest, aired, mode, poster) {
  const st = store.get('epSeen', {}), cur = st[id];
  st[id] = { n: Math.max(latest || 0, cur ? cur.n : 0), al: Math.max(aired || 0, cur ? cur.al : 0) };
  const ks = Object.keys(st); if (ks.length > 200) delete st[ks[0]];
  store.set('epSeen', st);
  if (!cur || mode === 'silent' || !notifyOn) return;
  let body = '';
  if (latest > cur.n) body = 'الحلقة ' + latest + ' متوفرة الآن';
  else if (aired > cur.al && aired > latest) body = 'الحلقة ' + aired + ' عُرضت — الروابط قريباً';
  if (!body) return;
  if (mode !== 'page') toast(name + ': ' + body);
  if (mode !== 'page' || !document.hasFocus()) window.api.notify({ title: name, body, id, ep: String(latest > cur.n ? latest : aired), image: poster || '' }).catch(() => {});
}
async function watchNew() {
  if (!notifyOn) { try { window.api.notifySync({ enabled: false, items: [] }); } catch {} return; }
  const ids = [...new Set([...store.get('fav', []), ...store.get('hist', []).slice(0, 10)].filter(x => x && x.type === 'ar').map(x => x.id))].filter(id => !/^(custom|sd):/.test(String(id))).slice(0, 20);
  const syncItems = [];
  for (const id of ids) {
    try {
      const sid = String(id), isWit = sid.startsWith('wit:'), isA4u = sid.startsWith('a4u:');
      const m = isWit ? await witDetails(id) : isA4u ? await a4uDetails(id) : await arDetails(id);
      const eps = isWit ? await witEpisodes(id) : isA4u ? await a4uEpisodes(id) : await window.api.ar.episodes(id).catch(() => []);
      const nums = eps.map(e => parseFloat(e.num)).filter(n => !isNaN(n));
      const latest = nums.length ? Math.max(...nums) : 0;
      noteEps(id, m.name, latest, 0, undefined, m.poster);   // الإشعار من المصادر فقط (بدون AniList)
      if (latest > 0) syncItems.push({ id: sid, name: m.name, poster: m.poster || '', kind: isWit ? 'wit' : isA4u ? 'a4u' : 'ar', ref: sid.replace(/^(wit|a4u):/, ''), last: latest });
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  // نبعثو القائمة + إعدادات المصادر للجزء الأصلي: كيفحصها كل 30 دقيقة حتى والتطبيق مسدود
  try {
    const ar = window.__waAr ? await window.__waAr() : {};
    const cfg = { ...ar, witHosts: [WIT, ...WIT_HOSTS.filter(x => x !== WIT)], a4uHosts: [a4uBase, ...A4U_HOSTS.filter(x => x !== a4uBase)] };
    await window.api.notifySync({ enabled: true, items: syncItems, cfg });
  } catch {}
}
/* شخصيات الأنمي (من AniList) فـ الهيرو تحت الأزرار */
async function loadChars(alId, animeId) {
  const box = $('#chars'); if (!box || !alId) return;
  try {
    const cache = store.get('chars', {}), hit = cache[animeId];
    let list = hit && Date.now() - hit.t < 7 * 864e5 ? hit.v : null;
    if (!list) {
      list = await window.api.anilistChars(alId);
      cache[animeId] = { t: Date.now(), v: list };
      const ks = Object.keys(cache); if (ks.length > 60) delete cache[ks[0]];
      store.set('chars', cache);
    }
    if (!box.isConnected || !list.length) return;
    box.innerHTML = list.slice(0, 12).map(c => `<div class="ch${c.role === 'MAIN' ? ' main' : ''}" title="${esc(c.name)}"><img loading="lazy" src="${esc(c.img)}" alt=""><b>${esc(c.name)}</b><small>${c.role === 'MAIN' ? 'رئيسية' : 'ثانوية'}</small></div>`).join('');
  } catch {}
}

/* ===== أجزاء الأنمي (من مصادر التطبيق فقط)، وإلا أنمي مشابه من نفس التصنيف ===== */
const relBase = (t) => String(t || '').toLowerCase()
  .replace(/\b(?:season|part|cour|s)\s*\d+\b/g, ' ').replace(/\b\d+(?:st|nd|rd|th)\s*season\b/g, ' ')
  .replace(/\b(?:ii|iii|iv)\b/g, ' ')
  .replace(/(?:الموسم|الجزء|موسم|جزء)\s*(?:الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)/g, ' ')
  .replace(/\s*[:：–—-]\s.*$/, ' ').replace(/\s\d+\s*$/, ' ').replace(/\s+/g, ' ').trim();
async function loadRel(m) {
  const box = $('#rel'); if (!box) return;
  try {
    const bases = [...new Set([m.nameEn, m.name].map(relBase).filter(b => normT(b).length >= 3))];
    const seen = newSeen(); dedupe([m], seen);                       // نستبعدو الأنمي الحالي من النتائج
    let parts = [];
    if (bases.length) {
      const batches = await Promise.all(bases.map(q => Promise.all([window.api.ar.search(q).catch(() => []), witSearch(q).catch(() => [])])));
      const keys = bases.map(normT);
      const pool = dedupe(batches.flat(2), seen).filter(c => [c.name, c.nameEn].map(normT).some(n => keys.some(k => n.includes(k))));
      parts = pool.sort((a, b) => _seasonOf(a.nameEn || a.name) - _seasonOf(b.nameEn || b.name));
      if (parts.length) {   // نحطو الأنمي الحالي فـ مكانو حسب رقم الموسم
        const cs = _seasonOf(m.nameEn || m.name), at = parts.findIndex(c => _seasonOf(c.nameEn || c.name) > cs);
        parts.splice(at < 0 ? parts.length : at, 0, { ...m, cur: true });
      }
    }
    let list = parts, title = 'أجزاء الأنمي';
    if (!parts.length) {
      title = 'أنمي مشابه';
      const gs = arOk(m.genres) ? String(m.genres).split(/[,،]/).map(x => x.trim()).filter(Boolean).slice(0, 2) : [];
      const got = (await Promise.all(gs.map(g => window.api.ar.list({ filterType: 'GENRE', filterData: g, type: 'SERIES', limit: 14, from: 0 }).catch(() => [])))).flat();
      list = dedupe(got, seen).slice(0, 14);
    }
    if (!box.isConnected || !list.length) return;
    list.forEach(c => { if (!c.cur) arCache.set(c.id, c); });
    const card = (x) => `<div class="rc${x.cur ? ' cur' : ''}" role="button" tabindex="0" data-id="${esc(x.id)}"><div class="rp"><img loading="lazy" src="${esc(x.poster)}" alt="">${x.cur ? '<span class="rb">أنت هنا</span>' : ''}${arOk(x.score) ? `<span class="rs">${esc(x.score)}</span>` : ''}</div><b>${esc(x.name)}</b><small>${esc([x.nameEn && x.nameEn !== x.name ? x.nameEn : '', x.type || ''].filter(Boolean).join(' · '))}</small></div>`;
    box.innerHTML = `<h3>${title}</h3><div class="rrow">${list.map(card).join('')}</div>`;
    box.querySelectorAll('.rc').forEach(c => {
      const go = () => { if (c.classList.contains('cur')) { view.scrollTo({ top: 0, behavior: 'smooth' }); return; } openAr(c.dataset.id); };
      c.onclick = go; c.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    });
  } catch {}
}
let epTimer = null, epRefresh = null;
window.addEventListener('focus', () => { if (epRefresh) epRefresh(); });
/* ===== AniList: نجيبو عدد الحلقات، نقارنوه مع لي عندنا، ونزيدو الناقصين ===== */
const alNorm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');
const alSame = (a, b) => { if (!a || !b) return false; if (a === b) return true; const [s, l] = a.length < b.length ? [a, b] : [b, a]; return s.length >= 6 && l.includes(s) && s.length / l.length >= 0.7; };
async function anilistEps(m, force) {
  const cache = store.get('al', {}), hit = cache[m.id];
  if (!force && hit && Date.now() - hit.t < 30 * 60e3) return hit.v;
  const names = [m.nameEn, m.name].filter(Boolean);
  const want = names.map(alNorm).filter(Boolean);
  if (!want.length) return null;
  let a = null;
  for (const n of names) {
    const list = await window.api.anilist(n).catch(() => []);
    a = list.find(x => [x.title && x.title.romaji, x.title && x.title.english, x.title && x.title.native, ...(x.synonyms || [])].map(alNorm).some(t => want.some(w => alSame(t, w))));
    if (a) break;
  }
  if (!a) return null;
  const next = a.nextAiringEpisode || null;
  const aired = next ? next.episode - 1 : (a.status === 'NOT_YET_RELEASED' ? 0 : (a.episodes || 0));
  const v = { id: a.id, aired, total: a.episodes || 0, next, status: a.status };
  cache[m.id] = { t: Date.now(), v };
  const ks = Object.keys(cache); if (ks.length > 150) delete cache[ks[0]];
  store.set('al', cache);
  return v;
}
function mergeAl(eps, al) {
  if (!al) return { eps, added: 0 };
  const nums = eps.map(e => parseFloat(e.num)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  if (max > al.aired + 2) return { eps, added: 0 };      // ترقيم مختلف (مثلاً مطلق) → ما نخلطوش
  const have = new Set(nums), out = eps.slice(); let added = 0;
  for (let n = 1; n <= Math.min(al.aired, 400); n++) if (!have.has(n)) { out.push({ num: String(n), missing: true }); added++; }
  if (al.next && !have.has(al.next.episode)) { out.push({ num: String(al.next.episode), missing: true, upcoming: true, at: al.next.airingAt }); added++; }
  if (out.every(e => !isNaN(parseFloat(e.num)))) out.sort((a, b) => parseFloat(a.num) - parseFloat(b.num));
  return { eps: out, added };
}

async function openAr(id, wantEp, extra = {}) {
  say('جارٍ التحميل…');
  try {
    const isWit = String(id).startsWith('wit:'), isA4u = String(id).startsWith('a4u:'), isCustom = String(id).startsWith('custom:'), isSd = String(id).startsWith('sd:'), sdId = isSd ? String(id).slice(3) : '';
    if (isCustom && !arCache.has(id)) { await customList(); if (!arCache.has(id)) await dubbedRemote(); }
    if (isSd && !arCache.has(id)) { const d = await window.api.dub.detail(sdId).catch(() => null); if (d) arCache.set(id, d); }
    const m = (isCustom || isSd) ? arCache.get(id) : isWit ? await witDetails(id) : isA4u ? await a4uDetails(id) : await arDetails(id);
    if (!m) throw new Error(isSd ? 'تعذّر جلب هذا الأنمي المدبلج' : 'هذا الأنمي لم يعد موجودًا في custom.json');
    let eps = [], witP = null, alAdded = 0, alInfo = null;
    const alP = (isCustom || isSd) ? null : anilistEps(m).catch(() => null);   // بالتوازي مع جلب الحلقات
    let sdMovie = false;
    if (isCustom) eps = m.episodes.map((e, i) => ({ num: String(e.num ?? i + 1), custom: e }));
    else if (isSd) { const r = await window.api.dub.episodes(sdId).catch(() => ({ eps: [] })); sdMovie = !!r.movie; eps = (r.eps || []).map(e => ({ num: e.num, sd: e.id })); }
    else if (isWit) eps = (await witEpisodes(id)).map(e => ({ num: e.num, wit: e.url }));
    else if (isA4u) eps = (await a4uEpisodes(id)).map(e => ({ num: e.num, a4u: e.url }));
    else {
      eps = await window.api.ar.episodes(id).catch(() => []);
      witP = witMatch(m).then(w => (w ? witEpisodes(w.id) : [])).catch(() => []);   // نفس الأنمي في WitAnime (إن وُجد) كسيرفرات إضافية
      if (!eps.length) eps = (await witP).map(e => ({ num: e.num, wit: e.url }));
    }
    if (alP) { alInfo = await alP; const mg = mergeAl(eps, alInfo); eps = mg.eps; alAdded = mg.added; }
    const seen = new Set(store.get('seen', {})[m.id] || []);
    const key = (e) => m.id + ':' + e.num;
    let selNum = null;
    const epsInner = () => `${alInfo ? `<p class="mute alnote">AniList: ${esc(alInfo.aired)} حلقة معروضة${alInfo.total ? ' من ' + esc(alInfo.total) : ''}${alAdded ? ` · أُضيفت ${esc(alAdded)} حلقة ناقصة (بدون روابط بعد)` : ' · كل الحلقات موجودة'}</p>` : ''}${eps.length ? `<div class="eps">${eps.map((e, i) => `<button data-i="${i}" class="${seen.has(key(e)) ? 'seen' : ''}${e.num === selNum ? ' on' : ''}${e.missing ? ' miss' : ''}${e.upcoming ? ' up' : ''}"${e.missing ? ` title="${e.upcoming ? 'تُعرض ' + esc(new Date(e.at * 1000).toLocaleString('ar')) : 'لا توجد روابط لهذه الحلقة بعد'}"` : ''}>${esc(e.num)}</button>`).join('')}</div>` : '<p class="mute">لا توجد حلقات متاحة حالياً.</p>'}`;
    const gen = arOk(m.genres) ? String(m.genres).split(',').slice(0, 4).join(' · ') : '';
    view.innerHTML = `<div class="hero" style="background-image:url('${esc(m.poster)}')"><img class="dp" src="${esc(m.poster)}" alt=""><div>${heroTitle(m)}<p class="sub">${esc([m.nameEn, gen].filter(Boolean).join(' · '))}</p><div class="acts"><button class="ghost" id="watch">${I.playc} شاهد الآن</button><button class="ghost" id="fav"></button></div>${arOk(m.score) ? `<div class="hmeta"><b>${esc(m.score)}</b>${arOk(m.season) ? `<span>${esc(m.season)}</span>` : ''}${arOk(m.status) ? `<span>${esc(m.status)}</span>` : ''}</div>` : ''}<div class="chars" id="chars"></div></div></div>`
      + `<div class="sec"><div class="tabs"><button class="on" data-t="eps">الحلقات</button><button data-t="ds">الوصف</button></div>`
      + `<div id="t_eps"><div id="epsbox">${epsInner()}</div><div id="out"></div></div>`
      + `<div id="t_ds" class="hide"><p class="mute" id="desc">${esc(arOk(m.synopsis) ? m.synopsis : 'لا يوجد وصف.')}</p></div><div id="rel"></div></div>`;
    $('.wrap').classList.add('hh'); view.scrollTop = 0; $('header').classList.remove('solid');
    if (translateOn && arOk(m.synopsis) && !/[\u0600-\u06FF]/.test(m.synopsis)) translateDesc({ id: m.id, description: m.synopsis });
    if (!isCustom && !isSd) { const nn = eps.filter(e => !e.missing).map(e => parseFloat(e.num)).filter(n => !isNaN(n)); noteEps(m.id, m.name, nn.length ? Math.max(...nn) : 0, alInfo ? alInfo.aired : 0, 'silent'); }
    if (alInfo && alInfo.id) loadChars(alInfo.id, m.id);
    loadRel(m);
    if (!arOk(m.synopsis)) fillDescFromMal(m);   // \u0645\u0627 \u0641\u064A\u0647 \u0648\u0635\u0641 \u0645\u0646 \u0627\u0644\u0645\u0635\u062F\u0631 \u2192 \u0646\u062C\u064A\u0628\u0648 \u0645\u0646 MyAnimeList
    const fp = () => ($('#fav').innerHTML = isFavId(m.id) ? starSvg(true) + ' في المفضلة' : I.plus + ' أضف للمفضلة');
    fp();
    $('#fav').onclick = () => { toggleFav({ id: m.id, type: 'ar', name: m.name, poster: m.poster }); fp(); };
    view.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      view.querySelectorAll('.tabs button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      $('#t_eps').classList.toggle('hide', b.dataset.t !== 'eps'); $('#t_ds').classList.toggle('hide', b.dataset.t !== 'ds');
    });
    const bindEps = () => view.querySelectorAll('.eps button').forEach(b => b.onclick = async () => {
      const e = eps[b.dataset.i]; selNum = e.num;
      const an = window.__autoNext; window.__autoNext = null;
      if (e.missing) {   // حلقة من AniList ما لقيناش ليها روابط
        view.querySelectorAll('.eps button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        if (an) closePlayer();
        $('#out').innerHTML = `<p class="mute">${e.upcoming ? 'الحلقة ' + esc(e.num) + ' لم تُعرض بعد — ' + esc(new Date(e.at * 1000).toLocaleString('ar')) : 'الحلقة ' + esc(e.num) + ' موجودة في AniList لكن لم نجد لها روابط في المصادر حالياً.'}</p>`;
        return;
      }
      view.querySelectorAll('.eps button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); b.classList.add('seen');
      const s = store.get('seen', {}); s[m.id] = [...new Set([...(s[m.id] || []), key(e)])]; store.set('seen', s);
      const h = store.get('hist', []).filter(x => x.id !== m.id);
      store.set('hist', [{ id: m.id, type: 'ar', name: m.name, poster: m.poster, ep: String(e.num) }, ...h].slice(0, 40));
      window.__np = { id: m.id, ep: String(e.num) };
      cur = { type: 'ar', vid: '' };
      const out = window.waEpScreen ? window.waEpScreen(m, e) : $('#out'); out.innerHTML = '<p class="mute">جارٍ البحث عن السيرفرات…</p>';
      const witUrl = async () => e.wit || ((witP ? await witP : []).find(x => x.num === e.num) || {}).url;
      const [ar, wq] = await Promise.all([
        e.raw ? window.api.ar.streams(e.raw).catch(() => []) : [],
        witUrl().then(u => (u ? witQualities(u) : [])).catch(() => [])
      ]);
      if (!b.classList.contains('on') || (!out.isConnected && !an)) return;
      const btns = ar.map(x => ({ t: `Mediafire · ${x.q}`, du: x.url, dd: true, f: () => play({ url: x.url }), try: async () => { play({ url: x.url }); return true; } }));
      if (e.sd) (await window.api.dub.streams({ id: sdId, ep: e.sd, movie: sdMovie }).catch(() => [])).forEach(x => btns.push({ t: `@@mic@@ مدبلج · ${x.label}${x.res ? ' · ' + x.res : ''}${x.direct ? '' : ' · ' + hostOf(x.url)}`, du: x.url, dd: !!x.direct, f: () => (x.direct ? play({ url: x.url }) : playWitLink(x.url)) }));
      if (e.custom) (e.custom.urls || [{ name: 'رابط', url: e.custom.url }]).filter(u => u && u.url).forEach(u => btns.push(lkBtn(`${u.name || 'رابط'} · ${hostOf(u.url)}`, u.url)));
      if (e.a4u) (await a4uServers(e.a4u).catch(() => [])).forEach(x => btns.push(lkBtn(`مدبلج · ${x.label || 'سيرفر'} · ${hostOf(x.url)}`, x.url, true)));
      wq.forEach(g => g.links.forEach(l => btns.push(lkBtn(`WitAnime · ${g.q} · ${hostOf(l)}`, l))));
      { // + سيرفرات المشاهدة ديال WitAnime، وسيرفرات نفس الحلقة من المواقع الأخرى، وAnime3rb (إن جات من هناك)
        const have = new Set(btns.map(b => b.u).filter(Boolean));
        const wu = await witUrl().catch(() => null);
        if (wu) (await siteServers('wit', wu).catch(() => [])).forEach(x => { if (!have.has(x.url)) { have.add(x.url); btns.push(lkBtn(`WitAnime · ${x.label || 'سيرفر'} · ${hostOf(x.url)}`, x.url)); } });
        if (!isCustom && !isSd) btns.push(...await crossButtons({ names: [m.name, m.nameEn], ep: e.num, skip: [isWit ? 'wit' : '', isA4u ? 'a4u' : '', (!isWit && !isA4u) ? 'afy' : ''].filter(Boolean), have }).catch(() => []));
        if (extra.a3r && String(e.num) === String(wantEp)) btns.push(...await a3rButtons(extra.a3r).catch(() => []));
        if (!b.classList.contains('on')) return;
      }
      if (!btns.length) { if (an) closePlayer(); return (out.innerHTML = '<p class="mute">لا توجد روابط لهذه الحلقة حالياً. جرّب حلقة أخرى.</p>'); }
      out.innerHTML = streamsHtml(btns);
      out.querySelectorAll('.streams button').forEach(sb => sb.onclick = () => { window.__lastSrc = btns[sb.dataset.i].t; btns[sb.dataset.i].f(); });
      if (an) {   // «التالي»: نشغلو وحدو بنفس السيرفر (أو أقرب واحد)
        const head = (t) => String(t || '').split(' · ').slice(0, 2).join(' · ');
        const pickB = btns.find(x => x.t === an.t) || btns.find(x => an.t && head(x.t) === head(an.t)) || btns.find(x => an.t && String(x.t).split(' · ')[0] === String(an.t).split(' · ')[0]) || btns.find(x => x.try) || btns[0];
        window.__lastSrc = pickB.t; extra._done = true;
        try { pickB.f(); } catch { if ($('#pl') === an.pl) closePlayer(); }
        return;
      }
      if (extra.resume && String(e.num) === String(wantEp) && !extra._done) {      // تابع المشاهدة: شغّل وحدو
        extra._done = true;
        const auto = btns.find(x => x.t && x.t.includes('@@bolt@@')) || btns.find(x => x.try);
        if (auto) { try { auto.f ? auto.f() : auto.try(); } catch {} }
      }
    });
    bindEps();
    if (wantEp) { const wb = [...view.querySelectorAll('.eps button')].find(x => x.textContent.trim() === String(wantEp)); if (wb) wb.click(); }

    // تحديث تلقائي: كل 5 دقايق (وكي ترجع للنافذة) نسولو المصادر + AniList ونزيدو الحلقات الجديدة بلا ما نخرجو من الصفحة
    if (!isCustom && !isSd) {
      clearInterval(epTimer);
      let lastEp = Date.now(), busy = false;
      const refresh = async () => {
        if (!$('#epsbox')) { clearInterval(epTimer); epRefresh = null; return; }
        if (busy) return; busy = true; lastEp = Date.now();
        try {
          let base;
          if (isWit) base = (await witEpisodes(id)).map(e => ({ num: e.num, wit: e.url }));
          else if (isA4u) base = (await a4uEpisodes(id)).map(e => ({ num: e.num, a4u: e.url }));
          else {
            base = await window.api.ar.episodes(id).catch(() => null);
            if (base === null) return;
            witP = witMatch(m).then(w => (w ? witEpisodes(w.id) : [])).catch(() => []);
            if (!base.length) base = (await witP).map(e => ({ num: e.num, wit: e.url }));
          }
          const al = await anilistEps(m, true).catch(() => null);
          const mg = mergeAl(base, al);
          const sig = (a) => a.map(e => e.num + (e.missing ? 'm' : 'a')).join(',');
          if (sig(mg.eps) === sig(eps) || !$('#epsbox')) return;
          const hadReal = new Set(eps.filter(e => !e.missing).map(e => e.num));
          const fresh = mg.eps.filter(e => !e.missing && !hadReal.has(e.num)).map(e => e.num);
          eps = mg.eps; if (al) alInfo = al; alAdded = mg.added;
          $('#epsbox').innerHTML = epsInner(); bindEps();
          if (fresh.length) toast(m.name + ': حلقة جديدة ' + fresh.join('، '));
          { const nn = eps.filter(e => !e.missing).map(e => parseFloat(e.num)).filter(n => !isNaN(n)); noteEps(m.id, m.name, nn.length ? Math.max(...nn) : 0, al ? al.aired : 0, 'page'); }
        } catch {} finally { busy = false; }
      };
      epRefresh = () => { if (Date.now() - lastEp > 60000) refresh(); };
      epTimer = setInterval(refresh, 5 * 60 * 1000);
    } else { clearInterval(epTimer); epRefresh = null; }
    $('#watch').onclick = () => { const b = view.querySelector('.eps button:not(.seen):not(.miss)') || view.querySelector('.eps button:not(.miss)'); b && b.click(); };
  } catch (e) { say('خطأ: ' + errMsg(e)); }
}


/* ===== هيرو الرئيسية: أنمي يتبدّل تلقائياً + وصف من MyAnimeList (Jikan) ===== */
const malClean = (t) => String(t || '').replace(/\[Written by[^\]]*\]/gi, '').replace(/\(Source:[^)]*\)/gi, '').replace(/\n{2,}/g, '\n').trim();
async function malInfo(m) {
  const cache = store.get('mal', {});
  if (cache[m.id] && cache[m.id].synopsis) return cache[m.id];
  let info = null;
  // 1) AniList (الأدق): نقارن العنوان باش ما نجيبوش وصف أنمي آخر
  try {
    const r = await window.api.anilistDesc([m.nameEn, m.name]);
    if (r && r.description) info = { score: r.score || '', synopsis: malClean(r.description).slice(0, 700), url: r.url || '' };
  } catch {}
  // 2) Jikan (MyAnimeList) كاحتياط، مع إعادة المحاولة عند 429 واختيار أحسن نتيجة مطابقة
  if (!info) {
    const names = [m.nameEn, m.name].filter(Boolean), want = names.map(alNorm).filter(Boolean);
    for (const q of names.slice(0, 2)) {
      let r = null;
      for (let k = 0; k < 2 && !r; k++) {
        try { r = await window.api.get('https://api.jikan.moe/v4/anime?limit=6&sfw=true&q=' + encodeURIComponent(q)); }
        catch (e) { if (k === 0 && /429/.test(errMsg(e))) await new Promise(ok => setTimeout(ok, 1500)); else break; }
      }
      const list = (r && r.data) || [];
      const a = list.find(x => [x.title, x.title_english, x.title_japanese, ...(x.title_synonyms || [])].map(alNorm).some(t => want.some(w => alSame(t, w)))) ;
      if (a && a.synopsis) { info = { score: a.score || '', synopsis: malClean(a.synopsis).slice(0, 700), url: a.url || '' }; break; }
    }
  }
  if (!info) throw new Error('not found');
  cache[m.id] = info;
  const ks = Object.keys(cache); if (ks.length > 120) delete cache[ks[0]];
  store.set('mal', cache);
  return info;
}
async function heroDesc(m, el, scEl) {
  try {
    const info = await malInfo(m);
    if (info.score && scEl) scEl.innerHTML = `<span class="mal">MAL</span><span class="sc">${I.star} ${esc(info.score)}</span>`;
    let t = info.synopsis;
    if (!t) return;
    if (translateOn && !/[\u0600-\u06FF]/.test(t)) {
      const tr = store.get('tr', {}), k = 'mal:' + m.id;
      if (!tr[k]) { el.textContent = t; tr[k] = await window.api.translate(t); const ks = Object.keys(tr); if (ks.length > 150) delete tr[ks[0]]; store.set('tr', tr); }
      t = tr[k];
    }
    el.textContent = t;
  } catch { if (arOk(m.synopsis)) el.textContent = m.synopsis; }
}
// وصف لصفحة الأنمي لما المصدر ما يعطيش وصف: MyAnimeList (Jikan) + ترجمة للعربية
async function fillDescFromMal(m) {
  const el = $('#desc'); if (!el) return;
  el.textContent = 'جارٍ جلب الوصف…';
  try {
    const info = await malInfo(m);
    let t = info.synopsis;
    if (!t) throw new Error('empty');
    if (!el.isConnected) return;
    el.textContent = t;
    if (translateOn && !/[؀-ۿ]/.test(t)) {
      const tr = store.get('tr', {}), k = 'mal:' + m.id;
      if (!tr[k]) { tr[k] = await window.api.translate(t); const ks = Object.keys(tr); if (ks.length > 150) delete tr[ks[0]]; store.set('tr', tr); }
      if (el.isConnected) el.textContent = tr[k];
    }
  } catch { if (el.isConnected) el.textContent = 'لا يوجد وصف.'; }
}
let heroTimer = null;
function buildHomeHero() {
  clearInterval(heroTimer);
  const items = AF.list.filter(m => m.poster).slice(0, 6);
  if (!items.length || !view.querySelector('.sec')) return;
  const DUR = 8000;
  const box = document.createElement('div');
  box.className = 'hhero';
  const VID = 'assets/itachi.mp4';
  box.innerHTML = `<video class="hvid" src="${VID}" autoplay muted loop playsinline></video>` + items.map((m, i) => {
    const gen = arOk(m.genres) ? String(m.genres).split(',').slice(0, 3).join(' · ') : '';
    return `<div class="hslide" data-i="${i}"><div class="hbg" style="background-image:url('${esc(m.poster)}')"></div>
      <div class="hbody">${heroTitle(m)}<p class="sub">${esc([m.nameEn && m.nameEn !== m.name ? m.nameEn : '', gen].filter(Boolean).join(' · '))}</p>
      <div class="hmeta2"></div><p class="hdesc">${esc(arOk(m.synopsis) ? m.synopsis : '')}</p>
      <button class="hbtn" data-id="${esc(m.id)}">${I.play} شاهد الآن</button></div>
      <img class="hpost" src="${esc(m.poster)}" alt=""></div>`;
  }).join('') + `<div class="hdots" dir="rtl">${items.map((_, i) => `<button data-i="${i}" style="--d:${DUR}ms"><i></i></button>`).join('')}</div>`;
  view.insertBefore(box, view.firstChild);
  const slides = [...box.querySelectorAll('.hslide')], dots = [...box.querySelectorAll('.hdots button')];
  const loaded = new Set();
  let cur = -1, paused = false;
  const show = (i) => {
    cur = (i + items.length) % items.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === cur));
    dots.forEach((d, k) => { d.classList.remove('on'); if (k === cur) { void d.offsetWidth; d.classList.add('on'); } });
    if (!loaded.has(cur)) { loaded.add(cur); const s = slides[cur]; heroDesc(items[cur], s.querySelector('.hdesc'), s.querySelector('.hmeta2')); }
  };
  box.querySelectorAll('.hbtn').forEach(b => b.onclick = () => openMeta('ar', b.dataset.id));
  dots.forEach(d => d.onclick = () => show(+d.dataset.i));
  box.onmouseenter = () => (paused = true); box.onmouseleave = () => (paused = false);
  show(0);
  let t0 = Date.now();
  heroTimer = setInterval(() => {
    if (!document.body.contains(box)) return clearInterval(heroTimer);
    if (paused) { t0 += 250; return; }
    if (Date.now() - t0 >= DUR) { t0 = Date.now(); show(cur + 1); }
  }, 250);
}


/* ===== لوحة البحث (مثل command palette) ===== */
const SRCH = svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>');
let smTok = 0;
function closeSearch() { const s = $('#sm'); if (s) s.remove(); smTok++; }
async function smSearch(q) {
  const nq = normT(q);
  const [a, w, a4, cu] = await Promise.all([
    window.api.ar.search(q).catch(() => []), witSearch(q).catch(() => []), a4uSearch(q).catch(() => []),
    customList().then(l => l.filter(m => keysOf(m).some(k => k.includes(nq)))).catch(() => [])
  ]);
  const r = dedupe([...cu, ...a4, ...a, ...w], newSeen());
  r.forEach(m => arCache.set(m.id, m));
  return r.slice(0, 30);
}
function openSearch() {
  if ($('#sm')) return;
  const sm = document.createElement('div'); sm.id = 'sm';
  sm.innerHTML = `<div class="smbox"><div class="smin">${SRCH}<input id="smq" placeholder="ابحث عن أنمي…" autocomplete="off" spellcheck="false"><button id="smx" class="hide" title="مسح">${I.close}</button></div>
    <div class="smpanel"><div class="smres" id="smres"></div>
    <div class="smfoot"><span><kbd>↑</kbd><kbd>↓</kbd> تنقّل</span><span><kbd>↵</kbd> اختيار</span><span class="sp"></span><span><kbd>esc</kbd> إغلاق</span></div></div></div>`;
  document.body.appendChild(sm);
  const inp = sm.querySelector('#smq'), res = sm.querySelector('#smres'), x = sm.querySelector('#smx');
  let rows = [], act = -1, tm;
  const setAct = (i) => { rows.forEach((r, k) => r.classList.toggle('on', k === i)); act = i; if (rows[i]) rows[i].scrollIntoView({ block: 'nearest' }); };
  const idle = () => (res.innerHTML = '<div class="smempty"><div class="ic">' + SRCH + '</div><h4>ابدأ بكتابة اسم الأنمي</h4><p>ابحث بالعربية أو الإنجليزية</p></div>', rows = [], act = -1);
  const empty = () => {
    res.innerHTML = `<div class="smempty"><div class="ic">${SRCH}</div><h4>لم يتم العثور على نتائج</h4><p>لم يطابق بحثك أي نتيجة. حاول مرة أخرى.</p><button id="smclr">مسح البحث</button></div>`;
    res.querySelector('#smclr').onclick = () => { inp.value = ''; x.classList.add('hide'); inp.focus(); idle(); };
    rows = []; act = -1;
  };
  const pick = (id) => { closeSearch(); $('#q').value = ''; openMeta('ar', id); };
  const show = (list) => {
    if (!list.length) return empty();
    res.innerHTML = list.map(m => `<div class="smrow" data-id="${esc(m.id)}"><img src="${esc(m.poster)}" alt=""><div><b>${esc(m.name)}</b><small>${esc([m.nameEn && m.nameEn !== m.name ? m.nameEn : '', arOk(m.type) ? m.type : ''].filter(Boolean).join(' · '))}</small></div>${arOk(m.score) ? `<span class="sc">${I.star} ${esc(m.score)}</span>` : ''}</div>`).join('');
    rows = [...res.querySelectorAll('.smrow')];
    rows.forEach((r, i) => { r.onmouseenter = () => setAct(i); r.onclick = () => pick(r.dataset.id); });
    setAct(0);
  };
  const run = async (q) => {
    const tk = ++smTok;
    res.innerHTML = '<div class="smempty"><p>جارٍ البحث…</p></div>';
    let list = []; try { list = await smSearch(q); } catch {}
    if (tk === smTok && $('#sm')) show(list);
  };
  idle();
  inp.oninput = () => {
    const q = inp.value.trim(); x.classList.toggle('hide', !inp.value);
    clearTimeout(tm); smTok++;
    if (!q) return idle();
    tm = setTimeout(() => run(q), 300);
  };
  x.onclick = () => { inp.value = ''; x.classList.add('hide'); clearTimeout(tm); smTok++; idle(); inp.focus(); };
  inp.onkeydown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); rows.length && setAct((act + 1) % rows.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); rows.length && setAct((act - 1 + rows.length) % rows.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[act]) pick(rows[act].dataset.id); }
  };
  sm.onmousedown = (e) => { if (e.target === sm) closeSearch(); };
  inp.focus();
}
$('#q').onfocus = () => { $('#q').blur(); openSearch(); };
$('#q').onclick = () => openSearch();
$('#qb').onclick = () => openSearch();
document.querySelector('.sb').onclick = () => openSearch();
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#sm') ? closeSearch() : openSearch(); }
});

/* ===== زر «تصفّح»: قايمة (كومبو) فيها الأقسام + التصنيفات + المفضلة + الرئيسية ===== */
(() => {
  const btn = $('#mbtn'); if (!btn) return;
  let menu = null;
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } btn.classList.remove('open'); };
  const openMenu = () => {
    closeMenu(); btn.classList.add('open');
    menu = document.createElement('div'); menu.id = 'mmenu';
    const secs = AR_SECS.map(([v, n]) => `<button type="button" data-sec="${esc(v)}">${esc(n)}</button>`).join('');
    const gens = AR_GENRES.map(([n, v]) => `<button type="button" data-gen="${esc(v)}">${esc(n)}</button>`).join('');
    menu.innerHTML = `<div class="mmtop"><button type="button" data-go="home">${I.home || ''}<span>الرئيسية</span></button><button type="button" data-go="fav">${I.heartF || ''}<span>المفضلة</span></button></div>
      <h5>الأقسام</h5><div class="mmgrid">${secs}</div>
      <h5>التصنيفات</h5><div class="mmgrid mmgen">${gens}</div>`;
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.insetInlineStart = 'auto';
    menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      closeMenu(); $('#q').value = '';
      if (b.dataset.go === 'home') { loadCatalog(); }
      else if (b.dataset.go === 'fav') { showList(I.heartF + ' المفضلة', 'fav', 'nFav'); }
      else if (b.dataset.sec) { AF.sec = b.dataset.sec; AF.genre = ''; AF.type = 'SERIES'; loadCatalog(); }
      else if (b.dataset.gen) { AF.genre = b.dataset.gen; AF.type = 'SERIES'; loadCatalog(); }
    };
  };
  btn.onclick = (e) => { e.stopPropagation(); menu ? closeMenu() : openMenu(); };
  document.addEventListener('mousedown', (e) => { if (menu && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', closeMenu);
})();

/* التطبيق عربي فقط: نستبدل دوال الكتالوج القديمة بالمصدر العربي */
{
  loadCatalog = (s) => arLoadCatalog(s);
  openMeta = (type, id) => openAr(id);
  init = () => arLoadCatalog();
  subAddon = '';
  let lastRef = Date.now();
  async function arRefresh() {                                        // تحديث تلقائي: نجيبو الجديد ونحطوه فوق
    lastRef = Date.now();
    if (AF.busy || !$('#agrid') || AF.sec !== 'latest' || AF.genre || AF.type !== 'SERIES') return;
    try {
      const [r, w] = await Promise.all([window.api.ar.list({ latest: true, limit: AR_PAGE, from: 0 }), witLatest()]);
      const fresh = dedupe([...r, ...w], AF.seen);
      if (!fresh.length || !$('#agrid')) return;
      fresh.forEach(m => newIds.add(m.id)); markKnown(fresh);
      AF.list.unshift(...fresh);
      $('#agrid').insertAdjacentHTML('afterbegin', fresh.map(arCard).join(''));
      bindCards(); $('#acount').textContent = AF.list.length + ' أنمي';
      toast('تزاد ' + fresh.length + ' أنمي جديد');
    } catch {}
  }
  window.arRefresh = arRefresh;
  /* ===== فحص آخر الحلقات الحقيقية كل 30 دقيقة (anime4up + WitAnime + Animeify + Stardima) ===== */
  const EP_EVERY = 30 * 60 * 1000;
  let epLast = 0, epBusy = false;
  async function epCheck(manual) {
    if (epBusy) return; epBusy = true; epLast = Date.now();
    try {
      const list = await latestEpisodes();
      if (!list.length) { if (manual) toast('لم نجد حلقات حاليًا'); return; }
      const known = new Set(store.get('epSeen2', []));
      const first = known.size === 0;
      const fresh = first ? [] : list.filter(x => !known.has(epKey(x)));
      store.set('epSeen2', [...new Set([...known, ...list.map(epKey)])].slice(-3000));
      store.set('epCheckedAt', Date.now());
      fresh.forEach(x => epNew.add(epKey(x)));
      const box = $('#agrid');
      if (box && AF.sec === 'EPS' && !AF.genre) {            // القسم مفتوح: نحطو الجديد فوق ونعاودو الترتيب
        AF.list = [...fresh, ...list.filter(x => !fresh.includes(x))];
        box.innerHTML = epGridHtml(AF.list); bindCards(); bindEpStatus();
        const c = $('#acount'); if (c) c.textContent = AF.list.length + ' حلقة · آخر تحديث ' + new Date().toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
      }
      if (fresh.length) toast('صدرت ' + fresh.length + ' حلقة جديدة في «آخر الحلقات»');
      else if (manual) toast('لا توجد حلقة جديدة حاليًا');
    } catch (e) { if (manual) toast('خطأ: ' + errMsg(e)); }
    finally { epBusy = false; }
  }
  window.epCheck = epCheck;
  setTimeout(() => epCheck(false), 15000);
  setInterval(() => epCheck(false), EP_EVERY);
  setInterval(arRefresh, 5 * 60 * 1000);
  pushBg();
  if (window.api.onHidden) window.api.onHidden(() => document.querySelectorAll('video,audio').forEach(v => { try { v.pause(); } catch {} }));
  setTimeout(watchNew, 20000); setInterval(watchNew, 10 * 60 * 1000);   // فحص الحلقات الجديدة للمفضلة وآخر ما شاهدته
  if (window.api.onNotifyOpen) window.api.onNotifyOpen((id) => openAr(id));
  // ضغط على إشعار (أو زر «شاهد»): نفتحو الحلقة مباشرة
  const waLaunch = async () => { try { const l = await window.api.notifyLaunch(); if (l && l.id) openAr(l.id, l.ep ? String(l.ep) : undefined); } catch {} };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) waLaunch(); });
  setTimeout(waLaunch, 1500);
  if (notifyOn) setTimeout(() => { try { window.api.notifyPerm(); } catch {} }, 4000);
  window.addEventListener('focus', () => { if (Date.now() - lastRef > 60000) arRefresh(); if (Date.now() - epLast > EP_EVERY) epCheck(false); });
  view.addEventListener('scroll', () => {
    if ($('#agrid') && view.scrollTop + view.clientHeight > view.scrollHeight - 400) arMore();
  });
}

/* ===== زر الرجوع: يرجع للصفحة اللي كنتي فيها قبل ===== */
const navStack = []; let navCur = null;
function navUpd() { const b = $('#wBack'); if (b) b.disabled = !navStack.length; }
function navTrack(fn, keyOf) {
  return function (...a) {
    const k = keyOf(...a);
    if (!navCur || navCur.k !== k) { if (navCur) { navStack.push(navCur); if (navStack.length > 40) navStack.shift(); } navCur = { k, run: () => fn(...a) }; }
    else navCur.run = () => fn(...a);
    navUpd();
    return fn.apply(this, a);
  };
}
arLoadCatalog = navTrack(arLoadCatalog, (s) => 'cat:' + (s || ''));
openAr = navTrack(openAr, (id) => 'ar:' + id);
showList = navTrack(showList, (t, key) => 'list:' + key);
function navBack() {
  if (document.querySelector('#pl') || document.querySelector('#sm')) return;   // المشغّل/البحث مفتوحين: ما نرجعوش
  const prev = navStack.pop(); if (!prev) return;
  navCur = prev; navUpd();
  try { prev.run(); } catch {}
}
$('#wBack').onclick = navBack;
document.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); navBack(); } });
document.addEventListener('mouseup', (e) => { if (e.button === 3) { e.preventDefault(); navBack(); } });

// ===== تحديث أوتوماتيكي: شريط التقدم + نافذة «أعد التشغيل» =====
function showUpdState(s) {
  if (!s) return;
  let bar = document.getElementById('updbar');
  if (s.state === 'available' || s.state === 'progress') {
    if (!bar) { bar = document.createElement('div'); bar.id = 'updbar'; bar.innerHTML = '<span></span><i><b></b></i>'; document.body.appendChild(bar); }
    const p = s.percent || 0; bar.querySelector('span').textContent = 'جاري تحميل نسخة جديدة… ' + (s.state === 'progress' ? p + '%' : '');
    bar.querySelector('b').style.width = p + '%'; return;
  }
  if (s.state !== 'ready') return;
  if (bar) bar.remove();
  if (document.getElementById('upd')) return;
  const d = document.createElement('div'); d.id = 'upd';
  d.innerHTML = `<div class="ub" role="dialog" aria-modal="true"><img src="assets/icon.png" alt=""><h2>النسخة الجديدة جاهزة</h2><p class="uv">${esc(s.current || '')} ${I.arrowL} <b>${esc(s.version)}</b></p>${(s.notes || []).length ? '<ul>' + s.notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul>' : ''}<div class="ua"><button class="go" id="udl">إعادة التشغيل والتحديث</button><button class="lt" id="ulater">لاحقًا</button></div><p class="un">إذا اخترت «لاحقًا»، ستُثبَّت تلقائيًا عند إغلاق التطبيق.</p></div>`;
  document.body.appendChild(d);
  d.querySelector('#udl').onclick = () => { d.querySelector('#udl').textContent = 'جارٍ التحديث…'; window.api.update.install(); };
  d.querySelector('#ulater').onclick = () => d.remove();
}
if (window.api && window.api.update) { window.api.update.onState(showUpdState); window.api.update.state().then(showUpdState).catch(() => {}); }
if (!window.api) say('لم يعمل preload.js (window.api غير موجود). تأكد أن preload.js في نفس مجلد main.js.');
else init();

