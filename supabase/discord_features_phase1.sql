-- defchat Phase 1 messaging/community feature foundation.
-- Run this in Supabase SQL Editor after supabase/schema.sql.
begin;

-- Message threads. Thread replies use the existing messages table.
alter table public.messages add column if not exists thread_id uuid;
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  parent_message_id uuid not null references public.messages(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 100),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(parent_message_id)
);
alter table public.messages drop constraint if exists messages_thread_id_fkey;
alter table public.messages add constraint messages_thread_id_fkey
  foreign key (thread_id) references public.message_threads(id) on delete cascade;
create index if not exists messages_thread_created_idx on public.messages(thread_id, created_at);
alter table public.message_threads enable row level security;
drop policy if exists "thread members read" on public.message_threads;
create policy "thread members read" on public.message_threads for select to authenticated
using (exists (select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "thread members create" on public.message_threads;
create policy "thread members create" on public.message_threads for insert to authenticated
with check (created_by=auth.uid() and exists (select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));

-- Pinned messages per channel.
create table if not exists public.message_pins (
  channel_id uuid not null references public.channels(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(channel_id,message_id)
);
alter table public.message_pins enable row level security;
drop policy if exists "channel members read pins" on public.message_pins;
create policy "channel members read pins" on public.message_pins for select to authenticated
using (exists (select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "channel members pin messages" on public.message_pins;
create policy "channel members pin messages" on public.message_pins for insert to authenticated
with check (pinned_by=auth.uid() and exists (select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "pinner or channel admin removes pin" on public.message_pins;
create policy "pinner or channel admin removes pin" on public.message_pins for delete to authenticated
using (pinned_by=auth.uid() or exists (select 1 from public.channels c join public.server_members sm on sm.server_id=c.server_id where c.id=channel_id and sm.user_id=auth.uid() and sm.role in ('owner','admin')));

-- Polls and votes.
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 300),
  options jsonb not null check (jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 10),
  multiple_choice boolean not null default false,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check(option_index>=0),
  created_at timestamptz not null default now(),
  primary key(poll_id,user_id,option_index)
);
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
drop policy if exists "channel members read polls" on public.polls;
create policy "channel members read polls" on public.polls for select to authenticated
using (exists (select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "channel members create polls" on public.polls;
create policy "channel members create polls" on public.polls for insert to authenticated
with check (created_by=auth.uid() and exists (select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "channel members read poll votes" on public.poll_votes;
create policy "channel members read poll votes" on public.poll_votes for select to authenticated
using (exists (select 1 from public.polls p join public.channels c on c.id=p.channel_id where p.id=poll_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "members vote in polls" on public.poll_votes;
create policy "members vote in polls" on public.poll_votes for insert to authenticated
with check (user_id=auth.uid() and exists (select 1 from public.polls p join public.channels c on c.id=p.channel_id where p.id=poll_id and private.is_server_member(c.server_id,auth.uid()) and (p.ends_at is null or p.ends_at>now()) and option_index<jsonb_array_length(p.options)));
drop policy if exists "users remove own poll votes" on public.poll_votes;
create policy "users remove own poll votes" on public.poll_votes for delete to authenticated using (user_id=auth.uid());

-- Scheduled community events.
create table if not exists public.server_events (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 100),
  description text not null default '' check(char_length(description)<=2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '' check(char_length(location)<=200),
  created_at timestamptz not null default now(),
  check(ends_at is null or ends_at>=starts_at)
);
create table if not exists public.server_event_rsvps (
  event_id uuid not null references public.server_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null default 'going' check(response in ('going','interested','not_going')),
  updated_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
alter table public.server_events enable row level security;
alter table public.server_event_rsvps enable row level security;
drop policy if exists "server members read events" on public.server_events;
create policy "server members read events" on public.server_events for select to authenticated using(private.is_server_member(server_id,auth.uid()));
drop policy if exists "server members create events" on public.server_events;
create policy "server members create events" on public.server_events for insert to authenticated with check(created_by=auth.uid() and private.is_server_member(server_id,auth.uid()));
drop policy if exists "event creator or server owner deletes events" on public.server_events;
create policy "event creator or server owner deletes events" on public.server_events for delete to authenticated using(created_by=auth.uid() or exists(select 1 from public.servers s where s.id=server_id and s.owner_id=auth.uid()));
drop policy if exists "members read event rsvps" on public.server_event_rsvps;
create policy "members read event rsvps" on public.server_event_rsvps for select to authenticated using(exists(select 1 from public.server_events e where e.id=event_id and private.is_server_member(e.server_id,auth.uid())));
drop policy if exists "members manage own event rsvp" on public.server_event_rsvps;
create policy "members manage own event rsvp" on public.server_event_rsvps for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.server_events e where e.id=event_id and private.is_server_member(e.server_id,auth.uid())));
drop policy if exists "users update own event rsvp" on public.server_event_rsvps;
create policy "users update own event rsvp" on public.server_event_rsvps for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "users delete own event rsvp" on public.server_event_rsvps;
create policy "users delete own event rsvp" on public.server_event_rsvps for delete to authenticated using(user_id=auth.uid());

-- Grants are limited to signed-in users; RLS above enforces membership.
grant select,insert on public.message_threads to authenticated;
grant select,insert,delete on public.message_pins to authenticated;
grant select,insert on public.polls to authenticated;
grant select,insert,delete on public.poll_votes to authenticated;
grant select,insert,delete on public.server_events to authenticated;
grant select,insert,update,delete on public.server_event_rsvps to authenticated;
grant select,insert,update on public.messages to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.message_threads;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.poll_votes;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.server_events;
exception when duplicate_object then null; when undefined_object then null;
end $$;

commit;
