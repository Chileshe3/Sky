// Serves /photo?id=... as a finished HTML page, so search engines and link previews
// (WhatsApp, Facebook, X) see the title, description and image straight away.
import { SITE } from '../js/config.js';
import { category } from '../js/chrome.js';
import { esc, origin, rest, fmtDate, clip, send, page, message } from './_lib.js';

const CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';

export default async function handler(req, res) {
  const id = req.query?.id ?? new URL(req.url, 'http://x').searchParams.get('id') ?? '';
  const missing = () =>
    send(
      res,
      404,
      'text/html',
      page({
        title: `Photograph not found – ${SITE.name}`,
        head: '<meta name="robots" content="noindex">',
        body: message('That photograph is not here. It may have been removed. <a href="/gallery">Browse the gallery</a>.'),
      }),
      'public, max-age=0, s-maxage=60'
    );

  if (!/^[0-9a-f-]{36}$/i.test(id)) return missing();

  let rows;
  let list;
  try {
    [rows, list] = await Promise.all([
      rest(`photos?select=*&id=eq.${id}`),
      rest('photos?select=id,title&order=captured_on.desc,created_at.desc&limit=1000'),
    ]);
  } catch {
    return send(
      res,
      502,
      'text/html',
      page({
        title: `Photograph unavailable – ${SITE.name}`,
        head: '<meta name="robots" content="noindex">',
        body: message('The photograph could not be loaded. Refresh the page to try again.'),
      }),
      'no-store'
    );
  }

  const p = rows[0];
  if (!p) return missing();

  const url = `${origin(req)}/photo?id=${p.id}`;
  const cat = category(p.category);
  const summary = clip(
    p.description ||
      `${p.title}${p.location ? `, ${p.location}` : ''}. ${cat ? cat.label : 'Photograph'}, photographed on ${fmtDate(p.captured_on)}.`,
    160
  );

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: p.title,
    description: p.description || undefined,
    contentUrl: p.image_url,
    thumbnailUrl: p.thumb_url,
    dateCreated: p.captured_on,
    contentLocation: p.location ? { '@type': 'Place', name: p.location } : undefined,
    creditText: SITE.name,
    copyrightNotice: `© ${SITE.name}`,
    url,
  };

  const i = list.findIndex((x) => x.id === p.id);
  const newer = i > 0 ? list[i - 1] : null;
  const older = i >= 0 && i < list.length - 1 ? list[i + 1] : null;

  const head = `
  <meta name="description" content="${esc(summary)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(summary)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(p.thumb_url)}">
  <meta property="og:image:alt" content="${esc(p.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;

  const body = `
    <div class="stage">
      <img src="${esc(p.image_url)}" alt="${esc(p.title)}"${p.width ? ` width="${p.width}" height="${p.height}"` : ''} fetchpriority="high">
    </div>
    <section class="detail">
      <div>
        <h1>${esc(p.title)}</h1>
        <dl class="facts">
          <dt>Captured</dt><dd>${fmtDate(p.captured_on)}</dd>
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

  send(res, 200, 'text/html', page({ title: `${p.title} – ${SITE.name}`, head, id: p.id, body }), CACHE);
}
