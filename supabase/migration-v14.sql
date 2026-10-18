-- Run once in the Supabase SQL Editor (safe to re-run). Adds: reactions, moderation review stamp.
alter table public.guestbook_entries add column if not exists stars integer not null default 0;
alter table public.guestbook_entries add column if not exists hearts integer not null default 0;
alter table public.guestbook_entries add column if not exists reviewed_at timestamptz;

-- One reaction of each kind per visitor per note (visitor = salted hash of the IP, never the raw IP).
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
