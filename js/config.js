// Fill in the two Supabase values (Project Settings > API).
// The anon key is meant to be public; row-level security protects your data.
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

export const SITE = {
  name: 'Open Sky',
  intro:
    'Sunsets, clouds, moons and quiet landscapes, photographed as I find them and published when they are ready.',
};

// Longest edge, in pixels, of the images the admin page uploads.
export const FULL_MAX = 2560;
export const THUMB_MAX = 900;
