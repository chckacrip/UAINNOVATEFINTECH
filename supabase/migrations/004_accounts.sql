-- Multi-account support
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null default 'checking' check (account_type in ('checking', 'savings', 'credit', 'investment', 'other')),
  created_at timestamptz default now()
);

alter table public.accounts enable row level security;
create policy "Users own accounts" on public.accounts for all using (auth.uid() = user_id);

-- Optional account_id on transactions
alter table public.transactions add column if not exists account_id uuid references public.accounts(id);
