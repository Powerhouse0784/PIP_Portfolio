create table if not exists public.guestbook_entries (
  id bigint generated always as identity primary key,
  display_name varchar(24) not null,
  message varchar(240) not null,
  created_at timestamptz not null default now(),
  is_approved boolean not null default true
);
create index if not exists guestbook_created_idx on public.guestbook_entries (created_at desc);
create table if not exists public.site_stats (key text primary key, count bigint not null default 0);
insert into public.site_stats(key, count) values ('visits', 0) on conflict (key) do nothing;
alter table public.guestbook_entries enable row level security;
alter table public.site_stats enable row level security;

create or replace function public.increment_site_stat(stat_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_count bigint;
begin
  insert into public.site_stats(key, count) values (stat_key, 1)
  on conflict (key) do update set count = public.site_stats.count + 1
  returning count into new_count;
  return new_count;
end; $$;
revoke all on function public.increment_site_stat(text) from public;
revoke all on function public.increment_site_stat(text) from anon, authenticated;
