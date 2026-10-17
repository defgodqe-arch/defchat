-- Background Web Push notifications for defchat.
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.push_config (
  singleton boolean primary key default true check (singleton),
  vapid_public_key text not null,
  vapid_private_key text not null,
  webhook_secret text not null,
  updated_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from public, anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
create policy "Users manage their own push subscriptions"
on public.push_subscriptions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function private.dispatch_defchat_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook_secret text;
begin
  select c.webhook_secret into hook_secret
  from public.push_config c
  where c.singleton = true;
  if hook_secret is null then return new; end if;

  perform net.http_post(
    url := 'https://jklhnhnxyzqjvmqgfpjs.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-defchat-hook-secret', hook_secret
    ),
    body := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new)),
    timeout_milliseconds := 3000
  );
  return new;
end;
$$;
revoke all on function private.dispatch_defchat_push() from public, anon, authenticated;

drop trigger if exists messages_dispatch_defchat_push on public.messages;
create trigger messages_dispatch_defchat_push after insert on public.messages
for each row execute function private.dispatch_defchat_push();

drop trigger if exists dm_messages_dispatch_defchat_push on public.dm_messages;
create trigger dm_messages_dispatch_defchat_push after insert on public.dm_messages
for each row execute function private.dispatch_defchat_push();

drop trigger if exists friend_requests_dispatch_defchat_push on public.friend_requests;
create trigger friend_requests_dispatch_defchat_push after insert on public.friend_requests
for each row execute function private.dispatch_defchat_push();
