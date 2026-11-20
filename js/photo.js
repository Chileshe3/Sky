import { SITE } from './config.js';
import { supabase, mountChrome, category, formatDate, esc, emptyMessage, track } from './common.js';

const main = document.querySelector('#main');
mountChrome('photo');

function missing(html) {
  main.innerHTML = `<div class="wrap"><p class="note">${html}</p></div>`;
}

const id = new URLSearchParams(location.search).get('id');

if (!supabase) {
  missing(emptyMessage('not-configured'));
} else if (!id) {
  missing('No photograph selected. <a href="/gallery">Browse the gallery</a>.');
} else {
  const [one, all] = await Promise.all([
    supabase.from('photos').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('photos')
      .select('id,title')
      .order('captured_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500),
  ]);
  const p = one.data;

  if (one.error) {
    missing(emptyMessage('failed'));
  } else if (!p) {
    missing('That photograph is not here. It may have been removed. <a href="/gallery">Browse the gallery</a>.');
  } else {
    document.title = `${p.title} – ${SITE.name}`;
    track(`photo:${p.id}`);
    const cat = category(p.category);
    const ids = (all.data ?? []).map((x) => x.id);
    const i = ids.indexOf(p.id);
    const newer = i > 0 ? all.data[i - 1] : null;
    const older = i >= 0 && i < ids.length - 1 ? all.data[i + 1] : null;

    main.innerHTML = `
      <div class="stage">
        <img src="${esc(p.image_url)}" alt="${esc(p.title)}" ${p.width ? `width="${p.width}" height="${p.height}"` : ''} fetchpriority="high">
      </div>
      <section class="detail">
        <div>
          <h1>${esc(p.title)}</h1>
          <dl class="facts">
            <dt>Captured</dt><dd>${formatDate(p.captured_on)}</dd>
            ${p.location ? `<dt>Location</dt><dd>${esc(p.location)}</dd>` : ''}
            ${cat ? `<dt>Category</dt><dd><a href="/gallery?c=${cat.id}">${cat.icon} ${cat.label}</a></dd>` : ''}
          </dl>
        </div>
        ${p.description ? `<p class="about">${esc(p.description)}</p>` : ''}
      </section>
      <nav class="pager" aria-label="More photographs">
        ${newer ? `<a href="/photo?id=${newer.id}"><span>Newer</span>${esc(newer.title)}</a>` : '<span></span>'}
        ${older ? `<a class="older" href="/photo?id=${older.id}"><span>Older</span>${esc(older.title)}</a>` : ''}
      </nav>`;
  }
}
