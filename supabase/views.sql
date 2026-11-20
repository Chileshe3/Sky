-- Page-view counters. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Stores only a total per page per day. No IP addresses, no cookies, nothing personal.

create table if not exists public.page_views (
  day   date not null default (now() at time zone 'Africa/Lusaka')::date,
  key   text not null,   -- 'home', 'gallery' or 'photo:<photo id>'
  views int  not null default 0,
  primary key (day, key)
);

alter table public.page_views enable row level security;

-- Only you (signed in) can read the totals.
drop policy if exists "Owner can read views" on public.page_views;
create policy "Owner can read views" on public.page_views
  for select to authenticated using (true);

-- Visitors can only add one to a known page, through this function.
create or replace function public.record_view(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key !~ '^(home|gallery|photo:[0-9a-f-]{36})$' then
    return;
  end if;
  if p_key like 'photo:%'
     and not exists (select 1 from public.photos where id::text = substr(p_key, 7)) then
    return;
  end if;
  insert into public.page_views (day, key, views)
  values ((now() at time zone 'Africa/Lusaka')::date, p_key, 1)
  on conflict (day, key) do update set views = public.page_views.views + 1;
end;
$$;

revoke all on function public.record_view(text) from public;
grant execute on function public.record_view(text) to anon, authenticated;
grant select on public.page_views to authenticated;
