-- Run this in Supabase SQL Editor to create required tables

create table if not exists resumes (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  resume_text text,
  detected_skills jsonb,
  job_matches jsonb,
  updated_at timestamptz default now()
);

create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  username text not null,
  company text,
  title text,
  match_score int,
  salary text,
  applied_at timestamptz default now()
);

-- Enable Row Level Security
alter table resumes enable row level security;
alter table applications enable row level security;

-- Allow all operations for anon (for prototype)
create policy "Allow all for anon" on resumes for all using (true);
create policy "Allow all for anon" on applications for all using (true);
