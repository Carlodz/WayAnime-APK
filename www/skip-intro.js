/* تخطي المقدمة (الأوبنينغ) — Android
   كيفاش كنكتشفو المقدمة؟ (الصوت ما يمكنش تحلّلو فـ WebView لأن روابط الفيديو من مواقع أخرى بلا CORS)
   1) توقيتات المجتمع (AniSkip) حسب MyAnimeList id + رقم الحلقة — id كنجيبوه من Jikan بالعنوان.
   2) إلا ما لقيناهاش: كنستعملو توقيت حلقة أخرى من نفس الأنمي (تقدير) — المقدمة غالباً بنفس الوقت.
   3) إلا ما كاين والو: زر «تقديم 85 ثانية» (كيبان مع الأزرار فقط). */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const sget = (k, d) => { try { const v = JSON.parse(localStorage.getItem('way:' + k)); return v == null ? d : v; } catch { return d; } };
  const sset = (k, v) => { try { localStorage.setItem('way:' + k, JSON.stringify(v)); } catch {} };
  const norm = (s) => (typeof alNorm === 'function' ? alNorm(s) : String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ''));
  const same = (a, b) => (typeof alSame === 'function' ? alSame(a, b) : a === b);
  const ICON = '<svg class="i" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20" fill="currentColor"/><line x1="19" y1="5" x2="19" y2="19"/></svg>';
  const FB = 85;
  const msg = (e) => String((e && e.message) || e);
  const trim = (o, n) => { const k = Object.keys(o); if (k.length > n) k.slice(0, k.length - n).forEach((x) => delete o[x]); };

  /* ---- MAL id من Jikan (مخزّن) ---- */
  async function malId(np, names) {
    const c = sget('malid', {}), h = c[np.id];
    if (h && Date.now() - h.t < (h.v ? 30 : 1) * 864e5) return h.v;
    const want = names.map(norm).filter(Boolean);
    let id = 0, ok = false;
    for (const q of names.slice(0, 2)) {
      let r = null;
      for (let k = 0; k < 2 && !r; k++) {
        try { r = await window.api.get('https://api.jikan.moe/v4/anime?limit=6&sfw=true&q=' + encodeURIComponent(q)); }
        catch (e) { if (k === 0 && /429/.test(msg(e))) await new Promise((z) => setTimeout(z, 1500)); else break; }
      }
      if (!r) continue; ok = true;
      const a = (r.data || []).find((x) => [x.title, x.title_english, x.title_japanese, ...(x.title_synonyms || [])].map(norm).some((t) => want.some((w) => same(t, w))));
      if (a) { id = a.mal_id; break; }
    }
    if (ok) { c[np.id] = { t: Date.now(), v: id }; trim(c, 150); sset('malid', c); }
    return id;
  }

  /* ---- توقيت المقدمة من AniSkip (null = ما كاينش، undefined = خطأ شبكة) ---- */
  async function aniskip(id, ep) {
    try {
      const r = await window.api.get('https://api.aniskip.com/v2/skip-times/' + id + '/' + ep + '?types=op&types=mixed-op&episodeLength=0');
      const l = ((r && r.results) || []).filter((x) => /^(op|mixed-op)$/.test(x.skipType) && x.interval).sort((a, b) => (a.skipType === 'op' ? 0 : 1) - (b.skipType === 'op' ? 0 : 1));
      const o = l[0];
      return o ? { s: o.interval.startTime, e: o.interval.endTime, len: o.episodeLength || 0 } : null;
    } catch (e) { return /404/.test(msg(e)) ? null : undefined; }
  }

  async function resolve(np, names) {
    const ep = Math.floor(parseFloat(np.ep));
    if (!isFinite(ep) || ep < 1) return { kind: 'none' };
    const last = sget('skiplast', {})[np.id];
    let id = 0; try { id = await malId(np, names); } catch {}
    if (id) {
      const cache = sget('skipc', {}), key = id + ':' + ep, hit = cache[key];
      let v;
      if (hit && Date.now() - hit.t < (hit.v ? 30 : 1) * 864e5) v = hit.v;
      else { v = await aniskip(id, ep); if (v !== undefined) { cache[key] = { t: Date.now(), v }; trim(cache, 300); sset('skipc', cache); } }
      if (v) { const l = sget('skiplast', {}); l[np.id] = { s: v.s, e: v.e }; trim(l, 150); sset('skiplast', l); return { kind: 'found', seg: v }; }
    }
    if (last) return { kind: 'guess', seg: { s: last.s, e: last.e } };
    return { kind: 'fb' };
  }

  function namesOf(np) {
    const m = (typeof arCache !== 'undefined' && arCache.get(np.id)) || {};
    let h = {}; try { h = (sget('hist', []).find((x) => x.id === np.id)) || {}; } catch {}
    return [m.nameEn, m.name || h.name].filter(Boolean);
  }

  function setup(pl) {
    if (pl._skip) return; pl._skip = true;
    const np = window.__np; if (!np) return;
    const v = $('video', pl), box = $('.pbox', pl); if (!v || !box) return;
    const btn = document.createElement('button');
    btn.id = 'pskip'; btn.type = 'button'; btn.hidden = true;
    box.appendChild(btn);

    let res = null, auto = sget('autoskip', false), done = false;
    const off = () => pl._off || 0;
    const T = () => (v.currentTime || 0) + off();
    const jump = (to) => { const d = v.duration; let t = to - off(); if (isFinite(d)) t = Math.min(t, d - 0.5); v.currentTime = Math.max(0, t); };

    function update() {
      if (!res || res.kind === 'none') { btn.hidden = true; return; }
      let seg = res.seg, kind = res.kind;
      if (seg && seg.len && isFinite(v.duration) && !seg.chk) {   // طول الحلقة مختلف بزاف (نسخة مقطوعة) → التوقيت ماشي صحيح
        seg.chk = true;
        if (Math.abs(v.duration - seg.len) > 60) { res = { kind: 'fb' }; seg = null; kind = 'fb'; }
      }
      const t = T();
      let label = '', show = false;
      if (kind === 'fb') { show = t >= 20 && t < 300; label = 'تقديم ' + FB + ' ثانية'; }
      else if (seg) { show = t >= seg.s - 1 && t < seg.e - 1; label = kind === 'guess' ? 'تخطي المقدمة (تقدير)' : 'تخطي المقدمة'; }
      if (show && auto && kind === 'found' && !done) { done = true; jump(seg.e); if (typeof toast === 'function') toast('تم تخطي المقدمة'); show = false; }
      btn.classList.toggle('fb', kind === 'fb');
      if (show) { if (btn.hidden || btn._l !== label) { btn.innerHTML = '<span>' + label + '</span>' + ICON; btn._l = label; } }
      btn.hidden = !show;
    }
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!res) return;
      jump(res.kind === 'fb' ? T() + FB : res.seg.e);
      btn.hidden = true;
    };
    v.addEventListener('timeupdate', update);
    v.addEventListener('loadedmetadata', update);

    // زر «تخطي تلقائي» فـ قائمة الإعدادات (الترس)
    const menu = $('.smenu', pl);
    if (menu) {
      const tg = document.createElement('button'); tg.dataset.g = 'skip';
      const paint = () => { tg.textContent = 'تخطي المقدمة تلقائياً: ' + (auto ? 'مفعّل' : 'متوقّف'); tg.classList.toggle('on', auto); };
      tg.onclick = () => { auto = !auto; sset('autoskip', auto); paint(); };
      paint(); menu.appendChild(tg);
    }

    resolve(np, namesOf(np)).then((r) => { if (pl.isConnected) { res = r; update(); } }).catch(() => { res = { kind: 'fb' }; });
  }

  new MutationObserver(() => { const pl = $('#pl'); if (pl && !pl._skip) setup(pl); }).observe(document.body, { childList: true });
})();
