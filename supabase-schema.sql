-- Profiles table
create table public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_balance numeric default 0,
  incomes jsonb default '[]'::jsonb,
  fixed_expenses jsonb default '[]'::jsonb,
  debts jsonb default '[]'::jsonb,
  investments jsonb default '[]'::jsonb,
  monthly_log jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric not null,
  category text not null,
  description text not null,
  date date not null,
  created_at timestamp with time zone default now()
);

-- Goals table
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target numeric not null,
  current numeric default 0,
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

-- Policies: users can only see and edit their own data
create policy "profiles: own data" on public.profiles
  for all using (auth.uid() = user_id);

create policy "transactions: own data" on public.transactions
  for all using (auth.uid() = user_id);

create policy "goals: own data" on public.goals
  for all using (auth.uid() = user_id);

-- Indexes for performance
create index transactions_user_date on public.transactions(user_id, date desc);
create index goals_user on public.goals(user_id);
