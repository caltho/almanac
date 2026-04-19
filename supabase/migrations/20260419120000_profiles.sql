-- profiles
-- One row per auth.users. Created automatically on signup via handle_new_user trigger.
-- Email is NOT mirrored; use find_user_by_email() for invite lookups.

create extension if not exists "pgcrypto";

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text,
	avatar_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- updated_at bumper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, display_name)
	values (
		new.id,
		coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
	)
	on conflict (id) do nothing;
	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for any already-existing auth users (idempotent).
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;

-- Any authenticated user can read any profile (display_name, avatar_url are near-public).
-- Email stays in auth.users and is only looked up via find_user_by_email().
create policy "profiles_read_all_authenticated"
	on public.profiles
	for select
	to authenticated
	using (true);

-- Only the owner can update their own profile row.
create policy "profiles_update_own"
	on public.profiles
	for update
	to authenticated
	using (id = auth.uid())
	with check (id = auth.uid());

-- Invite-by-email lookup. Returns the profile id for an exact-match email,
-- or null if no user exists. Runs as definer so callers don't need auth.users read.
create or replace function public.find_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
	select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.find_user_by_email(text) from public;
grant execute on function public.find_user_by_email(text) to authenticated;
