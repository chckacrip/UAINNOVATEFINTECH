-- Transaction notes and tags
alter table public.transactions
  add column if not exists notes text,
  add column if not exists tags jsonb default '[]'::jsonb;

-- User-defined custom categories (merged with default in app)
alter table public.profiles
  add column if not exists custom_categories jsonb default '[]'::jsonb;

-- Recurring income (for forecasts)
alter table public.profiles
  add column if not exists recurring_income jsonb default '[]'::jsonb;

-- Subscription audit: keep/cancel notes per merchant name
alter table public.profiles
  add column if not exists subscription_notes jsonb default '{}'::jsonb;
