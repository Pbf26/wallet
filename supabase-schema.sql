-- Run this only if upgrading from v1 (adds new columns to transactions)
-- If starting fresh, this creates all tables from scratch

-- Profiles table
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_balance numeric default 0,
  bank_accounts jsonb default '[]'::jsonb,
  credit_cards jsonb default '[]'::jsonb,
  incomes jsonb default '[]'::jsonb,
  fixed_expenses jsonb default '[]'::jsonb,
  debts jsonb default '[]'::jsonb,
  investments jsonb default '[]'::jsonb,
  monthly_log jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Add new columns to profiles if upgrading from v1
alter table public.profiles add column if not exists bank_accounts jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists credit_cards jsonb default '[]'::jsonb;

-- Transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric not null,
  category text not null,
  description text not null,
  date date not null,
  bank text,
  payment_method text,
  created_at timestamp with time zone default now()
);

-- Add new columns to transactions if upgrading from v1
alter table public.transactions add column if not exists bank text;
alter table public.transactions add column if not exists payment_method text;

-- Goals table
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target numeric not null,
  current numeric default 0,
  created_at timestamp with time zone default now()
);

-- Row Level Security (safe to run even if already enabled)
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

-- Policies (drop and recreate to avoid conflicts)
drop policy if exists "profiles: own data" on public.profiles;
drop policy if exists "transactions: own data" on public.transactions;
drop policy if exists "goals: own data" on public.goals;

create policy "profiles: own data" on public.profiles for all using (auth.uid() = user_id);
create policy "transactions: own data" on public.transactions for all using (auth.uid() = user_id);
create policy "goals: own data" on public.goals for all using (auth.uid() = user_id);

-- Indexes
create index if not exists transactions_user_date on public.transactions(user_id, date desc);
create index if not exists goals_user on public.goals(user_id);
