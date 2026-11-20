import { SITE, PAGE_SIZE } from './config.js';
import { mountChrome, fetchPage, category, tile, emptyMessage } from './common.js';
import { attachLightbox } from './lightbox.js';

const $ = (s) => document.querySelector(s);

const cat = category(new URLSearchParams(location.search).get('c'));
const name = cat ? cat.label : 'Gallery';

mountChrome(cat ? cat.id : 'gallery');
document.title = `${name} – ${SITE.name}`;
$('#title').textContent = cat ? `${cat.icon} ${cat.label}` : 'Gallery';

const grid = $('#grid');
const moreBtn = $('#more');
const note = $('#note');
const end = $('#end');
const list = [];

attachLightbox(grid, () => list);

async function load() {
  const first = list.length === 0;
  moreBtn.hidden = false;
  moreBtn.disabled = true;
  moreBtn.textContent = 'Loading…';

  const r = await fetchPage({ category: cat?.id, from: list.length, size: PAGE_SIZE });

  if (r.error) {
    if (first) {
      moreBtn.hidden = true;
      note.innerHTML = emptyMessage(r.error);
      note.hidden = false;
    } else {
      moreBtn.disabled = false;
      moreBtn.textContent = 'Could not load more. Try again';
    }
    return;
  }

  if (first && !r.photos.length) {
    moreBtn.hidden = true;
    note.innerHTML = cat
      ? `No ${cat.label.toLowerCase()} photographs yet. <a href="/gallery">Browse the whole gallery</a>.`
      : emptyMessage(null);
    note.hidden = false;
    return;
  }

  const start = list.length;
  list.push(...r.photos);
  grid.insertAdjacentHTML('beforeend', r.photos.map((p, i) => tile(p, start + i)).join(''));

  moreBtn.disabled = false;
  moreBtn.textContent = 'Load more';
  moreBtn.hidden = !r.more;
  end.hidden = r.more || first; // only say "that's all" after the visitor has tapped Load more
}

moreBtn.addEventListener('click', load);
load();
