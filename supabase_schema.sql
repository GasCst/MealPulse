-- ========================================================
-- MEALPULSE AI: SUPABASE CLOUD DATABASE MIGRATION SCRIPT
-- Copy and paste this script into Supabase SQL Editor
-- ========================================================

-- 1. Create User Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  is_pro boolean default false,
  current_plan text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Subscriptions Ledger Table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plan_id text not null, -- 'weekly', 'monthly', 'yearly'
  status text not null,  -- 'active', 'canceled'
  amount_paid numeric(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Meal Logs Table
create table if not exists public.meal_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  food_name text not null,
  calories numeric(10, 2) not null,
  protein_g numeric(10, 2) default 0,
  carbs_g numeric(10, 2) default 0,
  fat_g numeric(10, 2) default 0,
  meal_type text default 'Dinner',
  image_url text,
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Daily Activity & Burned Calories Table (HealthKit / Health Connect sync)
create table if not exists public.daily_activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  log_date date not null,
  active_calories numeric(10, 2) default 0,
  steps integer default 0,
  exercise_minutes integer default 0,
  source text default 'health_connect',
  synced_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_activity_date unique (user_id, log_date)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.meal_logs enable row level security;
alter table public.daily_activity_logs enable row level security;

-- Drop previous policies to avoid duplicates
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Create RLS Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can view own meal logs" on public.meal_logs for select using (auth.uid() = user_id);
create policy "Users can insert own meal logs" on public.meal_logs for insert with check (auth.uid() = user_id);

create policy "Users can view own activity logs" on public.daily_activity_logs for select using (auth.uid() = user_id);
create policy "Users can insert own activity logs" on public.daily_activity_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own activity logs" on public.daily_activity_logs for update using (auth.uid() = user_id);

-- 4. Automatic Database Trigger: Inserts row into public.profiles on auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, is_pro)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    false
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution on auth signup
drop trigger if exists on_auth_user_created on auth.users;
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
