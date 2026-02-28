-- Add budgets column for per-category spending limits
alter table public.profiles
  add column if not exists budgets jsonb default '{}'::jsonb;
