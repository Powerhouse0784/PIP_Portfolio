create table if not exists public.guestbook_entries (
  id bigint generated always as identity primary key,
  display_name varchar(24) not null,
  message varchar(240) not null,
  created_at timestamptz not null default now(),
  is_approved boolean not null default true,
  stars integer not null default 0,
  hearts integer not null default 0,
  reviewed_at timestamptz
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

-- v14: reactions + moderation. Already have a v13 database? Run supabase/migration-v14.sql instead.
create table if not exists public.guestbook_reactions (
  entry_id bigint not null references public.guestbook_entries(id) on delete cascade,
  visitor text not null,
  kind text not null check (kind in ('star', 'heart')),
  created_at timestamptz not null default now(),
  primary key (entry_id, visitor, kind)
);
alter table public.guestbook_reactions enable row level security;

create or replace function public.react_guestbook(p_entry bigint, p_visitor text, p_kind text)
returns table(out_stars integer, out_hearts integer, out_added boolean)
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_kind not in ('star', 'heart') then raise exception 'bad kind'; end if;
  insert into public.guestbook_reactions(entry_id, visitor, kind)
    select p_entry, p_visitor, p_kind
    where exists (select 1 from public.guestbook_entries g where g.id = p_entry and g.is_approved)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    update public.guestbook_entries g
       set stars = g.stars + (p_kind = 'star')::int,
           hearts = g.hearts + (p_kind = 'heart')::int
     where g.id = p_entry;
  end if;
  return query select g.stars, g.hearts, (n > 0) from public.guestbook_entries g where g.id = p_entry;
end; $$;
revoke all on function public.react_guestbook(bigint, text, text) from public;
revoke all on function public.react_guestbook(bigint, text, text) from anon, authenticated;
