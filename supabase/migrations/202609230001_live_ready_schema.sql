create extension if not exists "pgcrypto";

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_size integer not null default 4 check (household_size between 1 and 12),
  diet_type text not null default 'veg' check (diet_type in ('veg', 'egg', 'non_veg')),
  preferred_styles text[] not null default '{}',
  avoid_ingredients text[] not null default '{}',
  time_band text not null default 'under_20',
  reminder_time text not null default '20:30',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  local_id text,
  meal_type text not null check (meal_type in ('breakfast', 'lunch')),
  name text not null,
  category text not null default 'family',
  diet_type text not null default 'veg',
  active_time_minutes integer not null default 15,
  total_time_minutes integer not null default 15,
  morning_effort_minutes integer not null default 15,
  ingredients_required text[] not null default '{}',
  ingredients_optional text[] not null default '{}',
  side_suggestions text[] not null default '{}',
  steps text[] not null default '{}',
  tags text[] not null default '{}',
  photo_path text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

create table if not exists public.meal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  dish_id text not null,
  dish_name text,
  meal_type text check (meal_type in ('breakfast', 'lunch')),
  source_recommendation_id text,
  cooked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meal_events(id) on delete cascade,
  dish_id text,
  rating text not null check (rating in ('loved', 'good', 'dont_suggest')),
  created_at timestamptz not null default now()
);

create table if not exists public.tomorrow_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  plan_date date not null,
  breakfast_dish jsonb,
  lunch_dish jsonb,
  dinner_dish jsonb,
  prep_task text,
  grocery_gap text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'worked', 'did_not_work')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table if not exists public.prep_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.tomorrow_plans(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.tomorrow_plans(id) on delete cascade,
  item text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.custom_dishes enable row level security;
alter table public.meal_events enable row level security;
alter table public.feedback_events enable row level security;
alter table public.tomorrow_plans enable row level security;
alter table public.prep_tasks enable row level security;
alter table public.grocery_items enable row level security;
alter table public.analytics_events enable row level security;

create policy "households_owner" on public.households for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "custom_dishes_owner" on public.custom_dishes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meal_events_owner" on public.meal_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "feedback_events_owner" on public.feedback_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tomorrow_plans_owner" on public.tomorrow_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prep_tasks_owner" on public.prep_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "grocery_items_owner" on public.grocery_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analytics_insert_own" on public.analytics_events for insert with check (auth.uid() = user_id or user_id is null);
create policy "analytics_read_own" on public.analytics_events for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

create policy "dish_photos_public_read" on storage.objects
for select using (bucket_id = 'dish-photos');

create policy "dish_photos_user_write" on storage.objects
for insert with check (
  bucket_id = 'dish-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "dish_photos_user_update" on storage.objects
for update using (
  bucket_id = 'dish-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'dish-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
