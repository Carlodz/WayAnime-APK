/* مركز الإشعارات — Android: حالة الصلاحية، اختبار، فحص فوري، سجل الحلقات الجديدة (يتحفظ فـ الجزء الأصلي حتى والتطبيق مسدود) */
(function () {
  const SEEN = 'wa_notif_seen';
  const api = () => window.api || {};
  const BELL = '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4"/></svg>';
  const TRASH = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  window.waBellIcon = BELL;
  window.waUnread = 0;

  const css = document.createElement('style');
  css.textContent =
    '#ntPage{padding:6px var(--gut,14px) 90px;direction:rtl}' +
    '#ntPage .nth{display:flex;align-items:center;justify-content:space-between;margin:4px 0 14px}' +
    '#ntPage .nth h2{margin:0;font-size:22px;font-weight:900}' +
    '#ntPage .nth button{background:none;border:0;color:#fff;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center}' +
    '#ntPage svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#ntPage .ntc{background:var(--panel,#16122e);border:1px solid var(--line,#ffffff1a);border-radius:16px;padding:12px 14px;margin-bottom:12px}' +
    '#ntPage .ntr{display:flex;align-items:center;gap:10px;font-size:14px;padding:5px 0}' +
    '#ntPage .ntr .d{width:9px;height:9px;border-radius:50%;background:#4ade80;flex:none}#ntPage .ntr .d.bad{background:#f87171}#ntPage .ntr .d.warn{background:#fbbf24}' +
    '#ntPage .ntr span{flex:1;min-width:0}#ntPage .ntr small{color:var(--mute,#9a98b5);font-size:12px}' +
    '#ntPage .nta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
    '#ntPage .nta button{flex:1 1 140px;height:42px;border-radius:999px;border:1px solid #7b4dff66;background:#7b4dff1f;color:#fff;font-weight:700;font-size:13px}' +
    '#ntPage .nta button.pri{background:#7b4dff;border-color:transparent}' +
    '#ntPage .nti{display:flex;align-items:center;gap:12px;background:var(--panel,#16122e);border:1px solid var(--line,#ffffff1a);border-radius:16px;padding:10px 12px;margin-bottom:10px;cursor:pointer}' +
    '#ntPage .nti.new{border-color:#7b4dffaa;background:#7b4dff14}' +
    '#ntPage .nti img,#ntPage .nti .ph{width:46px;height:64px;border-radius:8px;object-fit:cover;background:#ffffff14;flex:none}' +
    '#ntPage .nti .tx{flex:1;min-width:0}#ntPage .nti b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#ntPage .nti p{margin:3px 0 0;font-size:13px;color:#d9d6ee}#ntPage .nti small{color:var(--mute,#9a98b5);font-size:11.5px}' +
    '#ntPage .nte{text-align:center;color:var(--mute,#9a98b5);padding:46px 10px;font-size:14px;line-height:1.9}' +
    '#dr .nbadge{font-style:normal;background:#7b4dff;color:#fff;border-radius:999px;font-size:11px;font-weight:800;padding:1px 8px;margin-inline-start:8px}';
  document.head.appendChild(css);

  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const seen = () => +localStorage.getItem(SEEN) || 0;
  const markSeen = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch (e) {} window.waUnread = 0; };
  const ago = (t) => {
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'الآن';
    if (m < 60) return 'منذ ' + m + ' د';
    const h = Math.round(m / 60);
    if (h < 24) return 'منذ ' + h + ' س';
    return 'منذ ' + Math.round(h / 24) + ' يوم';
  };
  const toastMsg = (t) => { try { toast(t); } catch (e) { /* ignore */ } };

  async function refreshUnread() {
    try {
      const log = await api().notifyLog();
      const s = seen();
      window.waUnread = (log || []).filter((x) => x.t > s).length;
    } catch (e) {}
  }

  async function render() {
    const page = document.getElementById('ntPage'); if (!page) return;
    const [st, log] = await Promise.all([
      api().notifyStatus ? api().notifyStatus().catch(() => null) : null,
      api().notifyLog ? api().notifyLog().catch(() => []) : []
    ]);
    const s = seen();
    const S = st || { granted: false, enabled: false, battery: true, count: 0, na: true };
    const on = (typeof notifyOn !== 'undefined') ? notifyOn : S.enabled;
    const row = (cls, t, sub) => '<div class="ntr"><i class="d ' + cls + '"></i><span>' + t + (sub ? '<br><small>' + sub + '</small>' : '') + '</span></div>';
    let info = '';
    if (S.na) info += row('bad', 'هذه الميزة تحتاج نسخة APK جديدة', 'أعد بناء التطبيق ليشتغل نظام الإشعارات على هاتفك');
    else {
      info += row(S.granted ? '' : 'bad', S.granted ? 'إذن الإشعارات: مفعّل' : 'إذن الإشعارات: مغلق', S.granted ? '' : 'اضغط «فتح إعدادات الإشعارات» ثم فعّلها');
      info += row(on && S.enabled ? '' : 'warn', on ? (S.enabled ? 'المراقبة تعمل (كل 30 دقيقة)' : 'سيبدأ الفحص بعد قليل') : 'المراقبة متوقفة', S.count ? 'تتم مراقبة ' + S.count + ' أنمي من المفضلة وآخر ما شاهدته' : 'أضف أنمي إلى المفضلة ليتم إشعارك بحلقاته الجديدة');
      info += row(S.battery ? '' : 'warn', S.battery ? 'العمل في الخلفية: مسموح' : 'العمل في الخلفية: قد يوقفه النظام', S.battery ? '' : 'اسمح للتطبيق بدون قيود بطارية لتصلك الإشعارات والتطبيق مغلق');
    }
    const acts = '<div class="nta">' +
      '<button class="pri" data-a="test">إرسال إشعار تجريبي</button>' +
      '<button data-a="tog">' + (on ? 'إيقاف الإشعارات' : 'تشغيل الإشعارات') + '</button>' +
      '<button data-a="check">افحص الآن</button>' +
      (S.granted ? '' : '<button data-a="set">فتح إعدادات الإشعارات</button>') +
      (S.battery ? '' : '<button data-a="bat">السماح في الخلفية</button>') + '</div>';
    const items = (log || []).map((x, i) =>
      '<div class="nti' + (x.t > s ? ' new' : '') + '" data-i="' + i + '">' +
      (x.poster ? '<img src="' + E(x.poster) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="ph"></div>') +
      '<div class="tx"><b>' + E(x.name) + '</b><p>' + E(x.body) + '</p><small>' + ago(x.t) + '</small></div></div>').join('');
    page.innerHTML =
      '<div class="nth"><h2>الإشعارات</h2>' + (log && log.length ? '<button data-a="clr" title="مسح السجل">' + TRASH + '</button>' : '') + '</div>' +
      '<div class="ntc">' + info + acts + '</div>' +
      (items || '<div class="nte">لا توجد إشعارات بعد.<br>عندما تنزل حلقة جديدة من الأنمي المفضّل لديك ستظهر هنا.</div>');
    page._log = log || [];
    markSeen();
  }

  async function onClick(e) {
    const page = document.getElementById('ntPage'); if (!page) return;
    const b = e.target.closest('[data-a]');
    if (b) {
      const a = b.dataset.a, A = api();
      if (a === 'test') {
        const r = await (A.notifyPerm ? A.notifyPerm().catch(() => null) : null);
        if (r && r.granted === false) { toastMsg('الإذن مرفوض — فعّل الإشعارات من إعدادات الهاتف'); if (A.notifySettings) A.notifySettings(); return; }
        await A.notifyTest();
        toastMsg('تم إرسال الإشعار التجريبي — تفقد شريط الإشعارات');
      } else if (a === 'tog') {
        const nv = !((typeof notifyOn !== 'undefined') ? notifyOn : false);
        store.set('notifyOn', nv); notifyOn = nv;
        if (nv) { try { await A.notifyPerm(); } catch (e2) {} setTimeout(() => { try { watchNew(); } catch (e3) {} }, 400); }
        else { try { A.notifySync({ enabled: false, items: [] }); } catch (e4) {} }
        toastMsg(nv ? 'تم تشغيل الإشعارات' : 'تم إيقاف الإشعارات');
      } else if (a === 'check') {
        toastMsg('جارٍ فحص الحلقات الجديدة…');
        try { await watchNew(); } catch (e5) {}
        try { await A.notifyCheck(); } catch (e6) {}
      } else if (a === 'set') { A.notifySettings(); return; }
      else if (a === 'bat') { A.notifyBattery(); return; }
      else if (a === 'clr') { if (!confirm('مسح سجل الإشعارات؟')) return; await A.notifyClear(); }
      setTimeout(render, 600);
      return;
    }
    const it = e.target.closest('.nti');
    if (it && page._log) {
      const x = page._log[+it.dataset.i];
      if (x && x.id && typeof openAr === 'function') openAr(x.id, x.ep ? String(x.ep) : undefined);
    }
  }

  window.openNotifications = function () {
    if (typeof view === 'undefined') return;
    try { setNav(null); } catch (e) {}
    document.body.classList.remove('dr-open', 'cb-open');
    view.scrollTop = 0;
    view.innerHTML = '<div id="ntPage"></div>';
    view.querySelector('#ntPage').addEventListener('click', onClick);
    render();
  };

  setTimeout(refreshUnread, 3000);
  setInterval(refreshUnread, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshUnread(); if (document.getElementById('ntPage')) render(); } });
})();
