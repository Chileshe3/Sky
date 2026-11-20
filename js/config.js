// Supabase connection. The publishable key is meant to be public;
// row-level security protects your data.
export const SUPABASE_URL = 'https://goqheizxqnicequxmtut.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_5oZkoVc5-GO7gECs5A2ZpQ_9AP18xmN';

export const SITE = {
  name: 'Open Sky',
  tagline: 'Skies, light and landscapes, photographed as I find them.',
  intro:
    'Sunsets, clouds, moons and quiet landscapes, photographed as I find them and published when they are ready.',
  // Add your contact email. It then appears in the footer and on the privacy and terms pages.
  email: '',
};

// Longest edge, in pixels, of the images the admin page uploads.
export const FULL_MAX = 2560;
export const THUMB_MAX = 900;

// How many photographs appear at first, and each time "Load more" is tapped.
export const PAGE_SIZE = 24;
// How many recent photographs appear on the homepage.
export const HOME_COUNT = 12;