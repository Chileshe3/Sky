import { SITE } from './config.js';
import { mountChrome, fetchPhotos, CATEGORIES, tile, formatDate, esc, emptyMessage } from './common.js';

const $ = (s) => document.querySelector(s);

mountChrome('home');
document.title = SITE.name;
$('#masthead').textContent = SITE.name;
$('#lede').textContent = SITE.intro;

const { photos, error } = await fetchPhotos();
const hero = photos.find((p) => p.featured) ?? photos[0];

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
  $('#hero-cap').innerHTML = `<span>${emptyMessage(error)}</span>`;
}

$('#index').innerHTML = CATEGORIES.map((c) => {
  const n = photos.filter((p) => p.category === c.id).length;
  return `<li><a href="/gallery?c=${c.id}"><span>${c.icon} ${c.label}</span><span class="count">${n}</span></a></li>`;
}).join('');

const recent = photos.filter((p) => p !== hero).slice(0, 9);
if (recent.length) {
  $('#recent').innerHTML = recent.map(tile).join('');
  $('#recent-section').hidden = false;
}
