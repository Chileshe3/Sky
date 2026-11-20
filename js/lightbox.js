import { esc, formatDate, track } from './common.js';

// Full-screen viewer for the tiles inside `grid`.
// getList() returns the photographs in tile order, so it can grow as more load.
export function attachLightbox(grid, getList) {
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Photograph viewer');
  lb.innerHTML = `
    <button class="lb-close" type="button" aria-label="Close viewer">×</button>
    <button class="lb-nav prev" type="button" aria-label="Previous photograph">‹</button>
    <figure><img alt=""></figure>
    <button class="lb-nav next" type="button" aria-label="Next photograph">›</button>
    <div class="lb-cap"></div>`;
  document.body.append(lb);

  const img = lb.querySelector('img');
  const cap = lb.querySelector('.lb-cap');
  const closeBtn = lb.querySelector('.lb-close');
  let idx = 0;
  let token = 0;
  let opener = null;
  const isOpen = () => lb.classList.contains('open');

  function show(i) {
    const list = getList();
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    const p = list[idx];
    const t = ++token;
    track(`photo:${p.id}`);
    img.classList.add('swap');
    setTimeout(() => {
      if (t !== token) return;
      img.src = p.thumb_url; // already cached from the grid, so it appears at once
      img.alt = p.title;
      img.classList.remove('swap');
      cap.innerHTML = `
        <div>
          <div class="lb-title">${esc(p.title)}</div>
          ${p.description ? `<div class="lb-meta"><span>${esc(p.description)}</span></div>` : ''}
        </div>
        <div class="lb-meta">
          <span>${formatDate(p.captured_on)}</span>
          ${p.location ? `<span>${esc(p.location)}</span>` : ''}
          <a href="/photo?id=${p.id}">Photograph page</a>
        </div>`;
      const full = new Image();
      full.onload = () => { if (t === token) img.src = p.image_url; };
      full.src = p.image_url;
    }, isOpen() ? 150 : 0);
  }

  function close() {
    token++;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    opener?.focus();
  }

  grid.addEventListener('click', (e) => {
    const a = e.target.closest('.tile');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    opener = a;
    show(Number(a.dataset.i));
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  });

  closeBtn.addEventListener('click', close);
  lb.querySelector('.prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') {
      const f = [...lb.querySelectorAll('button, a[href]')];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  let startX = 0;
  lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
}
