// Header, slide-in menu and footer shared by every page.
// Kept free of Supabase so the legal pages load nothing extra.
import { SITE } from './config.js';

export const CATEGORIES = [
  { id: 'sunsets', label: 'Sunsets', icon: '🌅' },
  { id: 'clouds', label: 'Clouds', icon: '☁️' },
  { id: 'landscapes', label: 'Landscapes', icon: '🌳' },
  { id: 'night-skies', label: 'Night skies', icon: '🌌' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'astronomy', label: 'Astronomy', icon: '🔭' },
];

export const category = (id) => CATEGORIES.find((c) => c.id === id);

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// current: 'home', 'gallery', a category id, or anything else for no highlighted link.
export function mountChrome(current) {
  const here = (key) => (current === key ? ' aria-current="page"' : '');
  const catLinks = (withCurrent) =>
    CATEGORIES.map(
      (c) => `<li><a href="/gallery?c=${c.id}"${withCurrent ? here(c.id) : ''}>${c.icon} ${c.label}</a></li>`
    ).join('');

  /* Header */
  document.querySelector('#bar').innerHTML = `
    <a class="name" href="/">${esc(SITE.name)}</a>
    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu">
      Menu<span class="burger" aria-hidden="true"></span>
    </button>`;

  /* Menu */
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div class="menu" id="menu">
      <div class="menu-scrim" data-close></div>
      <div class="menu-panel" role="dialog" aria-modal="true" aria-label="Site menu">
        <button class="menu-close" id="menu-close" type="button" aria-label="Close menu">×</button>
        <nav aria-label="Site">
          <ul class="menu-main">
            <li><a href="/"${here('home')}>Home</a></li>
            <li><a href="/gallery"${here('gallery')}>Gallery</a></li>
            <li><a href="/about"${here('about')}>About</a></li>
          </ul>
          <ul class="menu-cats">${catLinks(true)}</ul>
        </nav>
      </div>
    </div>`
  );

  const menu = document.querySelector('#menu');
  const btn = document.querySelector('#menu-btn');
  const closeBtn = document.querySelector('#menu-close');

  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    (open ? closeBtn : btn).focus();
  };

  btn.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));
  menu.querySelector('[data-close]').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (!menu.classList.contains('open')) return;
    if (e.key === 'Escape') return setOpen(false);
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll('button, a[href]')];
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Footer */
  const mail = SITE.email ? `<li><a href="mailto:${esc(SITE.email)}">Contact</a></li>` : '';
  document.querySelector('#foot').innerHTML = `
    <div class="foot-top">
      <div class="foot-brand">
        <a class="foot-name" href="/">${esc(SITE.name)}</a>
        <p>${esc(SITE.tagline)}</p>
      </div>
      <nav class="foot-cols" aria-label="Footer">
        <div>
          <h2>Browse</h2>
          <ul><li><a href="/">Home</a></li><li><a href="/gallery">Gallery</a></li><li><a href="/about">About</a></li></ul>
        </div>
        <div>
          <h2>Categories</h2>
          <ul>${catLinks(false)}</ul>
        </div>
        <div>
          <h2>Legal</h2>
          <ul><li><a href="/privacy">Privacy policy</a></li><li><a href="/terms">Terms of use</a></li>${mail}</ul>
        </div>
      </nav>
    </div>
    <p class="foot-base">© ${new Date().getFullYear()} ${esc(SITE.name)}. All photographs are my own and may not be used without permission.</p>`;

  /* Contact details on the legal pages, shown only once an email is set */
  if (SITE.email) {
    document.querySelectorAll('[data-contact]').forEach((el) => { el.hidden = false; });
    document.querySelectorAll('[data-mail]').forEach((a) => {
      a.href = `mailto:${SITE.email}`;
      a.textContent = SITE.email;
    });
  }
}
