/* تشخيص المصادر (Android): كيجرّب Animeify و WitAnime وكيعرض النتيجة الحقيقية (HTTP / Cloudflare / عدد الأنمي) باش نعرفو علاش ما كيطلعوش. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const head = (t) => String(t || '').replace(/\s+/g, ' ').slice(0, 140);
  async function probe(name, fn) {
    const t0 = Date.now();
    try {
      const r = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('تجاوز 25 ثانية (timeout)')), 25000))]);
      return { name, ok: r.ok !== false, msg: r.msg, ms: Date.now() - t0 };
    } catch (e) { return { name, ok: false, msg: 'خطأ: ' + String((e && e.message) || e), ms: Date.now() - t0 }; }
  }
  async function collect() {
    const F = window.__waFetch || window.fetch.bind(window), H = window.__wayHandlers || {};
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const out = [{ name: 'المنصة', ok: native, ms: 0, msg: native ? 'Android (HTTP أصلي)' : 'ماشي Android — فـ المتصفح CORS كيمنع' }];
    out.push(await probe('Animeify · بيانات الدخول', async () => {
      const r = await F('https://api.ani-cli-arabic.dev/credentials', { headers: { 'X-Auth-Key': '6rK9z0XyW8vQ3J7pL2mN4sB1tH5gD0fA', 'User-Agent': 'AniCliAr/2.0' } });
      const t = await r.text(); return { ok: r.ok, msg: 'HTTP ' + r.status + ' · ' + head(t) };
    }));
    out.push(await probe('Animeify · آخر الأنمي (مباشر)', async () => {
      const r = await F('https://animeify.net/animeify/apis_v4/anime/load_latest_anime.php', { method: 'POST', body: new URLSearchParams({ UserId: '0', Language: 'English', From: '0', Token: '8cnY80AZSbUCmR26Vku1VUUY4' }), headers: { 'User-Agent': UA } });
      const t = await r.text(); let n = '', good = false;
      try { const j = JSON.parse(t); if (Array.isArray(j)) { n = ' · ' + j.length + ' أنمي'; good = j.length > 0; } else n = ' · الرد ماشي لائحة'; } catch { n = ' · الرد ماشي JSON'; }
      return { ok: r.ok && good, msg: 'HTTP ' + r.status + n + ' · ' + head(t) };
    }));
    out.push(await probe('Animeify · عبر التطبيق', async () => {
      if (!H['ar:list']) return { ok: false, msg: 'الـ handler ناقص' };
      const l = await H['ar:list']({}, { latest: true, limit: 10 });
      return { ok: l.length > 0, msg: l.length + ' أنمي' + (l[0] ? ' · ' + l[0].name : '') };
    }));
    out.push(await probe('WitAnime · صفحة الحلقات (مباشر)', async () => {
      const r = await F('https://witanime.art/episode', { headers: { 'User-Agent': UA, 'Accept-Language': 'ar,en;q=0.8' } });
      const t = await r.text(), cards = (t.match(/anime-card-container/g) || []).length, cf = /just a moment|cf-chl|challenge-platform|attention required/i.test(t);
      return { ok: r.ok && cards > 0, msg: 'HTTP ' + r.status + ' · ' + cards + ' بطاقة' + (cf ? ' · ⚠ حماية Cloudflare' : '') + ' · ' + head(t) };
    }));
    out.push(await probe('WitAnime · عبر التطبيق', async () => {
      if (!H['web:html']) return { ok: false, msg: 'الـ handler ناقص' };
      const t = await H['web:html']({}, 'https://witanime.art/episode');
      const cards = (String(t).match(/anime-card-container/g) || []).length;
      return { ok: cards > 0, msg: cards + ' بطاقة · ' + String(t).length + ' حرف' };
    }));
    return out;
  }
  async function run() {
    let ov = document.getElementById('waDiag'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'waDiag';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9500;background:#000d;display:flex;align-items:center;justify-content:center;padding:14px;direction:rtl';
    ov.innerHTML = '<div style="width:min(520px,100%);max-height:88vh;overflow:auto;background:#181818;border:1px solid #ffffff22;border-radius:14px;padding:16px;color:#eee;font:14px/1.6 sans-serif"><b style="font-size:16px">تشخيص المصادر</b><div id="waDiagBody" style="margin-top:10px;color:#aaa">جارٍ الفحص… (حتى 25 ثانية لكل مصدر)</div><div style="display:flex;gap:8px;margin-top:12px"><button id="waDiagCp" style="flex:1;padding:10px;border-radius:8px;border:0;background:#333;color:#fff">نسخ النتيجة</button><button id="waDiagX" style="flex:1;padding:10px;border-radius:8px;border:0;background:#e50914;color:#fff">إغلاق</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#waDiagX').onclick = () => ov.remove();
    const res = await collect();
    const txt = res.map((r) => (r.ok ? '✅ ' : '❌ ') + r.name + ' (' + r.ms + 'ms)\n   ' + r.msg).join('\n');
    ov.querySelector('#waDiagBody').innerHTML = res.map((r) => '<div style="margin:0 0 10px;padding:8px 10px;border-radius:8px;background:' + (r.ok ? '#12331f' : '#3a1418') + '"><b>' + (r.ok ? '✅ ' : '❌ ') + esc(r.name) + '</b> <small style="color:#999">' + r.ms + 'ms</small><div dir="auto" style="font-size:12.5px;color:#ccc;word-break:break-word;margin-top:2px">' + esc(r.msg) + '</div></div>').join('');
    ov.querySelector('#waDiagCp').onclick = () => { try { navigator.clipboard.writeText(txt); ov.querySelector('#waDiagCp').textContent = 'تنسخات ✓'; } catch { ov.querySelector('#waDiagCp').textContent = 'ما قدرتش'; } };
  }
  window.__waDiag = run;
})();
