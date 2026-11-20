import { FULL_MAX, THUMB_MAX } from './config.js';
import { supabase, configured, mountChrome, CATEGORIES, category, formatDate, esc } from './common.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');

mountChrome('admin');
document.title = 'Admin';

function say(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(say.t);
  say.t = setTimeout(() => toast.classList.remove('show'), 4000);
}

/* Image helpers: decode once, then draw at two sizes as JPEG. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read. Use a JPEG or PNG.')); };
    img.src = url;
  });
}

async function resize(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (!blob) throw new Error('The image could not be processed.');
  return { blob, w, h };
}

const today = () => new Date().toLocaleDateString('en-CA');
const dateOf = (file) => (file.lastModified ? new Date(file.lastModified).toLocaleDateString('en-CA') : today());
const catOptions = (selected) =>
  CATEGORIES.map((c) => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${c.icon} ${c.label}</option>`).join('');
// Used when a title is left blank, e.g. "Sunsets, 19 November 2026".
const autoTitle = (cat, date) => `${category(cat)?.label ?? 'Photograph'}, ${formatDate(date)}`;

/* Views */
function configView() {
  app.innerHTML = `<h1>Admin</h1><p class="note">Add your Supabase URL and key to js/config.js first.</p>`;
}

function loginView() {
  app.innerHTML = `
    <h1>Sign in</h1>
    <form class="stack" id="login">
      <label>Email<input type="email" name="email" autocomplete="username" required></label>
      <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="error" id="err" role="alert"></p>
      <button class="btn" type="submit">Sign in</button>
    </form>`;
  document.querySelector('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const { error } = await supabase.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
    if (error) document.querySelector('#err').textContent = 'Email or password is incorrect.';
  });
}

let picks = []; // photographs chosen but not yet published: { file, url, li }

function uploadView() {
  picks = [];
  app.innerHTML = `
    <div class="top-actions">
      <h1>Publish photographs</h1>
      <button class="btn ghost small" id="signout" type="button">Sign out</button>
    </div>
    <form class="stack" id="upload">
      <label>Choose photographs<input type="file" name="files" accept="image/*" multiple></label>
      <label>Location for all (optional)<input type="text" name="location" maxlength="120"></label>
      <ul class="picks" id="picks"></ul>
      <button class="btn" type="submit" id="publish" hidden>Publish</button>
    </form>
    <h2>Views</h2>
    <div id="views"><p class="meta">Loading…</p></div>
    <h2>Published photographs</h2>
    <ul class="manage" id="manage"></ul>`;

  const form = document.querySelector('#upload');
  form.files.addEventListener('change', () => {
    addFiles([...form.files.files]);
    form.files.value = ''; // so the same photograph can be chosen again later
  });
  form.addEventListener('submit', publish);
  document.querySelector('#picks').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    removePick(picks.find((p) => p.li === btn.closest('li')));
  });
  document.querySelector('#signout').addEventListener('click', () => supabase.auth.signOut());

  const list = document.querySelector('#manage');
  list.addEventListener('click', manage);
  list.addEventListener('submit', saveEdit);
  loadList().then(loadViews);
}

/* Photographs waiting to be published */
function addFiles(files) {
  const ul = document.querySelector('#picks');
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    const lastCat = picks.length ? picks[picks.length - 1].li.querySelector('[name=category]').value : 'sunsets';
    const li = document.createElement('li');
    li.className = 'pick';
    li.innerHTML = `
      <img src="${url}" alt="">
      <div class="fields">
        <label>Title<input type="text" name="title" maxlength="120"></label>
        <label>Description<textarea name="description"></textarea></label>
        <div class="row">
          <label>Category<select name="category">${catOptions(lastCat)}</select></label>
          <label>Date captured<input type="date" name="captured_on" value="${dateOf(file)}" required></label>
        </div>
        <label class="check"><input type="checkbox" name="featured"> Feature on the homepage</label>
        <p class="status" role="alert"></p>
        <button class="btn ghost small" data-remove type="button">Remove</button>
      </div>`;
    const hint = () => {
      li.querySelector('[name=title]').placeholder = autoTitle(
        li.querySelector('[name=category]').value,
        li.querySelector('[name=captured_on]').value
      );
    };
    li.querySelector('[name=category]').addEventListener('change', hint);
    li.querySelector('[name=captured_on]').addEventListener('change', hint);
    hint();
    ul.append(li);
    picks.push({ file, url, li });
  }
  updateButton();
}

