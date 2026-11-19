import { SITE } from './config.js';
import { mountChrome, fetchPhotos, CATEGORIES, category, tile, formatDate, esc, emptyMessage } from './common.js';

const $ = (s) => document.querySelector(s);

mountChrome('gallery');
document.title = `Gallery – ${SITE.name}`;

const { photos, error } = await fetchPhotos();
let current = new URLSearchParams(location.search).get('c');
if (current && !category(current)) current = null;
let list = [];

/* Filters */
function renderFilters() {
  const chips = [{ id: null, label: 'All', icon: '' }, ...CATEGORIES];
  $('#filters').innerHTML = chips
    .map((c) => `<button class="chip" data-c="${c.id ?? ''}" aria-pressed="${c.id === current}">${c.icon ? `${c.icon} ` : ''}${c.label}</button>`)
    .join('');
}

function renderGrid() {
  list = current ? photos.filter((p) => p.category === current) : photos;
  $('#grid').innerHTML = list.map(tile).join('');
  const note = $('#note');
  if (!photos.length) {
    note.innerHTML = emptyMessage(error);
    note.hidden = false;
  } else if (!list.length) {
    note.textContent = `No ${category(current).label.toLowerCase()} photographs yet.`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  current = btn.dataset.c || null;
  history.replaceState(null, '', current ? `?c=${current}` : location.pathname);
  renderFilters();
  renderGrid();
});

renderFilters();
renderGrid();

/* Lightbox */
const lb = $('#lb');
const lbImg = $('#lb-img');
let idx = 0;
let token = 0;
let opener = null;

function caption(p) {
  $('#lb-cap').innerHTML = `
    <div>
      <div class="lb-title">${esc(p.title)}</div>
      ${p.description ? `<div class="lb-meta"><span>${esc(p.description)}</span></div>` : ''}
    </div>
    <div class="lb-meta">
      <span>${formatDate(p.captured_on)}</span>
      ${p.location ? `<span>${esc(p.location)}</span>` : ''}
      <a href="/photo?id=${p.id}">Photograph page</a>
    </div>`;
}

function show(i) {
  idx = (i + list.length) % list.length;
  const p = list[idx];
  const t = ++token;
  lbImg.classList.add('swap');
  setTimeout(() => {
    if (t !== token) return;
    lbImg.src = p.thumb_url; // already cached from the grid, appears instantly
    lbImg.alt = p.title;
    lbImg.classList.remove('swap');
    caption(p);
    const full = new Image();
    full.onload = () => { if (t === token) lbImg.src = p.image_url; };
    full.src = p.image_url;
  }, lb.classList.contains('open') ? 150 : 0);
}

function open(i, from) {
  opener = from;
  show(i);
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  $('#lb-close').focus();
}

function close() {
  token++;
  lb.classList.remove('open');
  document.body.style.overflow = '';
  opener?.focus();
}

$('#grid').addEventListener('click', (e) => {
  const a = e.target.closest('.tile');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  open(Number(a.dataset.i), a);
});

$('#lb-close').addEventListener('click', close);
$('#lb-prev').addEventListener('click', () => show(idx - 1));
$('#lb-next').addEventListener('click', () => show(idx + 1));
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });

document.addEventListener('keydown', (e) => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowLeft') show(idx - 1);
  else if (e.key === 'ArrowRight') show(idx + 1);
  else if (e.key === 'Tab') {
    const f = [...lb.querySelectorAll('button, a[href]')];
    const first = f[0], last = f[f.length - 1];
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
