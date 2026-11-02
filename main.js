const { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu, nativeImage, safeStorage, dialog } = require('electron');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const WebTorrent = require('webtorrent');

let mainWin = null, tray = null, quitting = false, hintShown = false;
const bg = { keep: true, autostart: false };
function showMain() { const w = mainWin; if (!w) return createWindow(); if (w.isMinimized()) w.restore(); w.show(); w.focus(); }
function makeTray() {
  if (tray) return;
  try {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 }));
    tray.setToolTip('WayAnime');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'فتح WayAnime', click: showMain },
      { type: 'separator' },
      { label: 'إغلاق نهائي', click: () => { quitting = true; app.quit(); } }
    ]));
    tray.on('click', showMain);
  } catch (e) { console.log('[tray]', e.message); }
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 600,
    title: 'WayAnime', icon: path.join(__dirname, 'assets', 'icon.png'), backgroundColor: '#07060c', frame: false, autoHideMenuBar: true,
    show: !process.argv.includes('--hidden'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false }
  });
  mainWin = win;
  // عند الإغلاق: نخبّيو النافذة فـ الـ tray ويبقى التطبيق خدام (باش الإشعارات تبقى توصل)
  win.on('close', (e) => {
    if (bg.keep && !quitting) {
      e.preventDefault();
      win.hide();
      win.webContents.send('app:hidden');   // نوقفو الفيديو
      if (!hintShown && Notification.isSupported()) { hintShown = true; new Notification({ title: 'WayAnime', body: 'التطبيق مازال خدام فـ الخلفية باش يجيك إشعار بالحلقات الجديدة. من أيقونة الـ tray تقدر تفتحو أو تسكّرو نهائياً.', icon: path.join(__dirname, 'assets', 'icon.png') }).show(); }
    }
  });
  win.setMenuBarVisibility(false);
  win.webContents.on('console-message', (...a) => console.log('[renderer]', a[2]));
  win.webContents.on('did-fail-load', (_e, code, desc) => console.log('[load failed]', code, desc));
  win.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F12') win.webContents.toggleDevTools(); });
  win.loadFile('index.html');
}

