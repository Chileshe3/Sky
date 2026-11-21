// /sitemap.xml: every page and photograph, rebuilt from the database so new photos appear on their own.
import { CATEGORIES } from '../js/chrome.js';
import { origin, rest, send } from './_lib.js';

const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

export default async function handler(req, res) {
  const base = origin(req);
  try {
    const photos = [];
    for (let from = 0; ; from += 1000) {
      const rows = await rest(`photos?select=id,image_url,created_at&order=created_at.desc&limit=1000&offset=${from}`);
      photos.push(...rows);
      if (rows.length < 1000) break;
    }

    const entry = (path, extra = '') => `  <url><loc>${xml(base + path)}</loc>${extra}</url>`;
    const urls = [
      entry('/'),
      entry('/gallery'),
      entry('/about'),
      ...CATEGORIES.map((c) => entry(`/gallery?c=${c.id}`)),
      ...photos.map((p) =>
        entry(
          `/photo?id=${p.id}`,
          `<lastmod>${String(p.created_at).slice(0, 10)}</lastmod><image:image><image:loc>${xml(p.image_url)}</image:loc></image:image>`
        )
      ),
    ];

    send(
      res,
      200,
      'application/xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`,
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
    );
  } catch {
    send(res, 502, 'text/plain', 'The sitemap could not be built right now.', 'no-store');
  }
}
