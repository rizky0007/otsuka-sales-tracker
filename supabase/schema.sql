create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  active boolean not null default true
);

insert into public.products (code, name) values
  ('POCARI_ALL', 'Pocari Sweat'),
  ('ION_ALL', 'Ion Water'),
  ('ORONAMIN', 'Oronamin C'),
  ('FIBE', 'Fibe Mini'),
  ('SOYJOY', 'Soyjoy')
on conflict (code) do nothing;

create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  area text default '',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.monthly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  month date not null,
  outlet_target integer not null default 0 check (outlet_target >= 0),
  value_target numeric(18,2) not null default 0 check (value_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, month)
);

create table if not exists public.daily_outlet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outlet_id uuid not null,
  product_id uuid not null references public.products(id),
  transaction_date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now(),
  foreign key (outlet_id, user_id) references public.outlets(id, user_id) on delete cascade,
  unique (user_id, outlet_id, product_id, transaction_date)
);

create table if not exists public.daily_product_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  entry_date date not null default current_date,
  value numeric(18,2) not null default 0 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, entry_date)
);

alter table public.products enable row level security;
alter table public.outlets enable row level security;
alter table public.monthly_targets enable row level security;
alter table public.daily_outlet_transactions enable row level security;
alter table public.daily_product_values enable row level security;

drop policy if exists "Authenticated users read products" on public.products;
create policy "Authenticated users read products" on public.products
for select to authenticated using (true);

drop policy if exists "Users manage own outlets" on public.outlets;
create policy "Users manage own outlets" on public.outlets
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own targets" on public.monthly_targets;
create policy "Users manage own targets" on public.monthly_targets
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own transactions" on public.daily_outlet_transactions;
create policy "Users manage own transactions" on public.daily_outlet_transactions
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own daily values" on public.daily_product_values;
create policy "Users manage own daily values" on public.daily_product_values
for all to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_transactions_date
on public.daily_outlet_transactions (user_id, transaction_date);

create index if not exists idx_daily_values_date
on public.daily_product_values (user_id, entry_date);

create index if not exists idx_targets_month
on public.monthly_targets (user_id, month);
