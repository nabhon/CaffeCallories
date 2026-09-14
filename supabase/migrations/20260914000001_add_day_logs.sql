-- Migration: Add day_logs table and link entries to day_logs
-- Adheres to Supabase Postgres best practices (indexes, lowercase, RLS, cascade delete)

-- 1. Create day_logs table
create table if not exists public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  -- Copied snapshot of goals (decoupled from profile_settings, no FK)
  calorie_goal integer not null default 2000 check (calorie_goal > 0),
  target_protein_g integer not null default 150 check (target_protein_g >= 0),
  target_carbs_g integer not null default 200 check (target_carbs_g >= 0),
  target_fat_g integer not null default 65 check (target_fat_g >= 0),
  -- Aggregated totals
  total_intake integer not null default 0 check (total_intake >= 0),
  total_burn integer not null default 0 check (total_burn >= 0),
  net_calories integer not null default 0,
  total_protein_g numeric(6, 1) not null default 0.0 check (total_protein_g >= 0),
  total_carbs_g numeric(6, 1) not null default 0.0 check (total_carbs_g >= 0),
  total_fat_g numeric(6, 1) not null default 0.0 check (total_fat_g >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint uq_day_logs_user_date unique (user_id, date)
);

-- Index for fast user monthly range queries
create index if not exists idx_day_logs_user_date
  on public.day_logs (user_id, date desc);

-- Enable RLS on day_logs
alter table public.day_logs enable row level security;

-- Policies for day_logs
create policy "Users can view own day logs"
  on public.day_logs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own day logs"
  on public.day_logs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own day logs"
  on public.day_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own day logs"
  on public.day_logs
  for delete
  using (auth.uid() = user_id);

-- Attach updated_at trigger to day_logs
create trigger trigger_day_logs_updated_at
  before update on public.day_logs
  for each row
  execute function public.handle_updated_at();

-- 2. Alter entries to reference day_logs
alter table public.entries
  add column if not exists day_log_id uuid references public.day_logs(id) on delete cascade;

create index if not exists idx_entries_day_log_id
  on public.entries (day_log_id);

-- 3. Trigger Function: Sync Day Log totals on Entry changes
create or replace function public.sync_day_log_on_entry()
returns trigger as $$
declare
  target_user_id uuid;
  target_date date;
  target_day_log_id uuid;
  initial_goal integer := 2000;
  initial_protein integer := 150;
  initial_carbs integer := 200;
  initial_fat integer := 65;
begin
  -- Determine user and date
  if (TG_OP = 'DELETE') then
    target_user_id := old.user_id;
    target_date := (old.logged_at at time zone 'UTC')::date;
  else
    target_user_id := new.user_id;
    target_date := (new.logged_at at time zone 'UTC')::date;
  end if;

  -- Lookup or create day_log
  select id into target_day_log_id
  from public.day_logs
  where user_id = target_user_id and date = target_date;

  if (target_day_log_id is null and TG_OP != 'DELETE') then
    -- Snapshot current user goals from profile_settings if available
    select
      coalesce(daily_calorie_goal, 2000),
      coalesce(target_protein_g, 150),
      coalesce(target_carbs_g, 200),
      coalesce(target_fat_g, 65)
    into initial_goal, initial_protein, initial_carbs, initial_fat
    from public.profile_settings
    where user_id = target_user_id;

    insert into public.day_logs (
      user_id,
      date,
      calorie_goal,
      target_protein_g,
      target_carbs_g,
      target_fat_g
    ) values (
      target_user_id,
      target_date,
      coalesce(initial_goal, 2000),
      coalesce(initial_protein, 150),
      coalesce(initial_carbs, 200),
      coalesce(initial_fat, 65)
    )
    returning id into target_day_log_id;
  end if;

  -- If inserting/updating entry, link day_log_id
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    new.day_log_id := target_day_log_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to link day_log_id BEFORE insert or update on entries
create or replace trigger trigger_entries_link_day_log
  before insert or update on public.entries
  for each row
  execute function public.sync_day_log_on_entry();

-- Trigger Function: Recalculate Day Log Aggregates AFTER insert, update, or delete on entries
create or replace function public.recalculate_day_log_aggregates()
returns trigger as $$
declare
  target_user_id uuid;
  target_date date;
  target_day_log_id uuid;
  sum_intake integer := 0;
  sum_burn integer := 0;
  sum_protein numeric(6, 1) := 0.0;
  sum_carbs numeric(6, 1) := 0.0;
  sum_fat numeric(6, 1) := 0.0;
