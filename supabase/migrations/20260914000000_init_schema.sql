-- Supabase PostgreSQL Schema for Caffecallories
-- Adheres to postgres-best-practices (lowercase identifiers, primary keys, RLS, indexes)

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (User identity & physical metrics)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index foreign keys and lookups
create index if not exists idx_profiles_email on public.profiles (email);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. PROFILE_SETTINGS TABLE (Nutritional targets & preferences)
create table if not exists public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calorie_goal integer default 2000 not null check (daily_calorie_goal > 0),
  target_protein_g integer default 150 not null check (target_protein_g >= 0),
  target_carbs_g integer default 200 not null check (target_carbs_g >= 0),
  target_fat_g integer default 65 not null check (target_fat_g >= 0),
  activity_level text default 'moderate' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on profile_settings
alter table public.profile_settings enable row level security;

-- Policies for profile_settings
create policy "Users can view own settings"
  on public.profile_settings
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.profile_settings
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.profile_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. ENTRIES TABLE (Food intake & Exercise burn)
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  entry_type text not null check (entry_type in ('intake', 'burn')),
  calories integer not null, -- positive for intake, negative for burn
  protein_g numeric(6, 1) default 0.0 not null check (protein_g >= 0),
  carbs_g numeric(6, 1) default 0.0 not null check (carbs_g >= 0),
  fat_g numeric(6, 1) default 0.0 not null check (fat_g >= 0),
  logged_at timestamptz default now() not null,
  raw_prompt text,
  created_at timestamptz default now() not null
);

-- Composite index for fast chronological and range querying by user
create index if not exists idx_entries_user_logged_at
  on public.entries (user_id, logged_at desc);

-- Enable RLS on entries
alter table public.entries enable row level security;

-- Policies for entries
create policy "Users can view own entries"
  on public.entries
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries
  for delete
  using (auth.uid() = user_id);

-- Helper trigger function to update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger trigger_profile_settings_updated_at
  before update on public.profile_settings
  for each row
  execute function public.handle_updated_at();
