-- Allow each user to set a personal chat background in Customize your profile.
alter table public.profiles add column if not exists chat_background_url text;