begin
  if (TG_OP = 'DELETE') then
    target_user_id := old.user_id;
    target_date := (old.logged_at at time zone 'UTC')::date;
  else
    target_user_id := new.user_id;
    target_date := (new.logged_at at time zone 'UTC')::date;
  end if;

  select id into target_day_log_id
  from public.day_logs
  where user_id = target_user_id and date = target_date;

  if (target_day_log_id is not null) then
    -- Aggregate totals from entries for that user and date
    select
      coalesce(sum(case when entry_type = 'intake' then calories else 0 end), 0),
      coalesce(sum(case when entry_type = 'burn' then abs(calories) else 0 end), 0),
      coalesce(sum(case when entry_type = 'intake' then protein_g else 0 end), 0.0),
      coalesce(sum(case when entry_type = 'intake' then carbs_g else 0 end), 0.0),
      coalesce(sum(case when entry_type = 'intake' then fat_g else 0 end), 0.0)
    into sum_intake, sum_burn, sum_protein, sum_carbs, sum_fat
    from public.entries
    where user_id = target_user_id
      and (logged_at at time zone 'UTC')::date = target_date;

    update public.day_logs
    set
      total_intake = sum_intake,
      total_burn = sum_burn,
      net_calories = sum_intake - sum_burn,
      total_protein_g = sum_protein,
      total_carbs_g = sum_carbs,
      total_fat_g = sum_fat,
      updated_at = now()
    where id = target_day_log_id;
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- Trigger to recalculate totals AFTER changes on entries
create or replace trigger trigger_entries_recalc_day_log
  after insert or update or delete on public.entries
  for each row
  execute function public.recalculate_day_log_aggregates();

-- 4. Backfill existing entries into day_logs
do $$
declare
  r record;
  new_day_log_id uuid;
  goal_cal integer;
  goal_p integer;
  goal_c integer;
  goal_f integer;
begin
  for r in
    select distinct user_id, (logged_at at time zone 'UTC')::date as entry_date
    from public.entries
  loop
    -- Fetch goals from settings if available
    select
      coalesce(daily_calorie_goal, 2000),
      coalesce(target_protein_g, 150),
      coalesce(target_carbs_g, 200),
      coalesce(target_fat_g, 65)
    into goal_cal, goal_p, goal_c, goal_f
    from public.profile_settings
    where user_id = r.user_id;

    insert into public.day_logs (
      user_id,
      date,
      calorie_goal,
      target_protein_g,
      target_carbs_g,
      target_fat_g
    ) values (
      r.user_id,
      r.entry_date,
      coalesce(goal_cal, 2000),
      coalesce(goal_p, 150),
      coalesce(goal_c, 200),
      coalesce(goal_f, 65)
    )
    on conflict (user_id, date) do nothing;

    select id into new_day_log_id
    from public.day_logs
    where user_id = r.user_id and date = r.entry_date;

    -- Link existing entries to day_log
    update public.entries
    set day_log_id = new_day_log_id
    where user_id = r.user_id
      and (logged_at at time zone 'UTC')::date = r.entry_date;

    -- Recalculate totals
    update public.day_logs
    set
      total_intake = coalesce((select sum(calories) from public.entries where user_id = r.user_id and (logged_at at time zone 'UTC')::date = r.entry_date and entry_type = 'intake'), 0),
      total_burn = coalesce((select sum(abs(calories)) from public.entries where user_id = r.user_id and (logged_at at time zone 'UTC')::date = r.entry_date and entry_type = 'burn'), 0),
      net_calories = coalesce((select sum(case when entry_type = 'intake' then calories else -abs(calories) end) from public.entries where user_id = r.user_id and (logged_at at time zone 'UTC')::date = r.entry_date), 0),
      total_protein_g = coalesce((select sum(protein_g) from public.entries where user_id = r.user_id and (logged_at at time zone 'UTC')::date = r.entry_date and entry_type = 'intake'), 0.0),
      total_carbs_g = coalesce((select sum(carbs_g) from public.entries where user_id = r.user_id and (logged_at at time zone 'UTC')::date = r.entry_date and entry_type = 'intake'), 0.0),
      total_fat_g = coalesce((select sum(fat_g) from public.entries where user_id = r.user_id and (logged_at at time zone 'UTC')::date = r.entry_date and entry_type = 'intake'), 0.0)
    where id = new_day_log_id;
  end loop;
end;
$$;