// الطلبات للإضافات من العملية الرئيسية (بدون CORS)
ipcMain.handle('addon:get', async (_e, url) => {
  if (!/^https?:\/\//i.test(url)) throw new Error('رابط غير صالح');
  const res = await fetch(url, { headers: { 'User-Agent': 'WayAnime' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
});

// ===== حساب موقع البطاقات: نفس اسم المستخدم وكلمة السر ديال الموقع =====
// بدّل العنوان هنا (أو حطو فـ متغير البيئة CARDS_SITE) بعنوان موقع البطاقات ديالك.
const CARDS_SITE = String(process.env.CARDS_SITE || 'https://anime-cards-iei9.onrender.com').replace(/\/+$/, '');
const sessFile = () => path.join(app.getPath('userData'), 'cards-session.bin');
function readSid() {
  try {
    const raw = require('fs').readFileSync(sessFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch { return ''; }
}
function saveSid(sid) {
  try {
    if (!sid) return require('fs').rmSync(sessFile(), { force: true });
    require('fs').writeFileSync(sessFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(sid) : Buffer.from(sid, 'utf8'));
  } catch (e) { console.log('[acct] save failed', e.message); }
}
const absUrl = (u) => {
  if (u && typeof u === 'object') u = u.url || u.src || u.path || '';
  u = (typeof u === 'string' || typeof u === 'number') ? String(u).trim() : '';
  if (!u) return '';
  if (/^https?:\/\//i.test(u) || /^data:image\//i.test(u)) return u;
  return CARDS_SITE + (u.startsWith('/') ? '' : '/') + u;
};
async function fetchMe(sid) {
  // الأول كنجربو الـ API الجديدة /api/wa/profile (صورة + بانر + نقاط)، وإلا ما كانتش كنرجعو لـ /api/me
  try {
    const rp = await fetch(CARDS_SITE + '/api/wa/profile', { headers: { Cookie: 'sid=' + sid, 'User-Agent': 'WayAnime' }, signal: AbortSignal.timeout(15000) });
    if (rp.status === 401) return null;
    if (rp.ok) {
      const d = await rp.json();
      if (d && d.ok) return { username: String(d.username || ''), pts: Number(d.pts) || 0, pic: absUrl(d.pic), banner: absUrl(d.banner) };
    }
  } catch (e) { console.log('[acct] /api/wa/profile failed, fallback /api/me:', e.message); }
  const r = await fetch(CARDS_SITE + '/api/me', { headers: { Cookie: 'sid=' + sid, 'User-Agent': 'WayAnime' }, signal: AbortSignal.timeout(15000) });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json(); const u = j && j.user; if (!u) return null;
  return { username: String(u.username || ''), pts: Number(u.pts) || 0, pic: pickPic(u, j), banner: pickBanner(u, j) };
}
// يلقى صورة البروفايل مهما كان سميت الحقل (يقلب فـ user وفـ ما بداخلو)
function pickPic(u, root) {
  const KEYS = ['pic', 'avatar', 'avatarUrl', 'avatar_url', 'avatarURL', 'picture', 'image', 'img', 'photo', 'photoUrl', 'photo_url', 'profile_pic', 'profilePic', 'profile_picture', 'profilePicture', 'profile_photo', 'profilePhoto', 'pfp', 'icon'];
  const looksImg = (v) => typeof v === 'string' && v.trim() && (/^data:image\//i.test(v) || /^https?:\/\//i.test(v) || /^\//.test(v) || /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(v));
  const fromVal = (v) => { if (!v) return ''; if (typeof v === 'object') v = v.url || v.src || v.path || v.href || ''; return looksImg(v) ? absUrl(v) : ''; };
  for (const k of KEYS) { const r = fromVal(u[k]); if (r) return r; }
  // أي حقل سميتو فيها pic/avatar/photo/img/pfp
  for (const k of Object.keys(u)) { if (/pic|avatar|photo|img|image|pfp|portrait/i.test(k) && !/banner|cover|bg/i.test(k)) { const r = fromVal(u[k]); if (r) return r; } }
  // كائنات متداخلة (profile / settings ...)
  for (const k of Object.keys(u)) { const o = u[k]; if (o && typeof o === 'object' && !Array.isArray(o)) { for (const kk of Object.keys(o)) { if (/pic|avatar|photo|img|image|pfp/i.test(kk) && !/banner|cover|bg/i.test(kk)) { const r = fromVal(o[kk]); if (r) return r; } } } }
  // مرات الصورة كتجي فـ root (j.avatar / j.pic)
  if (root && typeof root === 'object') { for (const k of KEYS) { const r = fromVal(root[k]); if (r) return r; } }
  console.log('[acct] no profile pic found, user keys:', Object.keys(u).join(','));
  return '';
}

// يلقى بانر البروفايل (الصورة العريضة)
function pickBanner(u, root) {
  const KEYS = ['banner', 'bannerUrl', 'banner_url', 'bannerURL', 'bannerImage', 'banner_image', 'profile_banner', 'profileBanner', 'cover', 'coverUrl', 'cover_url', 'coverImage', 'header', 'headerImage', 'header_image', 'bg', 'background'];
  const looksImg = (v) => typeof v === 'string' && v.trim() && (/^data:image\//i.test(v) || /^https?:\/\//i.test(v) || /^\//.test(v) || /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(v));
  const fromVal = (v) => { if (!v) return ''; if (typeof v === 'object') v = v.url || v.src || v.path || v.href || ''; return looksImg(v) ? absUrl(v) : ''; };
  for (const k of KEYS) { const r = fromVal(u[k]); if (r) return r; }
  for (const k of Object.keys(u)) { if (/banner|cover|header/i.test(k)) { const r = fromVal(u[k]); if (r) return r; } }
  for (const k of Object.keys(u)) { const o = u[k]; if (o && typeof o === 'object' && !Array.isArray(o)) { for (const kk of Object.keys(o)) { if (/banner|cover|header/i.test(kk)) { const r = fromVal(o[kk]); if (r) return r; } } } }
  if (root && typeof root === 'object') { for (const k of KEYS) { const r = fromVal(root[k]); if (r) return r; } }
  console.log('[acct] no banner found, user keys:', Object.keys(u).join(','));
  return '';
}
ipcMain.handle('acct:me', async () => {
  const sid = readSid(); if (!sid) return { user: null };
  try { const user = await fetchMe(sid); if (!user) saveSid(''); return { user }; }
  catch (e) { return { user: null, offline: true, error: e.message }; }
});
ipcMain.handle('acct:login', async (_e, { username, password }) => {
  const r = await fetch(CARDS_SITE + '/auth/loginpw', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'WayAnime' },
    body: JSON.stringify({ username: String(username || '').trim(), password: String(password || '') }), signal: AbortSignal.timeout(20000)
  }).catch(() => { throw new Error('تعذّر الاتصال بموقع البطاقات'); });
  if (r.status === 429) throw new Error('محاولات كثيرة، جرّب من بعد شوية');
  if (r.status === 401) throw new Error('اسم المستخدم أو كلمة السر غالطين');
  if (!r.ok) throw new Error('خطأ من الموقع (' + r.status + ')');
  const ck = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map((c) => /(?:^|[\s;])sid=([^;]+)/.exec(c)).find(Boolean);
  if (!ck) throw new Error('الموقع ما رجّعش جلسة');
  saveSid(ck[1]);
  const user = await fetchMe(ck[1]);
  if (!user) { saveSid(''); throw new Error('فشل تسجيل الدخول'); }
  return { user };
});
ipcMain.handle('acct:logout', async () => {
  const sid = readSid(); saveSid('');
  if (sid) fetch(CARDS_SITE + '/auth/logout', { headers: { Cookie: 'sid=' + sid }, redirect: 'manual' }).catch(() => {});
  return true;
});
ipcMain.handle('logos:list', () => { try { return require('fs').readdirSync(path.join(__dirname, 'assets', 'logos')).filter((f) => /\.png$/i.test(f)); } catch { return []; } });
ipcMain.handle('acct:site', () => CARDS_SITE);
// مزامنة المفضلة وسجل المشاهدة مع حساب الموقع
ipcMain.handle('sync:get', async () => {
  const sid = readSid(); if (!sid) return null;
  const r = await fetch(CARDS_SITE + '/api/wa/sync', { headers: { Cookie: 'sid=' + sid }, signal: AbortSignal.timeout(20000) });
  if (r.status === 401) { saveSid(''); return null; }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
});
ipcMain.handle('sync:put', async (_e, body) => {
  const sid = readSid(); if (!sid) return null;
  const r = await fetch(CARDS_SITE + '/api/wa/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'sid=' + sid }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (r.status === 401) { saveSid(''); return null; }
  if (r.status !== 409 && !r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
});

// أزرار النافذة (بدون شريط العنوان الأصلي)
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
ipcMain.handle('win:min', (e) => winOf(e).minimize());
ipcMain.handle('win:close', (e) => winOf(e).close());
ipcMain.handle('win:max', (e) => { const w = winOf(e), was = w.isMaximized(); was ? w.unmaximize() : w.maximize(); return !was; });
// ===== تحديث أوتوماتيكي (electron-updater): كيحمل فـ الخلفية وكيسول الشخص يعاود التشغيل =====
let updReady = null;
const sendUpd = (s) => BrowserWindow.getAllWindows().forEach((w) => { try { w.webContents.send('update:state', s); } catch {} });
ipcMain.handle('update:state', () => updReady);
if (app.isPackaged) {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (i) => sendUpd({ state: 'available', version: i.version }));
    autoUpdater.on('download-progress', (p) => sendUpd({ state: 'progress', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (i) => {
      const raw = Array.isArray(i.releaseNotes) ? i.releaseNotes.map((x) => x.note).join('\n') : String(i.releaseNotes || '');
      const notes = raw.replace(/<\/(li|p|div|h\d)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n').map((x) => x.replace(/^[\s\-*•]+/, '').trim()).filter(Boolean).slice(0, 8);
      updReady = { state: 'ready', version: i.version, current: app.getVersion(), notes };
      sendUpd(updReady);
    });
    autoUpdater.on('error', (e) => console.log('[updater]', e && e.message));
    const chk = () => autoUpdater.checkForUpdates().catch(() => {});
    app.whenReady().then(() => { setTimeout(chk, 8000); setInterval(chk, 6 * 3600 * 1000); });
    ipcMain.handle('update:install', () => { quitting = true; autoUpdater.quitAndInstall(true, true); });
  } catch (e) { console.log('[updater] غير متوفر:', e.message); }
}
ipcMain.handle('open:external', (_e, url) => {
  if (/^(https?|magnet):/i.test(url)) return shell.openExternal(url);
});

ipcMain.handle('addon:text', async (_e, url) => {
  if (!/^https?:\/\//i.test(url)) throw new Error('رابط غير صالح');
  const res = await fetch(url, { headers: { 'User-Agent': 'WayAnime' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
});

// ترجمة النصوص إلى العربية
ipcMain.handle('translate', async (_e, text) => {
  const u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=' + encodeURIComponent(String(text).slice(0, 1800));
  const r = await fetch(u);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  return j[0].map((x) => x[0]).join('');
});

// AniList: عدد الحلقات المعروضة (GraphQL)
ipcMain.handle('anilist:info', async (_e, title) => {
  const query = 'query($s:String){Page(perPage:6){media(search:$s,type:ANIME,sort:SEARCH_MATCH){id format status episodes title{romaji english native} synonyms nextAiringEpisode{episode airingAt}}}}';
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { s: String(title).slice(0, 200) } }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('AniList HTTP ' + r.status);
  const j = await r.json();
  return (j.data && j.data.Page && j.data.Page.media) || [];
});

// AniList: وصف الأنمي + التقييم (المصدر الأول: أدق وأسرع من Jikan)
ipcMain.handle('anilist:desc', async (_e, names) => {
  const nz = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');
  const same = (a, b) => { if (!a || !b) return false; if (a === b) return true; const [sh, lo] = a.length < b.length ? [a, b] : [b, a]; return sh.length >= 6 && lo.includes(sh) && sh.length / lo.length >= 0.7; };
  const list = [...new Set((names || []).map((n) => String(n || '').trim()).filter(Boolean))].slice(0, 3);
  const want = list.map(nz).filter(Boolean);
  const query = 'query($s:String){Page(perPage:8){media(search:$s,type:ANIME,sort:SEARCH_MATCH){id title{romaji english native} synonyms description(asHtml:false) averageScore siteUrl}}}';
  for (const n of list) {
    for (let k = 0; k < 2; k++) {
      let r;
      try {
        r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables: { s: n.slice(0, 200) } }), signal: AbortSignal.timeout(9000) });
      } catch { break; }
      if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500)); continue; }
      if (!r.ok) break;
      const j = await r.json();
      const media = (j.data && j.data.Page && j.data.Page.media) || [];
      const a = media.find((x) => [x.title && x.title.romaji, x.title && x.title.english, x.title && x.title.native, ...(x.synonyms || [])].map(nz).some((t) => want.some((w) => same(t, w))));
      if (a && a.description) {
        const text = String(a.description).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\(Source:[^)]*\)/gi, '').replace(/\[Written by[^\]]*\]/gi, '').replace(/\n{2,}/g, '\n').trim();
        if (text) return { description: text, score: a.averageScore ? (a.averageScore / 10).toFixed(1) : '', url: a.siteUrl || '' };
      }
      break;
    }
  }
  return null;
});

// AniList: جدول الحلقات القادمة (7 أيام) — الأنمي اللي غادي يخرج
ipcMain.handle('anilist:schedule', async (_e, days) => {
  const from = Math.floor(Date.now() / 1000), to = from + Math.min(Math.max(Number(days) || 7, 1), 14) * 86400;
  const query = 'query($from:Int,$to:Int,$page:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){airingAt episode media{id format countryOfOrigin isAdult title{romaji english native} coverImage{large medium}}}}}';
  const out = [];
  for (let page = 1; page <= 6; page++) {
    const r = await fetch('https://graphql.anilist.co', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { from, to, page } }), signal: AbortSignal.timeout(12000)
    });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500)); page--; continue; }
    if (!r.ok) throw new Error('AniList HTTP ' + r.status);
    const j = await r.json();
    const P = j.data && j.data.Page; if (!P) break;
    for (const s of P.airingSchedules || []) {
      const md = s.media; if (!md || md.isAdult || md.countryOfOrigin !== 'JP' || !/^(TV|TV_SHORT|ONA|OVA|MOVIE|SPECIAL)$/.test(md.format || '')) continue;
      out.push({ at: s.airingAt, ep: s.episode, id: md.id, format: md.format, title: md.title.english || md.title.romaji || md.title.native || '', romaji: md.title.romaji || '', img: (md.coverImage && (md.coverImage.large || md.coverImage.medium)) || '' });
    }
    if (!P.pageInfo || !P.pageInfo.hasNextPage) break;
  }
  return out;
});

