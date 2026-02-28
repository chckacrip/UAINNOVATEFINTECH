-- Plaid integration
create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_name text,
  access_token text not null,
  item_id text not null unique,
  cursor text,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

alter table public.plaid_items enable row level security;
create policy "Users own plaid_items" on public.plaid_items for all using (auth.uid() = user_id);
