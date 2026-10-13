-- defgodqe Supabase schema. Run this entire file in SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text not null check(char_length(username) between 2 and 24),avatar_url text,created_at timestamptz not null default now());
create unique index if not exists profiles_username_lower_idx on public.profiles(lower(username));
create table if not exists public.servers(id uuid primary key default gen_random_uuid(),name text not null check(char_length(name) between 1 and 60),owner_id uuid not null references auth.users(id) on delete cascade,icon_url text,created_at timestamptz not null default now());
create table if not exists public.server_members(server_id uuid not null references public.servers(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null default 'member' check(role in('owner','admin','member')),joined_at timestamptz not null default now(),primary key(server_id,user_id));
create table if not exists public.channels(id uuid primary key default gen_random_uuid(),server_id uuid not null references public.servers(id) on delete cascade,name text not null check(char_length(name) between 1 and 40),type text not null default 'text' check(type='text'),created_at timestamptz not null default now(),unique(server_id,name));
create table if not exists public.messages(id uuid primary key default gen_random_uuid(),channel_id uuid not null references public.channels(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,content text not null check(char_length(content) between 1 and 4000),created_at timestamptz not null default now());
create index if not exists messages_channel_created_idx on public.messages(channel_id,created_at desc);
create schema if not exists private; revoke all on schema private from public, anon; grant usage on schema private to authenticated;
create or replace function private.is_server_member(target_server_id uuid,target_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public,private as $ select target_user_id=(select auth.uid()) and exists(select 1 from public.server_members where server_id=target_server_id and user_id=(select auth.uid())); $;
revoke all on function private.is_server_member(uuid,uuid) from public,anon; grant execute on function private.is_server_member(uuid,uuid) to authenticated;
alter table public.profiles enable row level security; alter table public.servers enable row level security; alter table public.server_members enable row level security; alter table public.channels enable row level security; alter table public.messages enable row level security;
create policy "profiles read" on public.profiles for select to authenticated using(true);
create policy "profile insert own" on public.profiles for insert to authenticated with check(id=auth.uid());
create policy "profile update own" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "servers read member" on public.servers for select to authenticated using(private.is_server_member(id,auth.uid()));
create policy "servers owner update" on public.servers for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "members read" on public.server_members for select to authenticated using(user_id=auth.uid() or private.is_server_member(server_id,auth.uid()));
create policy "channels read member" on public.channels for select to authenticated using(private.is_server_member(server_id,auth.uid()));
create policy "channels create admins" on public.channels for insert to authenticated with check(exists(select 1 from public.server_members sm where sm.server_id=channels.server_id and sm.user_id=auth.uid() and sm.role in('owner','admin')));
create policy "messages read member" on public.messages for select to authenticated using(exists(select 1 from public.channels c where c.id=messages.channel_id and private.is_server_member(c.server_id,auth.uid())));
create policy "messages send member" on public.messages for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.channels c where c.id=messages.channel_id and private.is_server_member(c.server_id,auth.uid())));
create policy "authors delete messages" on public.messages for delete to authenticated using(user_id=auth.uid());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ declare n text; begin n:=coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''),split_part(new.email,'@',1)); insert into public.profiles(id,username) values(new.id,left(n,24)) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function private.create_server_with_defaults(server_name text) returns uuid language plpgsql security definer set search_path=public,private as $ declare sid uuid; begin if (select auth.uid()) is null then raise exception 'Sign in first'; end if; if char_length(trim(server_name))<1 or char_length(trim(server_name))>60 then raise exception 'Name must be 1-60 characters'; end if; insert into public.servers(name,owner_id) values(trim(server_name),(select auth.uid())) returning id into sid; insert into public.server_members(server_id,user_id,role) values(sid,(select auth.uid()),'owner'); insert into public.channels(server_id,name) values(sid,'welcome'); return sid; end; $;
revoke all on function private.create_server_with_defaults(text) from public,anon; grant execute on function private.create_server_with_defaults(text) to authenticated;
create or replace function public.create_server_with_defaults(server_name text) returns uuid language sql security invoker set search_path=public,private as $ select private.create_server_with_defaults(server_name); $;
revoke all on function public.create_server_with_defaults(text) from public,anon; grant execute on function public.create_server_with_defaults(text) to authenticated;
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; when undefined_object then null; end $$;
grant usage on schema public to authenticated; grant select,insert,update on public.profiles to authenticated; grant select,update on public.servers to authenticated; grant select on public.server_members to authenticated; grant select,insert on public.channels to authenticated; grant select,insert,delete on public.messages to authenticated;


