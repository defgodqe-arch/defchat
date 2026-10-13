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
create or replace function private.is_dm_member(target_conversation_id uuid,target_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public,private as $ select target_user_id=(select auth.uid()) and exists(select 1 from public.dm_members m where m.conversation_id=target_conversation_id and m.user_id=(select auth.uid())); $;
revoke all on function private.is_dm_member(uuid,uuid) from public,anon; grant execute on function private.is_dm_member(uuid,uuid) to authenticated;
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
create policy "DM members can view conversations" on public.dm_conversations for select to authenticated using(private.is_dm_member(id,(select auth.uid())));
drop policy if exists "Signed-in users can create conversations" on public.dm_conversations;
create policy "Signed-in users can create conversations" on public.dm_conversations for insert to authenticated with check((select auth.uid()) is not null);
drop policy if exists "Users can view DM memberships in their conversations" on public.dm_members;
create policy "Users can view DM memberships in their conversations" on public.dm_members for select to authenticated using(user_id=(select auth.uid()) or private.is_dm_member(conversation_id,(select auth.uid())));
drop policy if exists "Conversation members can add members" on public.dm_members;
create policy "Conversation members can add members" on public.dm_members for insert to authenticated with check((user_id=(select auth.uid()) and not exists(select 1 from public.dm_members existing where existing.conversation_id=dm_members.conversation_id)) or private.is_dm_member(conversation_id,(select auth.uid())));
drop policy if exists "Users can leave DM conversations" on public.dm_members;
create policy "Users can leave DM conversations" on public.dm_members for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists "DM members can read messages" on public.dm_messages;
create policy "DM members can read messages" on public.dm_messages for select to authenticated using(private.is_dm_member(conversation_id,(select auth.uid())));
drop policy if exists "DM members can send their own messages" on public.dm_messages;
create policy "DM members can send their own messages" on public.dm_messages for insert to authenticated with check(user_id=(select auth.uid()) and private.is_dm_member(conversation_id,(select auth.uid())));
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


-- Free animated profile pictures and banners.
alter table public.profiles add column if not exists banner_url text;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-media','profile-media',true,8388608,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif'];
drop policy if exists "Public profile media read" on storage.objects;
create policy "Public profile media read" on storage.objects for select to public using (bucket_id='profile-media');
drop policy if exists "Users upload own profile media" on storage.objects;
create policy "Users upload own profile media" on storage.objects for insert to authenticated with check (bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users update own profile media" on storage.objects;
create policy "Users update own profile media" on storage.objects for update to authenticated using (bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users delete own profile media" on storage.objects;
create policy "Users delete own profile media" on storage.objects for delete to authenticated using (bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);


-- Yapper-inspired features for defchat: bios, free custom emoji, media, friend requests,
-- group conversations, server invitations, roles, private channels, and voice signaling.
alter table public.profiles add column if not exists bio text not null default '' check(char_length(bio)<=190);
alter table public.profiles add column if not exists status text not null default 'online' check(status in('online','idle','dnd','invisible'));
alter table public.channels drop constraint if exists channels_type_check;
alter table public.channels add constraint channels_type_check check(type in('text','voice'));
alter table public.channels add column if not exists is_private boolean not null default false;
alter table public.channels add column if not exists topic text not null default '' check(char_length(topic)<=180);
alter table public.messages add column if not exists reply_to uuid references public.messages(id) on delete set null;
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;
alter table public.dm_messages add column if not exists reply_to uuid references public.dm_messages(id) on delete set null;
alter table public.dm_messages add column if not exists attachment_url text;
alter table public.dm_messages add column if not exists attachment_name text;
alter table public.dm_messages add column if not exists attachment_type text;

create table if not exists public.server_roles(
 id uuid primary key default gen_random_uuid(), server_id uuid not null references public.servers(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 40), color text not null default '#facc15',
 permissions jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(server_id,name), unique(id,server_id)
);
create table if not exists public.member_roles(
 server_id uuid not null references public.servers(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role_id uuid not null references public.server_roles(id) on delete cascade,
 primary key(server_id,user_id,role_id)
);
create table if not exists public.channel_role_access(
 channel_id uuid not null references public.channels(id) on delete cascade,
 role_id uuid not null references public.server_roles(id) on delete cascade,
 primary key(channel_id,role_id)
);
create table if not exists public.server_invites(
 id uuid primary key default gen_random_uuid(), server_id uuid not null references public.servers(id) on delete cascade,
 code text not null unique default encode(gen_random_bytes(8),'hex'),
 created_by uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz, max_uses integer, uses integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.custom_emojis(
 id uuid primary key default gen_random_uuid(), server_id uuid references public.servers(id) on delete cascade,
 name text not null check(name ~ '^[a-zA-Z0-9_]{2,32}$'), image_url text not null,
 uploaded_by uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 unique(server_id,name)
);
create table if not exists public.dm_settings(
 conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 muted boolean not null default false, last_read_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
create table if not exists public.user_blocks(
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table if not exists public.voice_signals(
 id bigint generated always as identity primary key,
 channel_id uuid not null references public.channels(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 signal jsonb not null, created_at timestamptz not null default now()
);
create index if not exists voice_signals_recipient_idx on public.voice_signals(recipient_id,created_at);

alter table public.server_roles enable row level security;
alter table public.member_roles enable row level security;
alter table public.channel_role_access enable row level security;
alter table public.server_invites enable row level security;
alter table public.custom_emojis enable row level security;
alter table public.dm_settings enable row level security;
alter table public.user_blocks enable row level security;
alter table public.voice_signals enable row level security;

grant select,insert,update,delete on public.server_roles,public.member_roles,public.channel_role_access,public.server_invites,public.custom_emojis,public.dm_settings,public.user_blocks,public.voice_signals to authenticated;
drop policy if exists "server roles visible to members" on public.server_roles;
create policy "server roles visible to members" on public.server_roles for select to authenticated using(private.is_server_member(server_id,auth.uid()));
drop policy if exists "admins manage server roles" on public.server_roles;
create policy "admins manage server roles" on public.server_roles for all to authenticated using(exists(select 1 from public.server_members sm where sm.server_id=server_roles.server_id and sm.user_id=auth.uid() and sm.role in('owner','admin'))) with check(exists(select 1 from public.server_members sm where sm.server_id=server_roles.server_id and sm.user_id=auth.uid() and sm.role in('owner','admin')));
drop policy if exists "members view role assignments" on public.member_roles;
create policy "members view role assignments" on public.member_roles for select to authenticated using(private.is_server_member(server_id,auth.uid()));
drop policy if exists "admins manage role assignments" on public.member_roles;
create policy "admins manage role assignments" on public.member_roles for all to authenticated using(exists(select 1 from public.server_members sm where sm.server_id=member_roles.server_id and sm.user_id=auth.uid() and sm.role in('owner','admin'))) with check(exists(select 1 from public.server_members sm where sm.server_id=member_roles.server_id and sm.user_id=auth.uid() and sm.role in('owner','admin')));
drop policy if exists "channel role access visible to members" on public.channel_role_access;
create policy "channel role access visible to members" on public.channel_role_access for select to authenticated using(exists(select 1 from public.channels c where c.id=channel_id and private.is_server_member(c.server_id,auth.uid())));
drop policy if exists "admins manage channel access" on public.channel_role_access;
create policy "admins manage channel access" on public.channel_role_access for all to authenticated using(exists(select 1 from public.channels c join public.server_members sm on sm.server_id=c.server_id where c.id=channel_role_access.channel_id and sm.user_id=auth.uid() and sm.role in('owner','admin'))) with check(exists(select 1 from public.channels c join public.server_members sm on sm.server_id=c.server_id where c.id=channel_role_access.channel_id and sm.user_id=auth.uid() and sm.role in('owner','admin')));
drop policy if exists "members can see invites" on public.server_invites;
create policy "members can see invites" on public.server_invites for select to authenticated using(private.is_server_member(server_id,auth.uid()));
drop policy if exists "members create invites" on public.server_invites;
create policy "members create invites" on public.server_invites for insert to authenticated with check(created_by=auth.uid() and private.is_server_member(server_id,auth.uid()));
drop policy if exists "members see custom emojis" on public.custom_emojis;
create policy "members see custom emojis" on public.custom_emojis for select to authenticated using(server_id is null or private.is_server_member(server_id,auth.uid()));
drop policy if exists "members add custom emojis" on public.custom_emojis;
create policy "members add custom emojis" on public.custom_emojis for insert to authenticated with check(uploaded_by=auth.uid() and (server_id is null or private.is_server_member(server_id,auth.uid())));
drop policy if exists "uploader deletes custom emojis" on public.custom_emojis;
create policy "uploader deletes custom emojis" on public.custom_emojis for delete to authenticated using(uploaded_by=auth.uid());
drop policy if exists "users manage own dm settings" on public.dm_settings;
create policy "users manage own dm settings" on public.dm_settings for all to authenticated using(user_id=auth.uid() and private.is_dm_member(conversation_id,auth.uid())) with check(user_id=auth.uid() and private.is_dm_member(conversation_id,auth.uid()));
drop policy if exists "users manage their blocks" on public.user_blocks;
create policy "users manage their blocks" on public.user_blocks for all to authenticated using(blocker_id=auth.uid()) with check(blocker_id=auth.uid());
drop policy if exists "voice signals sender insert" on public.voice_signals;
create policy "voice signals sender insert" on public.voice_signals for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.channels c where c.id=channel_id and c.type='voice' and private.is_server_member(c.server_id,auth.uid())) and exists(select 1 from public.server_members sm where sm.server_id=(select c.server_id from public.channels c where c.id=channel_id) and sm.user_id=recipient_id));
drop policy if exists "voice signals recipient read" on public.voice_signals;
create policy "voice signals recipient read" on public.voice_signals for select to authenticated using(recipient_id=auth.uid());
drop policy if exists "voice signals recipient delete" on public.voice_signals;
create policy "voice signals recipient delete" on public.voice_signals for delete to authenticated using(recipient_id=auth.uid());

-- Realtime updates for DMs, reactions, and voice signaling.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='voice_signals') then alter publication supabase_realtime add table public.voice_signals; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='message_reactions') then alter publication supabase_realtime add table public.message_reactions; end if;
end $$;

-- Optional public bucket for chat image and emoji uploads (GIF stays animated).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-media','chat-media',true,12582912,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=12582912,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif'];
drop policy if exists "chat media public read" on storage.objects;
create policy "chat media public read" on storage.objects for select to public using(bucket_id='chat-media');
drop policy if exists "users upload chat media" on storage.objects;
create policy "users upload chat media" on storage.objects for insert to authenticated with check(bucket_id='chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "users delete chat media" on storage.objects;
create policy "users delete chat media" on storage.objects for delete to authenticated using(bucket_id='chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Enable author-only message editing.
grant update on public.messages to authenticated;
drop policy if exists "message authors can update" on public.messages;
create policy "message authors can update" on public.messages for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
