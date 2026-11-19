import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SITE, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const configured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && !SUPABASE_URL.includes('YOUR-PROJECT');

export const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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

export const formatDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Returns { photos, error } where error is null, 'not-configured' or 'failed'.
export async function fetchPhotos() {
  if (!supabase) return { photos: [], error: 'not-configured' };
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('captured_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  return { photos: data ?? [], error: error ? 'failed' : null };
}

export function emptyMessage(error) {
  if (error === 'not-configured') return 'Add your Supabase URL and anon key to js/config.js to connect the gallery.';
  if (error === 'failed') return 'The photographs could not be loaded. Refresh the page to try again.';
  return 'No photographs yet. <a href="/admin">Sign in</a> to publish the first one.';
}

export function tile(p, i) {
  const ratio = p.width && p.height ? `${p.width} / ${p.height}` : '3 / 2';
  return `<a class="tile" href="/photo?id=${p.id}" data-i="${i}" style="aspect-ratio:${ratio}">
    <img src="${esc(p.thumb_url)}" alt="${esc(p.title)}" loading="lazy" decoding="async">
  </a>`;
}

export function mountChrome(current) {
  const link = (href, label, key) =>
    `<a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  document.querySelector('#bar').innerHTML = `
    <a class="name" href="/">${esc(SITE.name)}</a>
    <nav aria-label="Main">${link('/', 'Home', 'home')}${link('/gallery', 'Gallery', 'gallery')}</nav>`;
  document.querySelector('#foot').innerHTML = `<p>© ${new Date().getFullYear()} ${esc(SITE.name)}. All photographs are my own.</p>`;
}