// AniList: شخصيات الأنمي (بالـ id اللي لقيناه فـ anilist:info)
ipcMain.handle('anilist:chars', async (_e, id) => {
  const query = 'query($id:Int){Media(id:$id,type:ANIME){characters(sort:[ROLE,FAVOURITES_DESC],perPage:12){edges{role node{id name{full native} image{large medium}}}}}}';
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { id: Number(id) } }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('AniList HTTP ' + r.status);
  const j = await r.json();
  const edges = (j.data && j.data.Media && j.data.Media.characters && j.data.Media.characters.edges) || [];
  return edges.map((e) => ({ id: e.node.id, name: e.node.name.full || e.node.name.native || '', role: e.role, img: (e.node.image && (e.node.image.large || e.node.image.medium)) || '' })).filter((c) => c.name && c.img);
});

// تشغيل التورنت: نحمّل الملف ونعطي الواجهة رابطاً محلياً للفيديو
let client = null, server = null;
function stopTorrent() {
  try { server && server.close(); } catch {}
  server = null;
  if (client) client.torrents.slice().forEach((t) => t.destroy());
}
ipcMain.handle('torrent:start', (_e, { infoHash, fileIdx, sources = [] }) => new Promise((resolve, reject) => {
  stopTorrent();
  client = client || new WebTorrent();
  const trackers = sources.filter((s) => String(s).startsWith('tracker:')).map((s) => '&tr=' + encodeURIComponent(s.slice(8))).join('');
  const t = client.add(`magnet:?xt=urn:btih:${infoHash}${trackers}`, { path: path.join(os.tmpdir(), 'wayanime') });
  const timer = setTimeout(() => { t.destroy(); reject(new Error('انتهت مهلة الاتصال بالتورنت')); }, 60000);
  t.on('error', (e) => { clearTimeout(timer); reject(e); });
  t.on('ready', () => {
    clearTimeout(timer);
    const vids = t.files.filter((f) => /\.(mp4|mkv|webm|m4v|avi|mov|flv|wmv|ts|m2ts|mpg|mpeg|ogv|3gp|divx)$/i.test(f.name)).sort((a, b) => b.length - a.length);
    const file = (fileIdx != null && t.files[fileIdx]) || vids[0];
    if (!file) return reject(new Error('لا يوجد ملف فيديو في هذا التورنت'));
    t.files.forEach((f) => f !== file && f.deselect());
    server = t.createServer({ origin: '*' });
    server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/${t.files.indexOf(file)}`, name: file.name }));
  });
}));

// ===== محرك الميديا الشامل: فحص الملف + تشغيل مباشر أو تحويل ذكي (ffmpeg) + ترجمات داخلية + ملفات محلية =====
const fsx = require('fs');
const ffmpegBin = () => require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const MEDIA_EXT = 'mp4,mkv,webm,avi,mov,flv,wmv,asf,ts,m2ts,mts,mpg,mpeg,m4v,3gp,3g2,ogv,ogm,divx,rm,rmvb,vob,f4v,mxf,mp3,flac,wav,ogg,oga,opus,aac,m4a,wma,ac3,mka'.split(',');
const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime', ogv: 'video/ogg', mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', aac: 'audio/aac', m4a: 'audio/mp4' };

function ffRun(args, { timeout = 25000 } = {}) {
  return new Promise((resolve) => {
    let p;
    try { p = spawn(ffmpegBin(), args, { windowsHide: true }); } catch (e) { return resolve({ code: -1, out: Buffer.alloc(0), err: String(e.message || e) }); }
    const out = [], err = [];
    p.stdout.on('data', (d) => out.push(d)); p.stderr.on('data', (d) => err.push(d));
    const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, timeout);
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out: Buffer.concat(out), err: Buffer.concat(err).toString('utf8') }); });
    p.on('error', (e) => { clearTimeout(t); resolve({ code: -1, out: Buffer.alloc(0), err: String(e.message || e) }); });
  });
}

// قراءة مخرجات `ffmpeg -i` (ما كاين ffprobe فـ ffmpeg-static)
const TEXT_SUBS = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text', 'subviewer', 'subviewer1', 'microdvd', 'sami', 'realtext', 'ttml', 'jacosub', 'mpl2', 'vplayer', 'stl', 'pjs']);
function parseProbe(txt) {
  const f = /Input #0, (.+?), from /.exec(txt);
  if (!f) return null;
  const d = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(txt);
  const info = { format: f[1], duration: d ? (+d[1]) * 3600 + (+d[2]) * 60 + parseFloat(d[3]) : 0, video: [], audio: [], subs: [], defA: -1 };
  let cur = null, vi = 0, ai = 0, si = 0;
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*Stream #0:(\d+)(?:\[0x[0-9a-fA-F]+\])?(?:\(([^)]*)\))?: (Video|Audio|Subtitle): (.*)$/.exec(line);
    if (m) {
      const rest = m[4], codec = ((/^([\w-]+)/.exec(rest) || [])[1] || '').toLowerCase(), lang = m[2] && m[2] !== 'und' ? m[2] : '';
      cur = null;
      if (m[3] === 'Video') {
        const idx = vi++;
        if (!/attached pic/i.test(rest)) { cur = { idx, codec, ten: /yuv4\d\dp1[0-6]|p010|p210|gbrp1|High 10|Main 10|10le|10be/i.test(rest), lang: '' }; info.video.push(cur); }
      } else if (m[3] === 'Audio') {
        cur = { idx: ai++, codec, lang, def: /\(default\)/.test(rest), ch: ((/\b(mono|stereo|2\.1|5\.1(?:\(side\))?|7\.1|\d+ channels)\b/.exec(rest) || [])[1] || ''), title: '' };
        info.audio.push(cur);
      } else {
        cur = { idx: si++, codec, lang, def: /\(default\)/.test(rest), text: TEXT_SUBS.has(codec), title: '' };
        info.subs.push(cur);
      }
      continue;
    }
    const t = cur && /^\s+title\s*:\s*(.+)$/i.exec(line);
    if (t && !cur.title) cur.title = t[1].trim();
  }
  info.defA = info.audio.findIndex((a) => a.def);
  return info;
}
const probeCache = new Map();
ipcMain.handle('media:probe', async (_e, url) => {
  url = String(url || '');
  if (!/^https?:\/\//i.test(url)) throw new Error('رابط غير صالح');
  if (probeCache.has(url)) return probeCache.get(url);
  const r = await ffRun(['-hide_banner', '-nostdin', '-analyzeduration', '6000000', '-probesize', '12000000', '-i', url], { timeout: 30000 });
  const info = parseProbe(r.err);
  if (!info) throw new Error('تعذّر قراءة الملف');
  probeCache.set(url, info);
  if (probeCache.size > 40) probeCache.delete(probeCache.keys().next().value);
  return info;
});

// جلسات التحويل: كل جلسة = ffmpeg كيرسل mp4 مجزّأ (fragmented) للمشغّل. mode: copy (ننسخو الفيديو ونحوّلو الصوت فقط = سريع) / full (H.264 + AAC)
const tcSess = new Map();
let tcSrv = null, tcN = 0;
function tcArgs(s) {
  const a = ['-v', 'error', '-nostdin'];
  if (s.start > 0) a.push('-ss', String(s.start));
  a.push('-i', s.url, '-map', `0:v:${s.v}?`, '-map', `0:a:${s.a}?`, '-sn', '-dn');
  if (s.mode === 'copy') a.push('-c:v', 'copy', ...(s.hevc ? ['-tag:v', 'hvc1'] : []));
  else a.push('-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '22', '-pix_fmt', 'yuv420p', '-vf', 'scale=-2:min(ih\\,1080)', '-threads', '0');
  if (s.acopy) a.push('-c:a', 'copy'); else a.push('-c:a', 'aac', '-ac', '2', '-b:a', '192k');
  a.push('-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1');
  return a;
}
function tcStartSrv() {
  if (tcSrv) return tcSrv;
  tcSrv = new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const m = /^\/t\/(\d+)/.exec(req.url || ''); const s = m && tcSess.get(m[1]);
      if (!s) { res.writeHead(404); return res.end(); }
      try { s.proc && s.proc.kill('SIGKILL'); } catch {}
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      const p = spawn(ffmpegBin(), tcArgs(s), { windowsHide: true });
      s.proc = p;
      p.stderr.on('data', () => {});
      p.on('error', () => { try { res.end(); } catch {} });
      p.stdout.pipe(res);
      res.on('close', () => { try { p.kill('SIGKILL'); } catch {} });
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
  return tcSrv;
}
function stopTranscode() { for (const s of tcSess.values()) { try { s.proc && s.proc.kill('SIGKILL'); } catch {} } tcSess.clear(); }
async function mediaStart(o = {}) {
  const url = String(o.url || '');
  if (!/^https?:\/\//i.test(url)) throw new Error('رابط غير صالح');
  stopTranscode();
  const id = String(++tcN);
  tcSess.set(id, { url, start: Math.max(0, Number(o.start) || 0), mode: o.mode === 'copy' ? 'copy' : 'full', v: o.v | 0, a: o.a | 0, acopy: !!o.acopy, hevc: !!o.hevc });
  const srv = await tcStartSrv();
  return `http://127.0.0.1:${srv.address().port}/t/${id}`;
}
ipcMain.handle('media:start', async (_e, o) => ({ url: await mediaStart(o) }));
ipcMain.handle('media:stop', () => { stopTranscode(); return true; });
ipcMain.handle('transcode:start', (_e, url) => mediaStart({ url, mode: 'full' }));   // توافق مع الكود القديم

// ترجمة داخل الملف (SRT/ASS/MOV_TEXT…) → WebVTT
ipcMain.handle('media:subs', async (_e, { url, index }) => {
  if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('رابط غير صالح');
  const r = await ffRun(['-v', 'error', '-nostdin', '-i', String(url), '-map', `0:s:${index | 0}`, '-f', 'webvtt', 'pipe:1'], { timeout: 180000 });
  const t = r.out.toString('utf8');
  if (!t.startsWith('WEBVTT')) throw new Error('تعذّر استخراج الترجمة');
  return t;
});

// ملفات محلية: سيرفر محلي (127.0.0.1) كيدعم Range باش أي ملف فـ الجهاز يتشغل ويتقدّم/يرجع
const localFiles = new Map();
let localSrv = null, localN = 0;
function localStart() {
  if (localSrv) return localSrv;
  localSrv = new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Expose-Headers': 'Content-Range,Content-Length,Accept-Ranges' };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      const m = /^\/f\/(\d+)/.exec(req.url || ''); const fp = m && localFiles.get(m[1]);
      let st; try { st = fp && fsx.statSync(fp); } catch {}
      if (!st) { res.writeHead(404, cors); return res.end(); }
      const ct = MIME[path.extname(fp).slice(1).toLowerCase()] || 'application/octet-stream';
      let start = 0, end = st.size - 1, code = 200;
      const rg = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (rg) {
        if (rg[1] === '' && rg[2] !== '') { start = Math.max(0, st.size - parseInt(rg[2], 10)); }
        else { start = parseInt(rg[1] || '0', 10); if (rg[2] !== '') end = Math.min(end, parseInt(rg[2], 10)); }
        if (start > end || start >= st.size) { res.writeHead(416, { ...cors, 'Content-Range': `bytes */${st.size}` }); return res.end(); }
        code = 206;
      }
      const h = { ...cors, 'Content-Type': ct, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 };
      if (code === 206) h['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
      res.writeHead(code, h);
      if (req.method === 'HEAD') return res.end();
      const rs = fsx.createReadStream(fp, { start, end });
      rs.on('error', () => res.destroy());
      res.on('close', () => rs.destroy());
      rs.pipe(res);
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
  return localSrv;
}
async function serveLocal(fp) {
  fp = String(fp || '');
  const ext = path.extname(fp).slice(1).toLowerCase();
  if (!fp || !MEDIA_EXT.includes(ext)) throw new Error('هاد النوع من الملفات ماشي فيديو/صوت');
  if (!fsx.existsSync(fp)) throw new Error('الملف ما كايناش');
  const id = String(++localN); localFiles.set(id, fp);
  if (localFiles.size > 200) localFiles.delete(localFiles.keys().next().value);
  const srv = await localStart();
  return { url: `http://127.0.0.1:${srv.address().port}/f/${id}/${encodeURIComponent(path.basename(fp))}`, name: path.basename(fp, path.extname(fp)) };
}
ipcMain.handle('media:open', async (e) => {
  const r = await dialog.showOpenDialog(winOf(e), { properties: ['openFile'], filters: [{ name: 'فيديو / صوت', extensions: MEDIA_EXT }, { name: 'كل الملفات', extensions: ['*'] }] });
  return r.canceled || !r.filePaths[0] ? null : serveLocal(r.filePaths[0]);
});
ipcMain.handle('media:serve', (_e, fp) => serveLocal(fp));
function decodeText(buf) {
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) buf = buf.subarray(3);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1256').decode(buf); }   // ترجمات عربية قديمة (Windows-1256)
}
// ملف ترجمة من الجهاز (srt / vtt / ass / ssa / sub / sbv) → نص WebVTT/SRT
ipcMain.handle('media:subfile', async (e, given) => {
  let fp = given && String(given);
  if (!fp) {
    const r = await dialog.showOpenDialog(winOf(e), { properties: ['openFile'], filters: [{ name: 'ترجمة', extensions: ['srt', 'vtt', 'ass', 'ssa', 'sub', 'sbv'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    fp = r.filePaths[0];
  }
  const ext = path.extname(fp).slice(1).toLowerCase();
  const txt = decodeText(fsx.readFileSync(fp));
  if (ext === 'srt' || ext === 'vtt') return txt;
  const tmp = path.join(os.tmpdir(), 'wayanime-sub-' + Date.now() + '.' + ext);
  fsx.writeFileSync(tmp, txt, 'utf8');
  const o = await ffRun(['-v', 'error', '-nostdin', '-i', tmp, '-f', 'webvtt', 'pipe:1'], { timeout: 30000 });
  try { fsx.unlinkSync(tmp); } catch {}
  const t = o.out.toString('utf8');
  if (!t.startsWith('WEBVTT')) throw new Error('صيغة ترجمة غير مدعومة');
  return t;
});


// ===== المصدر العربي (Animeify) — منقول من ani-cli-arabic =====
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const AR = {
  base: 'https://animeify.net/animeify/apis_v4/',
  token: '8cnY80AZSbUCmR26Vku1VUUY4',
  thumbs: 'https://animeify.net/animeify/files/thumbnails/',
  ready: null
};
function arInit() {
  if (AR.ready) return AR.ready;
  AR.ready = (async () => {
    try {
      const r = await fetch('https://api.ani-cli-arabic.dev/credentials', {
        headers: { 'X-Auth-Key': '6rK9z0XyW8vQ3J7pL2mN4sB1tH5gD0fA', 'User-Agent': 'AniCliAr/2.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (r.ok) {
        const j = await r.json();
        if (j.ANI_CLI_AR_API_BASE && j.ANI_CLI_AR_TOKEN) {
          AR.base = j.ANI_CLI_AR_API_BASE; AR.token = j.ANI_CLI_AR_TOKEN;
          if (j.THUMBNAILS_BASE_URL) AR.thumbs = j.THUMBNAILS_BASE_URL;
        }
      }
    } catch {}
  })();
  return AR.ready;
}
async function arPost(endpoint, payload) {
  await arInit();
  const res = await fetch(AR.base.replace(/\/+$/, '') + '/' + endpoint.replace(/^\/+/, ''), {
    method: 'POST',
    body: new URLSearchParams({ ...payload, Token: payload.Token || AR.token }),
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
function arMap(it) {
  const th = it.Thumbnail || it.CoverImage || '';
  return {
    id: String(it.AnimeId || it.id || ''),
    name: it.AR_Title || it.anime_name || it.EN_Title || it.Title || '—',
    nameEn: it.EN_Title || it.Title || '',
    poster: th && !/^http/i.test(th) ? AR.thumbs + th : th,
    logo: it.Logo || it.TitleLogo || it.logo || '',
    genres: it.Genres || '', score: it.Score || '', synopsis: it.Story || it.Synopsis || '',
    episodes: it.Episodes || '', status: it.Status || '', season: it.Season || '', type: it.Type || ''
  };
}
async function arList({ latest, filterType = '', filterData = '', type = 'SERIES', from = 0, limit = 30 } = {}) {
  const endpoint = latest ? 'anime/load_latest_anime.php' : 'anime/load_anime_list_v2.php';
  const base = latest ? { UserId: '0', Language: 'English' }
    : { UserId: '0', Language: 'English', FilterType: filterType, FilterData: filterData, Type: type };
  const out = []; let cur = from;
  while (out.length < limit) {
    const data = await arPost(endpoint, { ...base, From: String(cur) });
    if (!Array.isArray(data) || !data.length) break;
    const batch = data.filter((x) => x && typeof x === 'object').map(arMap);
    out.push(...batch);
    if (batch.length < 10) break;
    cur += batch.length;
  }
  return out.slice(0, limit);
}
ipcMain.handle('ar:list', (_e, opts) => arList(opts));
ipcMain.handle('ar:search', async (_e, q) => {
  q = String(q || '').trim();
  if (!q) return [];
  const [a, b] = await Promise.all([
    arList({ filterType: 'SEARCH', filterData: q, type: 'SERIES', limit: 20 }).catch(() => []),
    arList({ filterType: 'SEARCH', filterData: q, type: 'MOVIE', limit: 20 }).catch(() => [])
  ]);
  return [...a, ...b];
});
ipcMain.handle('ar:episodes', async (_e, id) => {
  const data = await arPost('episodes/load_episodes.php', { AnimeID: String(id) });
  if (!Array.isArray(data)) return [];
  return data.filter((e) => e && typeof e === 'object')
    .map((e, i) => ({ num: String(e.Episode ?? i + 1), type: e.Type || 'Episode', raw: e }))
    .sort((a, b) => (parseFloat(a.num) || 0) - (parseFloat(b.num) || 0));
});
async function mediafireDirect(v) {
  try {
    const url = /^https?:/i.test(v) ? v : 'https://www.mediafire.com/file/' + v;
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const m = (await r.text()).match(/https:\/\/download[^"'\s>]+/);
    return m ? m[0].replace(/&amp;/g, '&') : null;
  } catch { return null; }
}
ipcMain.handle('ar:streams', async (_e, ep) => {
  const defs = [['FRFhdQ', '1080p'], ['FRLink', '720p'], ['FRLowQ', '480p']];
  const res = await Promise.all(defs.map(async ([k, q]) => (ep && ep[k] ? { q, url: await mediafireDirect(ep[k]) } : null)));
  return res.filter((x) => x && x.url);
});

ipcMain.handle('ar:direct', (_e, url) => mediafireDirect(String(url || '')));
// جلب صفحات HTML (للمواقع العربية مثل WitAnime) — التحليل يتم في الواجهة
ipcMain.handle('web:html', async (_e, url) => {
  if (!/^https:\/\//i.test(url)) throw new Error('رابط غير صالح');
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ar,en;q=0.8' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
});

// ===== المصدر المدبلج (Stardima) — منقول من ani-cli-arabic (providers/stardima*.py) =====
const SD_FB = { app: '1:823307516616:android:d596b0be539ba5b59083fd', web: 'AIzaSyD7W_oU5CGLwrFhcFU_-p-pL1f8ayzatDE', project: 'jcartoon2026' };
const SD_INFO = ['https://www.stardima.com/api/app/info', 'https://f5f-efgeg59852-zfz2d-mmltizwwcvb5567r2r63e-zd46.stardima.app/api/app/info'];
const SD_DEFAULT = 'https://f5f-efgeg59852-zfz2d-mmltizwwcvb5567r2r63e-zd46.stardima.app';
const SD_UA = 'jcartoonApp/1.0.8 (Android)';
const SD = { key: '', base: '', at: 0, p: null, cat: null, list: null };
function sdCatalog() {
  if (!SD.cat) { try { SD.cat = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'assets', 'stardima_anime.json'), 'utf8')).items || {}; } catch { SD.cat = {}; } }
  return SD.cat;
}
async function sdAuth(force) {
  if (!force && SD.key && SD.base && Date.now() - SD.at < 24 * 3600e3) return true;
  if (SD.p) return SD.p;
  SD.p = (async () => {
    try {
      const r = await fetch(`https://firebaseremoteconfig.googleapis.com/v1/projects/${SD_FB.project}/namespaces/firebase:fetch?key=${SD_FB.web}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_instance_id: require('crypto').randomUUID(), app_id: SD_FB.app, language_code: 'ar' }), signal: AbortSignal.timeout(12000)
      });
      if (!r.ok) return !!(SD.key && SD.base);
      const j = await r.json(); const key = j.entries && (j.entries.API_KEY || j.entries.api_key);
      if (!key) return !!(SD.key && SD.base);
      let base = '';
      for (const u of SD_INFO) {
        try {
          const ir = await fetch(u, { headers: { 'X-API-KEY': key, Accept: 'application/json', 'User-Agent': SD_UA }, signal: AbortSignal.timeout(12000) });
          if (!ir.ok) continue;
          const d = await ir.json(); const s = (d && d.data && (d.data.server_url || d.data.api_url)) || (d && d.server_url);
          if (s) { base = String(s).replace(/\/+$/, ''); break; }
        } catch {}
      }
      SD.key = key; SD.base = base || SD.base || SD_DEFAULT; SD.at = Date.now();
      return true;
    } catch (e) { console.log('[stardima auth]', e.message); return !!(SD.key && SD.base); }
    finally { SD.p = null; }
  })();
  return SD.p;
}
async function sdGet(p, params) {
  if (!(await sdAuth())) return null;
  for (let a = 0; a < 3; a++) {
    const url = (SD.base || SD_DEFAULT) + p + (params ? '?' + new URLSearchParams(params) : '');
    let r;
    try { r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': SD_UA, 'X-Requested-With': 'XMLHttpRequest', 'X-API-KEY': SD.key }, signal: AbortSignal.timeout(20000) }); }
    catch { await new Promise((ok) => setTimeout(ok, 400 * (a + 1))); continue; }
    if (r.ok) { try { return await r.json(); } catch { return null; } }
    if (r.status === 401 && a === 0) { if (await sdAuth(true)) continue; return null; }
    if ([429, 500, 502, 503, 504].includes(r.status)) { await new Promise((ok) => setTimeout(ok, 600 * (a + 1))); continue; }
    return null;
  }
  return null;
}
const sdVideos = (d) => {
  const isO = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (Array.isArray(d)) return d.filter(isO);
  if (!isO(d)) return [];
  for (const k of ['videos', 'data', 'results', 'items']) {
    const v = d[k];
    if (Array.isArray(v)) return v.filter(isO);
    if (isO(v)) for (const n of ['videos', 'data', 'results', 'items']) if (Array.isArray(v[n])) return v[n].filter(isO);
  }
  return [];
};
const sdPoster = (u) => { u = String(u || ''); return !u ? '' : /^https?:/i.test(u) ? u : (SD.base || SD_DEFAULT) + (u.startsWith('/') ? '' : '/') + u; };
function sdItem(v, det) {
  det = det || {};
  const id = String(v.id || det.id || ''), c = sdCatalog()[id] || {};
  const cats = v.category || det.category || [];
  const rs = det.review_stats && det.review_stats.average;
  const score = rs || v.video_rating || (c.vote ? Number(c.vote).toFixed(1) : '');
  const isMovie = v.is_series === false || String(v.type || det.type || '').toLowerCase() === 'movie';
  return {
    id: 'sd:' + id, name: String(v.title || v.series_title || det.title || c.title || ''), nameEn: c.title || '',
    poster: sdPoster(v.poster_url || det.poster_url), logo: '', genres: cats.map((x) => x && x.name).filter(Boolean).join(','), score: score ? String(score) : '',
    synopsis: String(v.description || det.description || ''), type: isMovie ? 'MOVIE' : 'SERIES', status: String(v.status_text || det.status_text || ''), season: '',
    src: 'sd', dubbed: true, movie: isMovie
  };
}
const sdDub = (v) => String(v.video_quality || '').includes('مدبلج');
// قائمة الأنمي المدبلج: أحدث الحلقات أولاً ثم باقي الكتالوج (مفلتر على الأنمي فقط بالكتالوج المرفق)
ipcMain.handle('dub:list', async () => {
  if (SD.list && Date.now() - SD.list.t < 10 * 60e3) return SD.list.v;
  const cat = sdCatalog(), out = [], seen = new Set();
  const [feeds, pages] = await Promise.all([
    Promise.all([1, 2, 3].map((p) => sdGet('/api/episodes', { page: p, per_page: 100 }))),
    Promise.all(Array.from({ length: 8 }, (_, i) => sdGet('/api/search', { query: '', language: 'dub', page: i + 1, per_page: 50 })))
  ]);
  if (feeds.every((x) => x == null) && pages.every((x) => x == null)) throw new Error('تعذّر الاتصال بمصدر الدبلجة (Stardima)');
  for (const f of feeds) for (const v of sdVideos(f)) {
    const id = String(v.id || v.video_episode || '');
    if (!id || seen.has(id) || !cat[id] || !sdDub(v)) continue;
    seen.add(id); out.push(sdItem({ ...v, id }));
  }
  for (const f of pages) for (const v of sdVideos(f)) {
    const id = String(v.id || '');
    if (!id || seen.has(id) || !cat[id] || !sdDub(v)) continue;
    seen.add(id); out.push(sdItem(v));
  }
  SD.list = { t: Date.now(), v: out };
  return out;
});
ipcMain.handle('dub:search', async (_e, q) => {
  q = String(q || '').trim(); if (!q) return [];
  const cat = sdCatalog(), out = [], seen = new Set();
  const pages = await Promise.all([1, 2].map((p) => sdGet('/api/search', { query: q, language: 'dub', page: p, per_page: 50 })));
  for (const f of pages) for (const v of sdVideos(f)) {
    const id = String(v.id || '');
    if (!id || seen.has(id) || !cat[id] || !sdDub(v)) continue;
    seen.add(id); out.push(sdItem(v));
  }
  return out;
});
async function sdDetail(id) {
  const d = await sdGet('/api/video/' + encodeURIComponent(id));
  return d && typeof d === 'object' ? (d.data && typeof d.data === 'object' ? d.data : d) : null;
}
ipcMain.handle('dub:detail', async (_e, id) => { const d = await sdDetail(id); return d ? sdItem(d, d) : null; });
ipcMain.handle('dub:episodes', async (_e, id) => {
  const det = await sdDetail(id); if (!det) return { movie: false, eps: [] };
  if (String(det.type || '').toLowerCase() === 'movie') return { movie: true, eps: [{ num: '1', title: det.title || 'Movie', id: String(det.id || id) }] };
  const raw = [];
  for (const s of det.seasons || []) {
    if (!s || s.id == null) continue;
    const items = []; let total = null;
    for (let page = 1; page <= 20; page++) {
      const r = await sdGet('/api/episodes/' + s.id, { page, per_page: 100 });
      const v = sdVideos(r); if (!v.length) break;
      items.push(...v); if (r && r.total != null) total = Number(r.total);
      if ((total != null && items.length >= total) || v.length < 100) break;
    }
    raw.push(...items);
  }
  const f = (x) => { const n = parseFloat(x); return isNaN(n) ? 0 : n; };
  raw.sort((a, b) => f(a.season_number) - f(b.season_number) || f(a.episode_number) - f(b.episode_number) || String(a.id).localeCompare(String(b.id)));
  const seen = new Set(), prep = [];
  raw.forEach((it, i) => {
    if (it.id == null || seen.has(it.id)) return; seen.add(it.id);
    const title = String(it.title || '').trim();
    const mt = title.match(/(?:ح|الحلقة|الحلقه|E|EP|Episode)\s*(\d+(?:\.\d+)?)/i);
    let n = mt ? parseFloat(mt[1]) : (it.episode_number != null && !isNaN(parseFloat(it.episode_number)) ? parseFloat(it.episode_number) : i + 1);
    prep.push([it, n, title]);
  });
  const useRaw = new Set(prep.map((x) => x[1])).size === prep.length;
  return { movie: false, eps: prep.map(([it, n, title], i) => ({ num: String(useRaw ? n : i + 1), title, id: String(it.id) })) };
});
// آخر حلقات مدبلجة حقيقية من Stardima (نفس مصدر الحلقات، مش AniList)
ipcMain.handle('dub:latest', async () => {
  const cat = sdCatalog(), out = [], seen = new Set();
  const feeds = await Promise.all([1, 2].map((p) => sdGet('/api/episodes', { page: p, per_page: 60 })));
  for (const f of feeds) for (const v of sdVideos(f)) {
    const id = String(v.id || v.video_episode || '');
    if (!id || !cat[id] || !sdDub(v)) continue;
    const n = parseFloat(v.episode_number), key = id + ':' + (v.episode_number || v.title);
    if (seen.has(key)) continue; seen.add(key);
    out.push({ ...sdItem({ ...v, id }), ep: isNaN(n) ? '' : String(n) });
  }
  return out;
});
async function sdAlive(url) {
  for (const [method, headers] of [['HEAD', {}], ['GET', { Range: 'bytes=0-0' }]]) {
    try {
      const r = await fetch(url, { method, headers: { 'User-Agent': UA, ...headers }, redirect: 'follow', signal: AbortSignal.timeout(6000) });
      try { r.body && r.body.cancel(); } catch {}
      if (r.status === 200 || r.status === 206) return true;
    } catch {}
  }
  return false;
}
// ===== مستخرجات السيرفرات (Uqload, Mixdrop, Lulustream, StreamHG, Mp4upload, Forafile, Firestream, Vidtube, SaveFiles) — منقولة من ani-cli-arabic =====
const B_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';
const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toBase = (n, b) => { if (!n) return '0'; let o = ''; while (n) { o = B62[n % b] + o; n = Math.floor(n / b); } return o; };
function packerCall(src) {
  const st = src.indexOf('eval(function(p,a,c,k,e,d)'); if (st < 0) return null;
  const a0 = src.indexOf('}(', st); if (a0 < 0) return null;
  let i = a0 + 2, depth = 1, q = null, esc = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (q) { if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"') { q = ch; continue; }
    if (ch === '(') depth++; else if (ch === ')') { depth--; if (!depth) return src.slice(a0 + 2, i); }
  }
  return null;
}
function splitArgs(raw) {
  const parts = []; let cur = '', q = null, esc = false, depth = 0;
  for (const ch of raw) {
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\') { cur += ch; esc = true; continue; }
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur.trim()); return parts;
}
function unpackHtml(src) {
  try {
    const raw = packerCall(src); if (!raw) return src;
    const p = splitArgs(raw); if (p.length < 4) return src;
    const unq = (v) => { v = v.trim(); return v.length >= 2 && '\'"'.includes(v[0]) && v[v.length - 1] === v[0] ? v.slice(1, -1) : v; };
    let payload = unq(p[0]); const base = parseInt(p[1], 10), count = parseInt(p[2], 10);
    let w = p[3].trim(); if (w.includes('.split(')) w = w.split('.split(')[0];
    const words = unq(w).split('|');
    for (let i = count - 1; i >= 0; i--) if (i < words.length && words[i]) payload = payload.replace(new RegExp('\\b' + toBase(i, base).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), () => words[i]);
    return payload.replace(/\\(['"\/])/g, '$1');
  } catch { return src; }
}
async function hGet(url, headers, opt = {}) {
  try {
    const r = await fetch(url, { method: opt.method || 'GET', body: opt.body, headers: { 'User-Agent': B_UA, ...headers }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return { text: await r.text(), cookies: (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map((c) => c.split(';')[0]).filter(Boolean) };
  } catch { return null; }
}
const reMedia = /https?:\/\/[^\s"'<>\\]+\.(?:m3u8|mp4)[^\s"'<>\\]*/;
const reSrc = /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/;
const hostOfU = (u) => { try { return new URL(u).host; } catch { return ''; } };
const firstMedia = (t) => { const a = reSrc.exec(t); if (a) return a[1]; const b = reMedia.exec(t); return b ? b[0] : null; };
const hosts = {
  async uqload(url) {
    const mm = /(?:e\/|embed-|embed\/|embed\.php\?id=)?([a-zA-Z0-9]{12})/.exec(url); if (!mm) return null;
    const host = hostOfU(url) || 'uqload.vc', headers = { Referer: `https://${host}/`, Origin: `https://${host}` };
    const r = await hGet(`https://${host}/${mm[1]}.html`, headers); if (!r) return null;
    const d = /sources:\s*\[\s*"([^"]+)"/.exec(r.text); if (d) return { url: d[1], headers };
    const u = unpackHtml(r.text); let s = reMedia.exec(u); s = s ? s[0] : (/file\s*:\s*["'](https?:\/\/[^"']+)["']/.exec(u) || [])[1];
    return s ? { url: s.replace(/' ?\+ ?'/g, ''), headers } : null;
  },
  async savefiles(url) {
    const mm = /\/(?:e|v|d)\/([a-zA-Z0-9_-]+)/.exec(url); if (!mm) return null;
    const host = hostOfU(url) || 'savefiles.com';
    const r = await hGet(`https://${host}/dl`, { Referer: url, Origin: `https://${host}`, 'Content-Type': 'application/x-www-form-urlencoded' }, { method: 'POST', body: new URLSearchParams({ op: 'embed', file_code: mm[1], auto: '1', referer: url }) });
    if (!r) return null; const s = firstMedia(r.text);
    return s ? { url: s, headers: { Referer: `https://${host}/`, Origin: `https://${host}` } } : null;
  },
  async mixdrop(url) {
    let origin = 'https://mixdrop.top'; try { origin = new URL(url).origin; } catch {}
    const r = await hGet(url, { Referer: origin + '/' }); if (!r) return null;
    let mt = /MDCore\.wurl\s*=\s*"([^"]+)"/.exec(r.text); if (!mt) mt = /MDCore\.wurl\s*=\s*"([^"]+)"/.exec(unpackHtml(r.text)); if (!mt) return null;
    let s = mt[1].replace(/&amp;/g, '&').replace(/\\\//g, '/');
    if (s.startsWith('//')) s = 'https:' + s; else if (s.startsWith('/')) s = origin + s;
    const headers = { Referer: origin + '/' }; if (r.cookies.length) headers.Cookie = r.cookies.join('; ');
    return { url: s, headers };
  },
  async lulustream(url) {
    const mm = /(?:e\/|embed-|embed\/)?([a-zA-Z0-9]{12})/.exec(url), host = hostOfU(url) || 'luluvdo.com';
    const target = mm ? `https://${host}/e/${mm[1]}` : url;
    const r = await hGet(target, { Referer: target }); if (!r) return null; const s = firstMedia(unpackHtml(r.text));
    return s ? { url: s, headers: { Referer: target } } : null;
  },
  async streamhg(url) {
    url = url.replace(/https?:\/\/(www\.)?(davioad|auvexiug|guxhag)\.com/, 'https://haxloppd.com');
    const r = await hGet(url, { Referer: url }); if (!r) return null; const t = unpackHtml(r.text);
    const a = /(?:file|source|src)\s*:\s*["'](https?:\/\/[^"']*?(?:master\.txt|master\.m3u8|\.m3u8)[^"']*?)["']/i.exec(t);
    const s = a ? a[1] : (reMedia.exec(t) || [])[0];
    return s ? { url: s, headers: { Referer: url }, hls: true } : null;
  },
  async mp4upload(url) {
    const r = await hGet(url, { Referer: url }); if (!r) return null; const t = unpackHtml(r.text);
    const a = /src:\s*"(https?:\/\/[^"']+\.mp4)"/.exec(t) || /player\.src\(\s*["'](https?:\/\/[^"']+\.mp4)["']\s*\)/.exec(t);
    return a ? { url: a[1], headers: { Referer: url } } : null;
  },
  async forafile(url) {
    const r = await hGet(url, { Referer: url }); if (!r) return null;
    const a = /file\s*:\s*["'](https?:\/\/[^"']+)["']/.exec(unpackHtml(r.text));
    return a ? { url: a[1], headers: { Referer: url } } : null;
  },
  async firestream(url) {
    const r = await hGet(url, { Referer: url }); if (!r) return null;
    const a = /<script\s+id=["']video-data["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/.exec(r.text); if (!a) return null;
    try { const f = JSON.parse(a[1]).file; return f && /^https?:/.test(f) ? { url: f, headers: { Referer: url } } : null; } catch { return null; }
  },
  async vidtube(url) {
    const r = await hGet(url, { Referer: url }); if (!r) return null; const s = firstMedia(unpackHtml(r.text));
    return s ? { url: s, headers: { Referer: url } } : null;
  },
  async generic(url) {
    if (/\.(mp4|m3u8|mkv)/i.test(url)) return { url, headers: {} };
    const r = await hGet(url, { Referer: url }); if (!r) return null; const a = reMedia.exec(unpackHtml(r.text));
    return a ? { url: a[0], headers: { Referer: url } } : null;
  }
};
function pickHost(label, url) {
  const t = (label + ' ' + url).toLowerCase();
  const has = (...k) => k.some((x) => t.includes(x));
  if (has('uqload')) return 'uqload'; if (has('savefiles')) return 'savefiles'; if (has('mixdrop')) return 'mixdrop';
  if (has('lulustream', 'luluvdo')) return 'lulustream'; if (has('streamhg', 'hgcloud')) return 'streamhg'; if (has('mp4upload')) return 'mp4upload';
  if (has('forafile')) return 'forafile'; if (has('firestream')) return 'firestream'; if (has('vidtube', 'watchtube')) return 'vidtube';
  return 'generic';
}

// ===== بروكسي محلي: كيزيد الـ Referer/Cookie ويعاود يكتب روابط HLS، باش المشغّل يشغل السيرفرات المحمية =====
let prox = null; const proxTab = new Map(), proxKey = new Map(); let proxN = 0;
function proxReg(url, headers) {
  const k = url + '|' + JSON.stringify(headers || {});
  if (proxKey.has(k)) return proxKey.get(k);
  const id = String(++proxN); proxTab.set(id, { url, headers: headers || {} }); proxKey.set(k, id);
  if (proxTab.size > 4000) { const f = proxTab.keys().next().value; proxTab.delete(f); }
  return id;
}
function proxStart() {
  if (prox) return prox;
  prox = new Promise((resolve, reject) => {
    const srv = http.createServer(async (req, res) => {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Expose-Headers': 'Content-Range,Content-Length,Accept-Ranges' };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      const mt = /^\/p\/(\d+)\//.exec(req.url || ''); const ent = mt && proxTab.get(mt[1]);
      if (!ent) { res.writeHead(404, cors); return res.end(); }
      const ac = new AbortController(); res.on('close', () => ac.abort());
      try {
        const h = { 'User-Agent': B_UA, ...ent.headers }; if (req.headers.range) h.Range = req.headers.range;
        const r = await fetch(ent.url, { headers: h, redirect: 'follow', signal: ac.signal });
        const ct = r.headers.get('content-type') || '';
        if (/\.m3u8|master\.txt/i.test(ent.url) || /mpegurl/i.test(ct)) {
          const txt = await r.text();
          if (txt.trimStart().startsWith('#EXTM3U')) {
            const base = r.url || ent.url, port = srv.address().port;
            const wrap = (u) => { let a; try { a = new URL(u, base).href; } catch { return u; } const hls = /\.m3u8|master\.txt|playlist/i.test(a); return `http://127.0.0.1:${port}/p/${proxReg(a, ent.headers)}/${hls ? 'index.m3u8' : 'seg.ts'}`; };
            const out = txt.split(/\r?\n/).map((l) => !l.trim() ? l : l.startsWith('#') ? l.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${wrap(u)}"`) : wrap(l.trim())).join('\n');
            res.writeHead(200, { ...cors, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' }); return res.end(out);
          }
          res.writeHead(r.status, { ...cors, 'Content-Type': ct || 'text/plain' }); return res.end(txt);
        }
        const hd = { ...cors, 'Content-Type': ct || 'video/mp4', 'Accept-Ranges': r.headers.get('accept-ranges') || 'bytes' };
        if (!r.headers.get('content-encoding') && r.headers.get('content-length')) hd['Content-Length'] = r.headers.get('content-length');
        if (r.headers.get('content-range')) hd['Content-Range'] = r.headers.get('content-range');
        res.writeHead(r.status, hd);
        if (!r.body) return res.end();
        require('stream').Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
      } catch { try { res.writeHead(502, cors); res.end(); } catch {} }
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
  return prox;
}
// يحوّل رابط سيرفر (Uqload/Mixdrop…) لرابط محلي يشتغل فـ المشغّل. كيرجع null إلا فشل.
async function resolveHost(url, label = '') {
  const kind = pickHost(label, url);
  const r = await Promise.race([hosts[kind](url).catch(() => null), new Promise((ok) => setTimeout(() => ok(null), 14000))]);
  if (!r || !r.url) return null;
  const srv = await proxStart(), hls = r.hls || /\.m3u8|master\.txt/i.test(r.url);
  return { url: `http://127.0.0.1:${srv.address().port}/p/${proxReg(r.url, r.headers)}/${hls ? 'index.m3u8' : 'video.mp4'}`, res: (/(1080|720|480|360)/.exec(r.url) || [])[1] ? (/(1080|720|480|360)/.exec(r.url))[1] + 'p' : '', kind };
}
ipcMain.handle('host:resolve', (_e, url) => (/^https?:\/\//i.test(String(url || '')) ? resolveHost(String(url)) : null));

ipcMain.handle('dub:streams', async (_e, { id, ep, movie }) => {
  let servers;
  if (movie) { const d = await sdDetail(id); servers = d && d.servers; }
  else {
    const d = await sdGet('/api/episodes/' + encodeURIComponent(ep) + '/servers');
    servers = d && (Array.isArray(d) ? d : (d.servers || (Array.isArray(d.data) ? d.data : d.data && d.data.servers)));
  }
  servers = (Array.isArray(servers) ? servers : []).filter((s) => s && typeof s === 'object' && /^https?:/i.test(String(s.url || '').trim()));
  const res = (u) => { const x = /(1080|720|480|360)/.exec(u); return x ? x[1] + 'p' : ''; };
  const out = await Promise.all(servers.map(async (s) => {
    const url = String(s.url).trim(), label = String(s.label || 'Server');
    if (/backup/i.test(label)) return (await sdAlive(url)) ? { label, url, res: res(url), direct: true } : null;
    const rr = await resolveHost(url, label).catch(() => null);
    return rr ? { label, url: rr.url, res: rr.res || res(url), direct: true } : { label, url, res: res(url), direct: false };
  }));
  const ok = out.filter(Boolean);
  return [...ok.filter((x) => x.direct), ...ok.filter((x) => !x.direct)];
});

// ===== أنمي تزيدوه أنت: ملف custom.json (في مجلد بيانات التطبيق) =====
const fs = require('fs');
const customFile = () => path.join(app.getPath('userData'), 'custom.json');
function ensureCustom() {
  const f = customFile();
  try {
    if (!fs.existsSync(f)) fs.writeFileSync(f, '[]');
    const ex = path.join(path.dirname(f), 'custom.example.json');
    if (!fs.existsSync(ex)) fs.writeFileSync(ex, JSON.stringify([{
      name: 'اسم الأنمي بالعربية', nameEn: 'English name', poster: 'https://example.com/poster.jpg', logo: 'https://example.com/logo.png',
      genres: 'Action,Drama', synopsis: 'وصف قصير', type: 'TV', score: '8.5', dubbed: true,
      episodes: [
        { num: '1', url: 'https://example.com/ep1.mp4' },
        { num: '2', urls: [{ name: 'سيرفر 1', url: 'https://example.com/ep2.mp4' }, { name: 'ميديافاير', url: 'https://www.mediafire.com/file/xxxx' }] }
      ]
    }], null, 2));
  } catch {}
  return f;
}
ipcMain.handle('custom:list', () => {
  try {
    const j = JSON.parse(fs.readFileSync(ensureCustom(), 'utf8'));
    return Array.isArray(j) ? j : (j.anime || []);
  } catch (e) { throw new Error('custom.json فيه خطأ: ' + e.message); }
});
ipcMain.handle('custom:open', () => shell.openPath(ensureCustom()));

// إشعارات النظام (حلقة جديدة)
if (process.platform === 'win32') app.setAppUserModelId('com.wayanime.app');
// تحميل صورة الأنمي (poster) للإشعار وتخزينها مؤقتاً
async function notifyImage(url) {
  try {
    if (!/^https?:\/\//i.test(String(url || ''))) return null;
    const dir = path.join(app.getPath('temp'), 'wayanime-notify');
    fsx.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, require('crypto').createHash('md5').update(url).digest('hex') + '.jpg');
    if (!fsx.existsSync(f)) {
      const res = await require('electron').net.fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      fsx.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
    }
    const img = nativeImage.createFromPath(f);
    return img.isEmpty() ? null : { file: f, img };
  } catch { return null; }
}
const xmlEsc = (s) => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
ipcMain.handle('notify:show', async (_e, { title, body, id, image }) => {
  if (!Notification.isSupported()) return false;
  title = String(title || 'WayAnime').slice(0, 120); body = String(body || '').slice(0, 250);
  const appIcon = path.join(__dirname, 'assets', 'icon.png');
  const pic = await notifyImage(image);
  const open = () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); if (id) w.webContents.send('notify:open', id); }
  };
  const plain = () => {
    const n = new Notification({ title, body, icon: pic ? pic.img : appIcon });
    n.on('click', open); n.show();
  };
  if (pic && process.platform === 'win32') {
    // ويندوز: صورة الأنمي كبيرة فوق الإشعار + لوغو التطبيق صغير
    const toastXml = '<toast><visual><binding template="ToastGeneric">' +
      '<image placement="hero" src="' + xmlEsc(pic.file) + '"/>' +
      '<image placement="appLogoOverride" hint-crop="circle" src="' + xmlEsc(appIcon) + '"/>' +
      '<text>' + xmlEsc(title) + '</text><text>' + xmlEsc(body) + '</text>' +
      '</binding></visual></toast>';
    try {
      const n = new Notification({ toastXml });
      n.on('click', open);
      n.on('failed', () => plain());
      n.show();
      return true;
    } catch {}
  }
  plain();
  return true;
});
ipcMain.handle('bg:set', (_e, o) => {
  bg.keep = o.keep !== false; bg.autostart = !!o.autostart;
  if (bg.keep) makeTray(); else if (tray) { tray.destroy(); tray = null; }
  try { app.setLoginItemSettings({ openAtLogin: bg.keep && bg.autostart, args: ['--hidden'] }); } catch {}
  return true;
});
// صفحة محمية بـ Cloudflare (مثل Anime3rb): نفتحوها فـ نافذة مخفية ونرجعو الـ HTML بعد ما يتحل التحدي
ipcMain.handle('web:browserHtml', async (_e, url) => {
  if (!/^https:\/\//i.test(url)) throw new Error('رابط غير صالح');
  const w = new BrowserWindow({ show: false, width: 1100, height: 800, webPreferences: { partition: 'persist:cf', backgroundThrottling: false, sandbox: true } });
  try {
    w.webContents.setUserAgent(UA);
    w.loadURL(url).catch(() => {});
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      await new Promise((r) => setTimeout(r, 1200));
      if (w.isDestroyed()) break;
      const ok = await w.webContents.executeJavaScript(
        "!!document.querySelector('script[type=\"application/ld+json\"]') && !/just a moment|attention required/i.test(document.title)").catch(() => false);
      if (ok) return await w.webContents.executeJavaScript('document.documentElement.outerHTML');
    }
    throw new Error('Cloudflare');
  } finally { try { if (!w.isDestroyed()) w.destroy(); } catch {} }
});
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', showMain);
  app.on('before-quit', () => { quitting = true; });
  app.whenReady().then(() => { makeTray(); createWindow(); });
}
app.on('window-all-closed', () => { stopTorrent(); stopTranscode(); app.quit(); });
app.on('will-quit', () => { stopTorrent(); stopTranscode(); });
