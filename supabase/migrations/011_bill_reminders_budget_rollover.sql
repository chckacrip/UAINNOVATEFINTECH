-- Bill reminders: due date + optional amount per recurring bill
create table if not exists public.bill_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  due_day int not null check (due_day >= 1 and due_day <= 31),
  amount numeric,
  currency text default 'USD',
  category text,
  reminder_days_before int default 3,
  created_at timestamptz default now()
);

create index idx_bill_reminders_user on public.bill_reminders(user_id);
alter table public.bill_reminders enable row level security;
create policy "Users own bill_reminders" on public.bill_reminders for all using (auth.uid() = user_id);

-- Budget rollover: per-category carry-over (true = enable rollover for that category)
alter table public.profiles add column if not exists budget_rollover jsonb default '{}'::jsonb;

-- Saved filter presets: name + { dateFrom, dateTo, category, tag, search, ... }
alter table public.profiles add column if not exists filter_presets jsonb default '[]'::jsonb;

-- Report scheduling: weekly/monthly email digest
alter table public.profiles add column if not exists report_schedule jsonb default '{"enabled":false,"frequency":"weekly"}'::jsonb;
