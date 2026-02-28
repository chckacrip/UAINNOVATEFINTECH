-- Add job information and location to profiles for HCOL analysis

alter table public.profiles
  add column if not exists job_title text,
  add column if not exists employer text,
  add column if not exists industry text,
  add column if not exists employment_type text default 'full-time',
  add column if not exists city text,
  add column if not exists state text;
