-- Transaction templates (name, amount, merchant, category)
alter table public.profiles add column if not exists transaction_templates jsonb default '[]'::jsonb;

-- Receipt/attachment URL on transactions
alter table public.transactions add column if not exists receipt_url text;

-- Subscription price history: [{ date, amount }] per merchant in profile
alter table public.profiles add column if not exists subscription_price_history jsonb default '{}'::jsonb;

-- Category emoji: { "Dining": "🍽️", ... }
alter table public.profiles add column if not exists category_emoji jsonb default '{}'::jsonb;

-- Dashboard section order and collapsed: { order: string[], collapsed: string[] }
alter table public.profiles add column if not exists dashboard_sections jsonb default '{"order":[],"collapsed":[]}'::jsonb;

-- Transaction rules: [{ condition: { amountMin?, amountMax?, category?, merchantPattern? }, action: { addTag?, setCategory? } }]
alter table public.profiles add column if not exists transaction_rules jsonb default '[]'::jsonb;
