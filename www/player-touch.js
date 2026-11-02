/* إصلاحات المشغّل على الهاتف:
   1) اللمس كان ما كيفعّلش «إظهار الأزرار» (كان غير mousemove) → الأزرار كتخبى وانت كتجرّ شريط التقدّم.
   2) أول لمسة على الفيديو والأزرار مخبية كانت كتوقّف الفيديو → دابا كتظهر الأزرار فقط. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  let idleAtDown = false, clr = 0;
  const wake = (pl) => { try { pl.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })); } catch {} };

  document.addEventListener('pointerdown', (e) => {
    const pl = $('#pl'); if (!pl || !pl.contains(e.target)) return;
    idleAtDown = pl.classList.contains('idle') && e.target.tagName === 'VIDEO';
    wake(pl);
  }, true);
  const rel = () => { clearTimeout(clr); clr = setTimeout(() => { idleAtDown = false; }, 450); };
  document.addEventListener('pointerup', rel, true);
  document.addEventListener('pointercancel', rel, true);

  const move = (e) => { const pl = $('#pl'); if (pl && pl.contains(e.target)) wake(pl); };
  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') move(e); }, true);
  document.addEventListener('touchmove', move, { capture: true, passive: true });

  document.addEventListener('click', (e) => {
    if (!idleAtDown) return;
    idleAtDown = false;
    if (e.target && e.target.tagName === 'VIDEO') { e.stopPropagation(); e.preventDefault(); }
  }, true);
})();
