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
  say.t = setTimeout(() => toast.classList.remove('show'), 3500);
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

/* Views */
function configView() {
  app.innerHTML = `<h1>Admin</h1><p class="note">Add your Supabase URL and anon key to js/config.js first.</p>`;
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

function uploadView() {
  app.innerHTML = `
    <div class="top-actions">
      <h1>Publish a photograph</h1>
      <button class="btn ghost small" id="signout" type="button">Sign out</button>
    </div>
    <form class="stack" id="upload">
      <label>Photograph<input type="file" name="file" accept="image/*" required></label>
      <img class="preview" id="preview" alt="" hidden>
      <label>Title<input type="text" name="title" maxlength="120" required></label>
      <label>Description<textarea name="description"></textarea></label>
      <div class="row">
        <label>Category
          <select name="category" required>
            ${CATEGORIES.map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
          </select>
        </label>
        <label>Date captured<input type="date" name="captured_on" value="${today()}" required></label>
      </div>
      <label>Location (optional)<input type="text" name="location" maxlength="120"></label>
      <label class="check"><input type="checkbox" name="featured"> Feature on the homepage</label>
      <button class="btn" type="submit">Publish</button>
    </form>
    <h2>Published photographs</h2>
    <ul class="manage" id="manage"></ul>`;

  const form = document.querySelector('#upload');
  const preview = document.querySelector('#preview');

  form.file.addEventListener('change', () => {
    const file = form.file.files[0];
    if (!file) { preview.hidden = true; return; }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    if (file.lastModified) form.captured_on.value = new Date(file.lastModified).toLocaleDateString('en-CA');
  });

  form.addEventListener('submit', publish);
  document.querySelector('#signout').addEventListener('click', () => supabase.auth.signOut());
  document.querySelector('#manage').addEventListener('click', manage);
  loadList();
}

/* Publish */
async function publish(e) {
  e.preventDefault();
  const form = e.target;
  const file = form.file.files[0];
  if (!file) return say('Choose a photograph first.');

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Publishing…';
  const uploaded = [];
  const bucket = supabase.storage.from('photos');

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

    const f = new FormData(form);
    const { error } = await supabase.from('photos').insert({
      title: f.get('title').trim(),
      description: f.get('description').trim() || null,
      category: f.get('category'),
      captured_on: f.get('captured_on'),
      location: f.get('location').trim() || null,
      image_path: fullPath,
      thumb_path: thumbPath,
      image_url: bucket.getPublicUrl(fullPath).data.publicUrl,
      thumb_url: bucket.getPublicUrl(thumbPath).data.publicUrl,
      width: full.w,
      height: full.h,
      featured: form.featured.checked,
    });
    if (error) throw error;

    form.reset();
    form.captured_on.value = today();
    document.querySelector('#preview').hidden = true;
    say('Published.');
    loadList();
  } catch (err) {
    if (uploaded.length) await bucket.remove(uploaded);
    say(`Could not publish: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publish';
  }
}

/* Manage existing photographs */
let items = [];

async function loadList() {
  const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
  const ul = document.querySelector('#manage');
  if (error) { ul.innerHTML = '<li>The list could not be loaded. Refresh the page.</li>'; return; }
  items = data;
  if (!items.length) { ul.innerHTML = '<li class="meta">Nothing published yet.</li>'; return; }
  ul.innerHTML = items.map((p) => `
    <li data-id="${p.id}">
      <img src="${esc(p.thumb_url)}" alt="">
      <div>
        <strong>${esc(p.title)}</strong>
        <div class="meta">${category(p.category)?.label ?? ''}, ${formatDate(p.captured_on)}${p.featured ? ', featured' : ''}</div>
        <div class="actions">
          <button class="btn ghost small" data-act="feature" type="button">${p.featured ? 'Remove from homepage' : 'Feature on homepage'}</button>
          <button class="btn ghost small" data-act="delete" type="button">Delete</button>
        </div>
      </div>
    </li>`).join('');
}

async function manage(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const p = items.find((x) => x.id === btn.closest('li').dataset.id);
  if (!p) return;

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