-- Friends, direct messages, reactions, and message edits.
alter table public.messages add column if not exists edited_at timestamptz;
create table if not exists public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','accepted','declined','blocked')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(sender_id<>receiver_id), unique(sender_id,receiver_id)
);
create index if not exists friend_requests_receiver_status_idx on public.friend_requests(receiver_id,status);
create table if not exists public.dm_conversations(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now());
create table if not exists public.dm_members(conversation_id uuid not null references public.dm_conversations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,joined_at timestamptz not null default now(),primary key(conversation_id,user_id));
create index if not exists dm_members_user_idx on public.dm_members(user_id,conversation_id);
create table if not exists public.dm_messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.dm_conversations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,content text not null check(char_length(content) between 1 and 4000),created_at timestamptz not null default now(),edited_at timestamptz);
create index if not exists dm_messages_conversation_created_idx on public.dm_messages(conversation_id,created_at);
create index if not exists dm_messages_user_id_idx on public.dm_messages(user_id);
create table if not exists public.message_reactions(message_id uuid not null references public.messages(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,emoji text not null check(char_length(emoji) between 1 and 16),created_at timestamptz not null default now(),primary key(message_id,user_id,emoji));
create index if not exists message_reactions_user_id_idx on public.message_reactions(user_id);
create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists servers_owner_id_idx on public.servers(owner_id);
alter table public.friend_requests enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_members enable row level security;
alter table public.dm_messages enable row level security;
alter table public.message_reactions enable row level security;
grant select,insert,update,delete on public.friend_requests to authenticated;
grant select,insert,delete on public.dm_conversations to authenticated;
grant select,insert,delete on public.dm_members to authenticated;
grant select,insert,update,delete on public.dm_messages to authenticated;
grant select,insert,delete on public.message_reactions to authenticated;
drop policy if exists "Users can view their friend requests" on public.friend_requests;
create policy "Users can view their friend requests" on public.friend_requests for select to authenticated using(sender_id=(select auth.uid()) or receiver_id=(select auth.uid()));
drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests" on public.friend_requests for insert to authenticated with check(sender_id=(select auth.uid()) and status='pending');
drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
create policy "Recipients can respond to friend requests" on public.friend_requests for update to authenticated using(receiver_id=(select auth.uid())) with check(receiver_id=(select auth.uid()) and status in('accepted','declined','blocked'));
drop policy if exists "Senders can cancel pending requests" on public.friend_requests;
create policy "Senders can cancel pending requests" on public.friend_requests for delete to authenticated using(sender_id=(select auth.uid()) and status='pending');
drop policy if exists "DM members can view conversations" on public.dm_conversations;
create policy "DM members can view conversations" on public.dm_conversations for select to authenticated using(exists(select 1 from public.dm_members m where m.conversation_id=id and m.user_id=(select auth.uid())));
drop policy if exists "Signed-in users can create conversations" on public.dm_conversations;
create policy "Signed-in users can create conversations" on public.dm_conversations for insert to authenticated with check((select auth.uid()) is not null);
drop policy if exists "Users can view DM memberships in their conversations" on public.dm_members;
create policy "Users can view DM memberships in their conversations" on public.dm_members for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.dm_members mine where mine.conversation_id=dm_members.conversation_id and mine.user_id=(select auth.uid())));
drop policy if exists "Conversation members can add members" on public.dm_members;
create policy "Conversation members can add members" on public.dm_members for insert to authenticated with check((user_id=(select auth.uid()) and not exists(select 1 from public.dm_members existing where existing.conversation_id=dm_members.conversation_id)) or exists(select 1 from public.dm_members mine where mine.conversation_id=dm_members.conversation_id and mine.user_id=(select auth.uid())));
drop policy if exists "Users can leave DM conversations" on public.dm_members;
create policy "Users can leave DM conversations" on public.dm_members for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists "DM members can read messages" on public.dm_messages;
create policy "DM members can read messages" on public.dm_messages for select to authenticated using(exists(select 1 from public.dm_members m where m.conversation_id=dm_messages.conversation_id and m.user_id=(select auth.uid())));
drop policy if exists "DM members can send their own messages" on public.dm_messages;
create policy "DM members can send their own messages" on public.dm_messages for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.dm_members m where m.conversation_id=dm_messages.conversation_id and m.user_id=(select auth.uid())));
drop policy if exists "Authors can edit their own DM messages" on public.dm_messages;
create policy "Authors can edit their own DM messages" on public.dm_messages for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Authors can delete their own DM messages" on public.dm_messages;
create policy "Authors can delete their own DM messages" on public.dm_messages for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Server members can view message reactions" on public.message_reactions;
create policy "Server members can view message reactions" on public.message_reactions for select to authenticated using(exists(select 1 from public.messages msg join public.channels c on c.id=msg.channel_id where msg.id=message_id and private.is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "Server members can react to messages" on public.message_reactions;
create policy "Server members can react to messages" on public.message_reactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.messages msg join public.channels c on c.id=msg.channel_id where msg.id=message_id and private.is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "Users can remove their reactions" on public.message_reactions;
create policy "Users can remove their reactions" on public.message_reactions for delete to authenticated using(user_id=(select auth.uid()));
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dm_messages') then alter publication supabase_realtime add table public.dm_messages; end if; end $$;
