-- Moon Tracker — Supabase SQL Schema
-- Run this in the Supabase SQL Editor to set up your database.

-- ============================================================
-- Profiles
-- Auto-created for every authenticated user via trigger.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: auto-insert profile on new user sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- Saved Locations
-- ============================================================
create table if not exists public.saved_locations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

alter table public.saved_locations enable row level security;

create policy "Users can read own locations"
  on public.saved_locations for select
  using (auth.uid() = user_id);

create policy "Users can insert own locations"
  on public.saved_locations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own locations"
  on public.saved_locations for update
  using (auth.uid() = user_id);

create policy "Users can delete own locations"
  on public.saved_locations for delete
  using (auth.uid() = user_id);


-- ============================================================
-- App Preferences
-- ============================================================
create table if not exists public.app_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  use_24h             boolean not null default false,
  use_cardinal        boolean not null default true,
  default_location_id uuid references public.saved_locations(id) on delete set null,
  updated_at          timestamptz not null default now()
);

alter table public.app_preferences enable row level security;

create policy "Users can read own preferences"
  on public.app_preferences for select
  using (auth.uid() = user_id);

create policy "Users can upsert own preferences"
  on public.app_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.app_preferences for update
  using (auth.uid() = user_id);


-- ============================================================
-- Updated-at trigger (reusable)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_preferences_updated_at
  before update on public.app_preferences
  for each row execute procedure public.set_updated_at();
