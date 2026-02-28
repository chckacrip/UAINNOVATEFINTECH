-- Net worth tracking
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_type text not null default 'savings' check (asset_type in ('savings', 'checking', 'investment', 'retirement', 'property', 'vehicle', 'crypto', 'other')),
  value numeric not null default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.assets enable row level security;
create policy "Users own assets" on public.assets for all using (auth.uid() = user_id);

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  liability_type text not null default 'credit_card' check (liability_type in ('credit_card', 'student_loan', 'mortgage', 'auto_loan', 'personal_loan', 'medical', 'other')),
  balance numeric not null default 0,
  interest_rate numeric default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.liabilities enable row level security;
create policy "Users own liabilities" on public.liabilities for all using (auth.uid() = user_id);
