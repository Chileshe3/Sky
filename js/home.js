import { SITE, HOME_COUNT } from './config.js';
import { mountChrome, fetchFeatured, fetchPage, tile, formatDate, esc, emptyMessage, track } from './common.js';
import { attachLightbox } from './lightbox.js';

const $ = (s) => document.querySelector(s);

mountChrome('home');
track('home');
document.title = `${SITE.name} – sunset, cloud and landscape photography`;
$('#masthead').textContent = SITE.name;
$('#lede').textContent = SITE.intro;

// One extra photograph is fetched in case the featured one is also among the newest.
const [featured, latest] = await Promise.all([fetchFeatured(), fetchPage({ from: 0, size: HOME_COUNT + 1 })]);
const hero = featured ?? latest.photos[0];

if (hero) {
  $('#hero').insertAdjacentHTML(
    'afterbegin',
    `<img src="${esc(hero.image_url)}" alt="${esc(hero.title)}" fetchpriority="high">`
  );
  $('#hero-cap').innerHTML = `
    <a href="/photo?id=${hero.id}">${esc(hero.title)}</a>
    <span>${formatDate(hero.captured_on)}</span>
    ${hero.location ? `<span>${esc(hero.location)}</span>` : ''}`;
} else {
  $('#hero').classList.add('empty');
  $('#hero-cap').innerHTML = `<span>${emptyMessage(latest.error)}</span>`;
}

const recent = latest.photos.filter((p) => p.id !== hero?.id).slice(0, HOME_COUNT);
if (recent.length) {
  const grid = $('#recent');
  grid.innerHTML = recent.map(tile).join('');
  attachLightbox(grid, () => recent);
  $('#recent-section').hidden = false;
}
