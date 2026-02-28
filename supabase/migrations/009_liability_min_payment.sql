-- Optional minimum monthly payment for debt payoff planner
alter table public.liabilities
  add column if not exists minimum_payment numeric default 0;
