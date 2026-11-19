-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists "pgcrypto";

create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  category      text not null check (category in
                  ('sunsets','clouds','landscapes','night-skies','nature','astronomy')),
  captured_on   date not null default current_date,
  location      text,
  image_path    text not null,
  thumb_path    text not null,
  image_url     text not null,
  thumb_url     text not null,
  width         int,
  height        int,
  featured      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists photos_captured_idx
  on public.photos (captured_on desc, created_at desc);

alter table public.photos enable row level security;

-- Everyone can read. Only a signed-in user (you) can change anything.
create policy "Anyone can view photos" on public.photos
  for select using (true);
create policy "Owner can add photos" on public.photos
  for insert to authenticated with check (true);
create policy "Owner can edit photos" on public.photos
  for update to authenticated using (true) with check (true);
create policy "Owner can delete photos" on public.photos
  for delete to authenticated using (true);

-- Public storage bucket for the image files.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "Owner can upload files" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');
create policy "Owner can delete files" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');
