-- Net worth over time (monthly snapshots)
create table if not exists public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_month text not null,
  assets_total numeric not null default 0,
  liabilities_total numeric not null default 0,
  created_at timestamptz default now(),
  unique(user_id, snapshot_month)
);

alter table public.net_worth_snapshots enable row level security;
create policy "Users own net_worth_snapshots" on public.net_worth_snapshots for all using (auth.uid() = user_id);

-- Merchant rules: always categorize merchant (pattern) as category
alter table public.profiles
  add column if not exists merchant_rules jsonb default '[]'::jsonb;

-- Split transactions: optional array of { category, amount } per transaction
alter table public.transactions
  add column if not exists splits jsonb default null;