function removePick(pick) {
  if (!pick) return;
  URL.revokeObjectURL(pick.url);
  pick.li.remove();
  picks = picks.filter((p) => p !== pick);
  updateButton();
}

function updateButton() {
  const btn = document.querySelector('#publish');
  btn.hidden = !picks.length;
  btn.textContent = picks.length > 1 ? `Publish ${picks.length} photographs` : 'Publish photograph';
}

/* Publish, one photograph at a time so a phone never holds several large images at once */
async function publishOne({ file, li }, location) {
  const bucket = supabase.storage.from('photos');
  const uploaded = [];
  try {
    const img = await loadImage(file);
    const [full, thumb] = await Promise.all([resize(img, FULL_MAX, 0.86), resize(img, THUMB_MAX, 0.8)]);
    const id = crypto.randomUUID();
    const fullPath = `full/${id}.jpg`;
    const thumbPath = `thumb/${id}.jpg`;

    for (const [path, blob] of [[fullPath, full.blob], [thumbPath, thumb.blob]]) {
      const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (error) throw error;
      uploaded.push(path);
    }

    const get = (name) => li.querySelector(`[name=${name}]`);
    const cat = get('category').value;
    const date = get('captured_on').value;
    const { error } = await supabase.from('photos').insert({
      title: get('title').value.trim() || autoTitle(cat, date),
      description: get('description').value.trim() || null,
      category: cat,
      captured_on: date,
      location,
      image_path: fullPath,
      thumb_path: thumbPath,
      image_url: bucket.getPublicUrl(fullPath).data.publicUrl,
      thumb_url: bucket.getPublicUrl(thumbPath).data.publicUrl,
      width: full.w,
      height: full.h,
      featured: get('featured').checked,
    });
    if (error) throw error;
  } catch (err) {
    if (uploaded.length) await bucket.remove(uploaded);
    throw err;
  }
}

async function publish(e) {
  e.preventDefault();
  if (!picks.length) return say('Choose a photograph first.');

  const form = e.target;
  const btn = document.querySelector('#publish');
  const location = form.location.value.trim() || null;
  const total = picks.length;
  let done = 0;
  let n = 0;
  btn.disabled = true;

  for (const pick of [...picks]) {
    n++;
    btn.textContent = total > 1 ? `Publishing ${n} of ${total}…` : 'Publishing…';
    const status = pick.li.querySelector('.status');
    status.textContent = '';
    try {
      await publishOne(pick, location);
      removePick(pick);
      done++;
    } catch (err) {
      status.textContent = `Could not publish: ${err.message}`;
    }
  }

  btn.disabled = false;
  updateButton();
  if (done) loadList();
  if (done === total) say(total === 1 ? 'Published.' : `Published ${total} photographs.`);
  else say(`Published ${done} of ${total}. The ones that failed are marked below.`);
}

/* Views: totals from the page_views table (needs supabase/views.sql run once) */
async function loadViews() {
  const box = document.querySelector('#views');
  if (!box) return;
  const daysAgo = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA');
  const { data, error } = await supabase.from('page_views').select('day,key,views').gte('day', daysAgo(29));
  if (error) {
    box.innerHTML = '<p class="meta">Views are not set up yet. Run supabase/views.sql in the Supabase SQL Editor.</p>';
    return;
  }
  const sum = (rows) => rows.reduce((n, r) => n + r.views, 0);
  const only = (key) => sum(data.filter((r) => r.key === key));
  const perPhoto = {};
  for (const r of data) {
    if (r.key.startsWith('photo:')) perPhoto[r.key.slice(6)] = (perPhoto[r.key.slice(6)] ?? 0) + r.views;
  }
  const top = items
    .filter((p) => perPhoto[p.id])
    .sort((a, b) => perPhoto[b.id] - perPhoto[a.id])
    .slice(0, 5);

  box.innerHTML = `
    <div class="stats">
      <div><strong>${sum(data.filter((r) => r.day >= daysAgo(6)))}</strong><span>views in 7 days</span></div>
      <div><strong>${sum(data)}</strong><span>views in 30 days</span></div>
    </div>
    <p class="meta">Last 30 days: homepage ${only('home')}, gallery ${only('gallery')}, photographs ${Object.values(perPhoto).reduce((a, b) => a + b, 0)}. Repeat views in one browser tab count once, and your own visits are not counted while you are signed in.</p>
    ${top.length ? `<p><strong>Most viewed photographs</strong></p>
    <ol class="top">${top.map((p) => `<li><a href="/photo?id=${p.id}">${esc(p.title)}</a> <span class="meta">${perPhoto[p.id]} views</span></li>`).join('')}</ol>` : ''}`;
}

