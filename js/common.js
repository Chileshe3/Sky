import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { esc } from './chrome.js';

export { CATEGORIES, category, esc, mountChrome } from './chrome.js';

export const configured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && !SUPABASE_URL.includes('YOUR-PROJECT');

export const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const formatDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// One page of photographs, newest first. `more` says whether another page exists.
// error is null, 'not-configured' or 'failed'.
export async function fetchPage({ category, from = 0, size }) {
  if (!supabase) return { photos: [], more: false, error: 'not-configured' };
  let q = supabase.from('photos').select('*');
  if (category) q = q.eq('category', category);
  q = q
    .order('captured_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + size); // one extra row tells us if there is a next page
  const { data, error } = await q;
  if (error) return { photos: [], more: false, error: 'failed' };
  return { photos: data.slice(0, size), more: data.length > size, error: null };
}

export async function fetchFeatured() {
  if (!supabase) return null;
  const { data } = await supabase
    .from('photos')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export function emptyMessage(error) {
  if (error === 'not-configured') return 'Add your Supabase URL and key to js/config.js to connect the gallery.';
  if (error === 'failed') return 'The photographs could not be loaded. Refresh the page to try again.';
  return 'No photographs yet. Check back soon.';
}

// A square thumbnail. `i` is its position in the list the lightbox steps through.
export function tile(p, i) {
  return `<a class="tile" href="/photo?id=${p.id}" data-i="${i}">
    <img src="${esc(p.thumb_url)}" alt="${esc(p.title)}" loading="lazy" decoding="async">
  </a>`;
}
