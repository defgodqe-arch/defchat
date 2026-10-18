-- Discord-style single-answer polls for Cinder/defchat.
create table if not exists public.poll_votes (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index between 0 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists poll_votes_message_id_idx on public.poll_votes(message_id);
alter table public.poll_votes enable row level security;
grant select, insert, update, delete on public.poll_votes to authenticated;
drop policy if exists "Members can view channel poll votes" on public.poll_votes;
create policy "Members can view channel poll votes" on public.poll_votes for select to authenticated using (
  exists (select 1 from public.messages m join public.channels c on c.id=m.channel_id where m.id=message_id and left(m.content,16)='__CINDER_POLL__:' and private.is_server_member(c.server_id,auth.uid()))
);
drop policy if exists "Members can vote in open channel polls" on public.poll_votes;
create policy "Members can vote in open channel polls" on public.poll_votes for insert to authenticated with check (
  user_id=auth.uid() and exists (
    select 1 from public.messages m join public.channels c on c.id=m.channel_id
    where m.id=message_id and left(m.content,16)='__CINDER_POLL__:'
      and (substring(m.content from 17)::jsonb->>'expiresAt')::timestamptz > now()
      and private.is_server_member(c.server_id,auth.uid())
      and option_index >= 0 and option_index < jsonb_array_length(substring(m.content from 17)::jsonb->'options')
  )
);
drop policy if exists "Members can change their vote in open channel polls" on public.poll_votes;
create policy "Members can change their vote in open channel polls" on public.poll_votes for update to authenticated using (
  user_id=auth.uid() and exists (
    select 1 from public.messages m join public.channels c on c.id=m.channel_id
    where m.id=message_id and left(m.content,16)='__CINDER_POLL__:'
      and (substring(m.content from 17)::jsonb->>'expiresAt')::timestamptz > now()
      and private.is_server_member(c.server_id,auth.uid())
      and option_index >= 0 and option_index < jsonb_array_length(substring(m.content from 17)::jsonb->'options')
  )
) with check (user_id=auth.uid());
drop policy if exists "Users can remove their poll vote" on public.poll_votes;
create policy "Users can remove their poll vote" on public.poll_votes for delete to authenticated using (user_id=auth.uid());
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='poll_votes') then
    alter publication supabase_realtime add table public.poll_votes;
  end if;
end $$;
