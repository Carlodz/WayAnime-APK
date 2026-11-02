/* مشاهدة مشتركة (Watch Party) — Android
   - بلا سيرفر خاص: الغرفة كتخدم عبر MQTT فوق WebSocket (brokers عمومية مجانية)، والـ client مكتوب هنا بلا مكتبات.
   - الكود ديال الغرفة = رقم السيرفر (0-2) + 6 حروف عشوائية.
   - كلشي كيتزامن: تشغيل / إيقاف / تقديم / تأخير + نفس الفيديو (المضيف كيبعث رابط الفيديو). المضيف كيبعث نبضة كل 4 ثواني لتصحيح الفرق. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const say = (t) => { try { typeof toast === 'function' ? toast(t) : alert(t); } catch (e) {} };

  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ICON = '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.7.2 4.5 2.4 4.5 5.3"/></svg>';
  window.waWpIcon = ICON;

  /* ================= MQTT 3.1.1 صغير (QoS 0) ================= */
  function MQ(url, onMsg) {
    const enc = new TextEncoder(), dec = new TextDecoder();
    const str = (s) => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
    const rl = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
    let ws, buf = new Uint8Array(0), ping = null, to = null, pid = 1, fin = null;
    const me = { onclose: null };
    const send = (a) => { if (ws && ws.readyState === 1) ws.send(new Uint8Array(a)); };

    function parse() {
      for (;;) {
        if (buf.length < 2) return;
        let mult = 1, len = 0, i = 1, b;
        do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mult; mult *= 128; } while (b & 128);
        if (buf.length < i + len) return;
        const type = buf[0] >> 4, flags = buf[0] & 15, body = buf.slice(i, i + len);
        buf = buf.slice(i + len);
        if (type === 2) { fin && (body[1] === 0 ? fin() : fin(new Error('refused'))); }
        else if (type === 3) {
          const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl));
          let off = 2 + tl; if ((flags >> 1) & 3) off += 2;
          try { onMsg(topic, dec.decode(body.subarray(off))); } catch (e) {}
        }
      }
    }

    me.open = () => new Promise((res, rej) => {
      let done = false;
      fin = (e) => { if (done) return; done = true; clearTimeout(to); e ? rej(e) : res(); };
      try { ws = new WebSocket(url, 'mqtt'); } catch (e) { return fin(e); }
      ws.binaryType = 'arraybuffer';
      to = setTimeout(() => { fin(new Error('timeout')); try { ws.close(); } catch (e) {} }, 7000);
      ws.onopen = () => {
        const body = [0, 4, 77, 81, 84, 84, 4, 2, 0, 45, ...str('wa' + Math.random().toString(16).slice(2, 10))];
        send([0x10, ...rl(body.length), ...body]);
      };
      ws.onmessage = (e) => {
        const nb = new Uint8Array(e.data), m = new Uint8Array(buf.length + nb.length);
        m.set(buf); m.set(nb, buf.length); buf = m; parse();
      };
      ws.onerror = () => fin(new Error('ws'));
      ws.onclose = () => { clearInterval(ping); fin(new Error('closed')); me.onclose && me.onclose(); };
      clearInterval(ping); ping = setInterval(() => send([0xC0, 0]), 20000);
    });
    me.sub = (topic) => { const body = [pid >> 8, pid & 255, ...str(topic), 0]; pid = (pid % 60000) + 1; send([0x82, ...rl(body.length), ...body]); };
    me.pub = (topic, payload, retain) => { const body = [...str(topic), ...enc.encode(payload)]; send([0x30 | (retain ? 1 : 0), ...rl(body.length), ...body]); };
    me.close = () => { me.onclose = null; clearInterval(ping); try { send([0xE0, 0]); ws.close(); } catch (e) {} };
    return me;
  }

  /* ================= حالة الغرفة ================= */
  const P = {
    on: false, host: false, code: '', idx: 0, id: Math.random().toString(16).slice(2, 10),
    mq: null, peers: new Map(), sup: 0, applyingLoad: false, url: '', title: '', hls: false,
    pending: null, gotState: false, retry: 0, leaving: false, hbT: null, seekT: null, prT: null
  };
  const base = () => 'wayanime/wp/' + P.code;
  const pub = (m, retain) => { if (!P.mq) return; m.i = P.id; try { P.mq.pub(base() + (retain ? '/s' : '/e'), JSON.stringify(m), retain); } catch (e) {} };
  const vid = () => { const pl = $('#pl'); return pl && $('video', pl); };
  const members = () => { const now = Date.now(); let n = 1; P.peers.forEach((t) => { if (now - t < 16000) n++; }); return n; };
  const fmtCode = (c) => c.slice(0, 1) + '-' + c.slice(1);

  function seek(v, t) { if (isFinite(t) && Math.abs((v.currentTime || 0) - t) > 0.7) { try { v.currentTime = Math.max(0, t); } catch (e) {} } }
  function playV(v) { const r = v.play(); if (r && r.catch) r.catch(() => say('اضغط ▶ لبدء الفيديو (منع الهاتف التشغيل التلقائي)')); }

  /* ----- استقبال ----- */
  function onMessage(topic, txt) {
    if (!txt) return;
    let m; try { m = JSON.parse(txt); } catch (e) { return; }
    if (!m || m.i === P.id) return;
    if (m.a === 'pr' || m.a === 'hb' || m.a === 'hi') P.peers.set(m.i, Date.now());
    if (m.a === 'bye') { P.peers.delete(m.i); return; }
    if (topic.slice(-2) === '/s') {          // حالة محفوظة (retained): غير أول مرة، للي دخل متأخر
      if (P.gotState || P.host) return;
      P.gotState = true;
      if (m.url) onLoad(m);
      return;
    }
    if (m.a === 'hi') { if (P.host && vid()) pubState(); return; }
    if (m.a === 'load') return onLoad(m);
    const v = vid(); if (!v) return;
    if (m.a === 'play' || m.a === 'pause' || m.a === 'seek' || m.a === 'hb') {
      if (m.a === 'hb' && P.host) return;
      if (Date.now() < P.sup && m.a === 'hb') return;
      if (v.readyState < 1) { P.pending = { t: m.t, p: m.a === 'play' || (m.a === 'hb' && m.p) }; return; }
      P.sup = Date.now() + 900;
      if (m.a === 'play') { seek(v, m.t); playV(v); }
      else if (m.a === 'pause') { v.pause(); seek(v, m.t); }
      else if (m.a === 'seek') seek(v, m.t);
      else {   // hb
        if (Math.abs((v.currentTime || 0) - m.t) > 2.5) seek(v, m.t);
        if (m.p && v.paused) playV(v); else if (!m.p && !v.paused) v.pause();
      }
    }
  }

  function onLoad(m) {
    if (!m.url) return;
    if (m.url === P.url && vid()) { P.pending = { t: m.t || 0, p: !!m.p }; applyPending(); return; }
    P.pending = { t: m.t || 0, p: m.p !== false };
    P.applyingLoad = true;
    try { window.attach(m.url, { title: m.title || 'مشاهدة مشتركة', hls: !!m.hls }); } finally { P.applyingLoad = false; }
    say('الغرفة: بدأ الفيديو ✔');
  }

  function applyPending() {
    const v = vid(); if (!v || !P.pending) return;
    const go = () => {
      const pd = P.pending; if (!pd) return; P.pending = null;
      P.sup = Date.now() + 1500;
      seek(v, pd.t);
      pd.p ? playV(v) : v.pause();
    };
    v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once: true });
  }

  /* ----- إرسال ----- */
  function pubState() {
    const v = vid();
    pub({ a: 'load', url: P.url, title: P.title, hls: P.hls, t: v ? v.currentTime : 0, p: v ? !v.paused : false }, true);
  }
  const emit = (a) => {
    if (!P.on) return;
    const v = vid(); if (!v || Date.now() < P.sup || v.readyState < 1) return;
    pub({ a, t: v.currentTime, p: !v.paused });
  };

  function bindVideo(pl) {
    const v = $('video', pl); if (!v || v._wp) return; v._wp = true;
    P.sup = Date.now() + 3500;   // ما نبعثوش شي فـ أول ثواني التحميل (autoplay)
    v.addEventListener('play', () => emit('play'));
    v.addEventListener('pause', () => { if (!v.ended) emit('pause'); });
    v.addEventListener('seeked', () => { clearTimeout(P.seekT); P.seekT = setTimeout(() => emit('seek'), 250); });
    if (P.pending) applyPending();
    clearInterval(P.hbT);
    let n = 0;
    P.hbT = setInterval(() => {
      if (!P.on || !pl.isConnected) { clearInterval(P.hbT); return; }
      n++;
      if (P.host && v.readyState >= 1) { pub({ a: 'hb', t: v.currentTime, p: !v.paused }); if (n % 3 === 0) pubState(); }
    }, 4000);
  }

  /* ----- ربط المشغّل: نغلفو attach باش نعرفو الرابط ونزيدو الزر ----- */
  const origAttach = window.attach;
  if (typeof origAttach === 'function') {
    window.attach = function (url, s) {
      const r = origAttach.apply(this, arguments);
      try { onAttach(url, s || {}); } catch (e) {}
      return r;
    };
  }
  function onAttach(url, s) {
    const pl = $('#pl'); if (!pl) return;
    P.url = url; P.hls = !!s.hls;
    P.title = ((s.title || ($('.hero h2') || $('.sec h2') || {}).textContent || '') + ' ' + (s.title ? '' : (($('.eps button.on') || {}).textContent || ''))).trim();
    const top = $('.ptop', pl);
    if (top && !$('#pwp', pl)) {
      const b = document.createElement('button');
      b.id = 'pwp'; b.type = 'button'; b.title = 'مشاهدة مشتركة'; b.innerHTML = ICON;
      b.onclick = (e) => { e.stopPropagation(); openPanel(); };
      top.insertBefore(b, $('#pfs', pl) || top.lastElementChild);
    }
    const bt = $('#pwp', pl); if (bt) bt.classList.toggle('on', P.on);
    if (P.on) {
      bindVideo(pl);
      if (!P.applyingLoad) pubState();   // فتحنا فيديو جديد وحنا فـ غرفة: نعلمو الباقي
    }
  }

  /* ================= الاتصال ================= */
  async function connect(idx) {
    const mq = MQ(BROKERS[idx], onMessage);
    await mq.open();
    mq.sub(base() + '/e'); mq.sub(base() + '/s');
    mq.onclose = () => reconnect();
    P.mq = mq; P.idx = idx;
  }
  async function reconnect() {
    if (P.leaving || !P.on) return;
    if (++P.retry > 6) { say('انقطع الاتصال بالغرفة'); leave(true); return; }
    await new Promise((r) => setTimeout(r, 2500));
    if (P.leaving || !P.on) return;
    try { await connect(P.idx); P.retry = 0; pub({ a: 'hi' }); } catch (e) { reconnect(); }
  }
  function newCode(idx) {
    const a = new Uint8Array(6); crypto.getRandomValues(a);
    return String(idx) + [...a].map((x) => ALPHA[x % ALPHA.length]).join('');
  }
  function afterJoin() {
    P.on = true; P.leaving = false; P.retry = 0; P.peers.clear(); P.gotState = false;
    clearInterval(P.prT); P.prT = setInterval(() => { P.on ? pub({ a: 'pr' }) : clearInterval(P.prT); }, 6000);   // حضور: باش العدّاد ديال المتصلين يخدم
    const pl = $('#pl'); if (pl) { bindVideo(pl); const b = $('#pwp', pl); b && b.classList.add('on'); }
    refresh();
  }

  async function create() {
    setBusy('جارٍ إنشاء الغرفة…');
    for (let i = 0; i < BROKERS.length; i++) {
      P.code = newCode(i);
      try {
        await connect(i);
        P.host = true; afterJoin();
        if (P.url && vid()) pubState();
        pub({ a: 'hi' });
        return;
      } catch (e) { try { P.mq && P.mq.close(); } catch (x) {} P.mq = null; }
    }
    P.code = '';
    setBusy(''); say('تعذّر الاتصال بسيرفر الغرفة. تأكد من الإنترنت وحاول مجددًا.');
  }
  async function join(raw) {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[0-9][A-Z0-9]{6}$/.test(code) || +code[0] >= BROKERS.length) { say('الكود غير صحيح (7 أحرف/أرقام)'); return; }
    setBusy('جارٍ الدخول للغرفة…');
    P.code = code;
    try {
      await connect(+code[0]);
      P.host = false; afterJoin();
      pub({ a: 'hi' });
      say('دخلت الغرفة ✔ — في انتظار الفيديو من المضيف');
    } catch (e) { P.code = ''; P.mq = null; setBusy(''); say('تعذّر الاتصال بالغرفة. تأكد من الكود والإنترنت.'); }
  }
  function leave(silent) {
    P.leaving = true;
    clearInterval(P.hbT); clearInterval(P.prT); clearTimeout(P.seekT);
    try { if (P.mq) { pub({ a: 'bye' }); if (P.host) P.mq.pub(base() + '/s', '', true); setTimeout(() => P.mq && P.mq.close(), 150); } } catch (e) {}
    P.on = false; P.host = false; P.code = ''; P.peers.clear(); P.pending = null;
    const b = $('#pwp'); b && b.classList.remove('on');
    refresh();
    silent || say('غادرت الغرفة');
    setTimeout(() => { P.mq = null; }, 400);
  }

  /* ================= الواجهة ================= */
  const css = document.createElement('style');
  css.textContent =
    '#pwp{position:relative}#pwp svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#pwp.on{color:#4ade80}#pwp.on::after{content:"";position:absolute;top:1px;inset-inline-end:1px;width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80}' +
    '#wpOv{position:fixed;inset:0;z-index:10000;background:#000a;display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '#wpBox{width:min(380px,100%);max-height:90vh;overflow:auto;background:#17132d;border:1px solid #7b4dff66;border-radius:20px;padding:20px 18px;color:#fff;box-shadow:0 20px 60px #000c;font-size:14px}' +
    '#wpBox h3{margin:0 0 4px;font-size:19px;font-weight:900;display:flex;align-items:center;gap:8px}#wpBox h3 svg{width:22px;height:22px;fill:none;stroke:#a78bfa;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#wpBox p{margin:6px 0 14px;color:#a09fb5;line-height:1.7;font-size:12.5px}' +
    '#wpBox .wb{display:block;width:100%;height:46px;border:0;border-radius:14px;background:#7b4dff;color:#fff;font-weight:800;font-size:15px;margin-top:8px}' +
    '#wpBox .wb.g{background:#ffffff14;border:1px solid #ffffff22}#wpBox .wb.r{background:#ef444422;border:1px solid #ef444477;color:#fca5a5}' +
    '#wpBox .wb[disabled]{opacity:.5}' +
    '#wpBox .or{text-align:center;color:#a09fb5;margin:14px 0 6px;font-size:12px}' +
    '#wpIn{width:100%;height:46px;border-radius:14px;background:#0e0b20;border:1px solid #7b4dff55;color:#fff;text-align:center;letter-spacing:6px;font-size:20px;font-weight:800;text-transform:uppercase;direction:ltr;padding:0}' +
    '#wpBox .code{direction:ltr;text-align:center;font-size:32px;font-weight:900;letter-spacing:6px;background:#0e0b20;border:1px dashed #7b4dff99;border-radius:16px;padding:14px 6px;margin:12px 0 6px;user-select:all;-webkit-user-select:all}' +
    '#wpBox .row{display:flex;gap:8px}#wpBox .row .wb{flex:1}' +
    '#wpBox .st{display:flex;justify-content:space-between;color:#cfc9ff;margin:10px 2px 2px;font-weight:700}#wpBox .st i{font-style:normal;color:#4ade80}';
  document.head.appendChild(css);

  let busyMsg = '';
  function setBusy(t) { busyMsg = t; refresh(); }

  function openPanel() {
    if ($('#wpOv')) return;
    const ov = document.createElement('div'); ov.id = 'wpOv';
    ov.innerHTML = '<div id="wpBox"></div>';
    ov.addEventListener('click', (e) => { if (e.target === ov) closePanel(); });
    document.body.appendChild(ov);
    refresh();
    ov._t = setInterval(() => { if (!$('#wpOv')) clearInterval(ov._t); else if (P.on) { const m = $('#wpMem'); if (m) m.textContent = members(); } }, 2000);
  }
  function closePanel() { const ov = $('#wpOv'); if (ov) { clearInterval(ov._t); ov.remove(); } busyMsg = ''; }
  window.openWatchParty = openPanel;

  function copy(txt) {
    const done = () => say('تم نسخ الكود ✔');
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(done, fb); } catch (e) {}
    fb();
    function fb() {
      const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); done(); } catch (e) { say('انسخ الكود يدويًا: ' + txt); } ta.remove();
    }
  }

  function refresh() {
    const box = $('#wpBox'); if (!box) return;
    if (busyMsg) { box.innerHTML = '<h3>' + ICON + 'مشاهدة مشتركة</h3><p>' + esc(busyMsg) + '</p>'; return; }
    if (!P.on) {
      box.innerHTML =
        '<h3>' + ICON + 'مشاهدة مشتركة</h3>' +
        '<p>شاهدوا الحلقة نفسها في الوقت نفسه: التشغيل والإيقاف والتقديم تتزامن عند الجميع.</p>' +
        '<button class="wb" id="wpNew">إنشاء غرفة جديدة</button>' +
        '<div class="or">— أو —</div>' +
        '<input id="wpIn" maxlength="9" placeholder="كود الغرفة" autocomplete="off" autocapitalize="characters">' +
        '<button class="wb g" id="wpJoin">دخول بالكود</button>' +
        '<button class="wb g" id="wpX" style="margin-top:14px">إغلاق</button>';
      $('#wpNew').onclick = create;
      $('#wpJoin').onclick = () => join($('#wpIn').value);
      $('#wpIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(e.target.value); });
      $('#wpX').onclick = closePanel;
    } else {
      box.innerHTML =
        '<h3>' + ICON + 'أنت في الغرفة</h3>' +
        '<p>' + (P.host ? 'أنت المضيف: أعطِ هذا الكود لأصدقائك، وأي فيديو تفتحه سيُفتح عندهم.' : 'أنت ضيف: سيُفتح عندك الفيديو الذي يشغّله المضيف.') + '</p>' +
        '<div class="code">' + esc(fmtCode(P.code)) + '</div>' +
        '<div class="st"><span>المتصلون</span><i id="wpMem">' + members() + '</i></div>' +
        '<div class="row"><button class="wb g" id="wpCp">نسخ الكود</button><button class="wb g" id="wpSh">مشاركة</button></div>' +
        '<button class="wb r" id="wpLv">مغادرة الغرفة</button>' +
        '<button class="wb g" id="wpX" style="margin-top:8px">إغلاق</button>';
      $('#wpCp').onclick = () => copy(P.code);
      $('#wpSh').onclick = () => {
        const txt = 'تعال نشاهد الأنمي معًا في WayAnime 🎬 — ادخل إلى «مشاهدة مشتركة» وأدخل الكود: ' + P.code;
        if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else copy(txt);
      };
      $('#wpLv').onclick = () => { leave(); };
      $('#wpX').onclick = closePanel;
    }
  }
})();
