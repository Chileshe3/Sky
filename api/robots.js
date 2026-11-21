// /robots.txt: everything is open to search engines, and the sitemap is announced.
// The private admin page keeps itself out of search results with a noindex tag.
import { origin, send } from './_lib.js';

export default function handler(req, res) {
  send(res, 200, 'text/plain', `User-agent: *\nAllow: /\n\nSitemap: ${origin(req)}/sitemap.xml\n`, 'public, max-age=0, s-maxage=86400');
}
