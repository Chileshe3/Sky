// Shared helpers for the server-side pages. Files starting with "_" are not public routes.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';
import { esc } from '../js/chrome.js';

export { esc };

// The address the visitor used, so links stay correct on a custom domain later.
export const origin = (req) =>
  `${req.headers['x-forwarded-proto'] ?? 'https'}://${req.headers['x-forwarded-host'] ?? req.headers.host}`;

// Reads from the Supabase REST API with the public key. Only the "apikey" header is sent,
// because the new publishable keys are not JWTs.
export async function rest(query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: { apikey: SUPABASE_ANON_KEY } });
  if (!r.ok) throw new Error(`Supabase answered ${r.status}`);
  return r.json();
}

export const fmtDate = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const clip = (s, n) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

export function send(res, status, type, body, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.setHeader('Cache-Control', cache);
  res.end(body);
}

// The same page frame as the rest of the site. The header, menu and footer are filled in by /js/photo.js.
export function page({ title, head = '', id = '', body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  ${head}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="dark">
  <header class="bar" id="bar"></header>
  <main id="main" data-id="${esc(id)}">${body}</main>
  <footer class="foot" id="foot"></footer>
  <script type="module" src="/js/photo.js"></script>
</body>
</html>`;
}

export const message = (html) => `<div class="wrap"><p class="note">${html}</p></div>`;
