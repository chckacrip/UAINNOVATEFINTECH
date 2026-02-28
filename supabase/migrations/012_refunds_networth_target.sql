-- Refunds: link credit to original transaction; exclude from spending when desired
alter table public.transactions
  add column if not exists refund_of_id uuid references public.transactions(id),
  add column if not exists is_refund boolean default false;

-- Net worth target for progress (e.g. "Target $X by date")
alter table public.profiles
  add column if not exists net_worth_target_amount numeric,
  add column if not exists net_worth_target_date date;