/* Published photographs: edit, feature, delete */
let items = [];

function renderList() {
  const ul = document.querySelector('#manage');
  if (!items.length) { ul.innerHTML = '<li class="meta">Nothing published yet.</li>'; return; }
  ul.innerHTML = items.map((p) => `
    <li data-id="${p.id}">
      <img src="${esc(p.thumb_url)}" alt="">
      <div>
        <strong>${esc(p.title)}</strong>
        <div class="meta">${category(p.category)?.label ?? ''}, ${formatDate(p.captured_on)}${p.featured ? ', featured' : ''}</div>
        <div class="actions">
          <button class="btn ghost small" data-act="edit" type="button">Edit</button>
          <button class="btn ghost small" data-act="feature" type="button">${p.featured ? 'Remove from homepage' : 'Feature on homepage'}</button>
          <button class="btn ghost small" data-act="delete" type="button">Delete</button>
        </div>
      </div>
    </li>`).join('');
}

async function loadList() {
  const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
  if (error) { document.querySelector('#manage').innerHTML = '<li>The list could not be loaded. Refresh the page.</li>'; return; }
  items = data;
  renderList();
}

function editRow(li, p) {
  li.classList.add('editing');
  li.innerHTML = `
    <form class="stack">
      <label>Title<input type="text" name="title" maxlength="120" required value="${esc(p.title)}"></label>
      <label>Description<textarea name="description">${esc(p.description ?? '')}</textarea></label>
      <div class="row">
        <label>Category<select name="category">${catOptions(p.category)}</select></label>
        <label>Date captured<input type="date" name="captured_on" value="${esc(p.captured_on)}" required></label>
      </div>
      <label>Location (optional)<input type="text" name="location" maxlength="120" value="${esc(p.location ?? '')}"></label>
      <label class="check"><input type="checkbox" name="featured"${p.featured ? ' checked' : ''}> Feature on the homepage</label>
      <div class="actions">
        <button class="btn small" type="submit">Save changes</button>
        <button class="btn ghost small" type="button" data-act="cancel">Cancel</button>
      </div>
    </form>`;
  li.querySelector('[name=title]').focus();
}

async function saveEdit(e) {
  e.preventDefault();
  const li = e.target.closest('li');
  const f = new FormData(e.target);
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const { error } = await supabase.from('photos').update({
    title: f.get('title').trim(),
    description: f.get('description').trim() || null,
    category: f.get('category'),
    captured_on: f.get('captured_on'),
    location: f.get('location').trim() || null,
    featured: f.get('featured') === 'on',
  }).eq('id', li.dataset.id);
  btn.disabled = false;
  if (error) return say(`Could not save: ${error.message}`);
  say('Saved.');
  loadList();
}

async function manage(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'cancel') return renderList();

  const li = btn.closest('li');
  const p = items.find((x) => x.id === li.dataset.id);
  if (!p) return;

  if (btn.dataset.act === 'edit') {
    return editRow(li, p);
  }
  if (btn.dataset.act === 'feature') {
    const { error } = await supabase.from('photos').update({ featured: !p.featured }).eq('id', p.id);
    if (error) return say(`Could not update: ${error.message}`);
    say(p.featured ? 'Removed from homepage.' : 'Featured on homepage.');
  } else {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await supabase.storage.from('photos').remove([p.image_path, p.thumb_path]);
    const { error } = await supabase.from('photos').delete().eq('id', p.id);
    if (error) return say(`Could not delete: ${error.message}`);
    say('Deleted.');
  }
  loadList();
}

/* Start */
// Lets the phone offer to install this page as an app.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

if (!configured) {
  configView();
} else {
  // Re-render only when signed-in state changes, so a token refresh never wipes a half-filled form.
  let signedIn = null;
  supabase.auth.onAuthStateChange((_event, session) => {
    const now = Boolean(session);
    if (now === signedIn) return;
    signedIn = now;
    now ? uploadView() : loginView();
  });
}
