-- Shared household finances
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.households enable row level security;

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_at timestamptz default now(),
  accepted_at timestamptz
);

alter table public.household_members enable row level security;

-- Members can see their own household memberships
create policy "Members see own memberships" on public.household_members
  for select using (auth.uid() = user_id or email = auth.email());

-- Owners can manage members in their households
create policy "Owners manage members" on public.household_members
  for all using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Members of a household can view the household
create policy "Members view household" on public.households
  for select using (
    id in (
      select household_id from public.household_members
      where user_id = auth.uid() and status = 'accepted'
    )
    or created_by = auth.uid()
  );

-- Only creators can update/delete households
create policy "Creator manages household" on public.households
  for all using (created_by = auth.uid());

-- Add household_id to profiles
alter table public.profiles add column if not exists household_id uuid references public.households(id);

-- Add digest_enabled flag
alter table public.profiles add column if not exists digest_enabled boolean default false;
