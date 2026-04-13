-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Enums
create type loan_type as enum ('variable_pi', 'variable_io', 'fixed');
create type lvr_band as enum ('lt60', '60_70', '70_80', 'gt80');
create type balance_band as enum ('lt300', '300_500', '500_750', '750_1000', 'gt1000');

-- Submissions table
create table submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lender varchar not null,
  loan_type loan_type not null,
  lvr_band lvr_band not null,
  balance_band balance_band not null,
  current_rate decimal(5,2) not null check (current_rate between 3 and 12),
  email_hash varchar(64) not null,
  source varchar,
  outcome_token uuid default gen_random_uuid() unique
);

create index idx_submissions_lender on submissions(lender);
create index idx_submissions_created_at on submissions(created_at);
create index idx_submissions_outcome_token on submissions(outcome_token);

-- Outcomes table
create table outcomes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id),
  created_at timestamptz default now(),
  called boolean not null,
  rate_reduced boolean,
  new_rate decimal(5,2),
  call_duration_mins integer,
  satisfaction integer check (satisfaction between 1 and 5),
  free_text text,
  refinanced boolean not null default false,
  refi_lender varchar,
  refi_rate decimal(5,2)
);

create index idx_outcomes_submission_id on outcomes(submission_id);

-- Lender benchmarks (materialised, refreshed hourly)
create table lender_benchmarks (
  id uuid primary key default gen_random_uuid(),
  lender varchar not null,
  loan_type loan_type not null,
  lvr_band lvr_band not null,
  avg_existing_rate decimal(5,2),
  advertised_rate decimal(5,2),
  loyalty_gap decimal(5,2),
  call_success_rate decimal(5,2),
  avg_reduction decimal(5,2),
  sample_size integer default 0,
  last_updated timestamptz default now(),
  unique(lender, loan_type, lvr_band)
);

create index idx_benchmarks_lender on lender_benchmarks(lender);

-- Lender advertised rates (scraper target)
create table lender_advertised_rates (
  id uuid primary key default gen_random_uuid(),
  lender varchar not null,
  loan_type loan_type not null,
  advertised_rate decimal(5,2) not null,
  scraped_at timestamptz default now()
);

create index idx_advertised_rates_lender on lender_advertised_rates(lender, loan_type);

-- RLS policies
alter table submissions enable row level security;
alter table outcomes enable row level security;
alter table lender_benchmarks enable row level security;
alter table lender_advertised_rates enable row level security;

-- submissions: public can insert, no select
create policy "public_insert_submissions" on submissions
  for insert to anon with check (true);

-- outcomes: public can insert (token validated in app layer)
create policy "public_insert_outcomes" on outcomes
  for insert to anon with check (true);

-- lender_benchmarks: public can read
create policy "public_read_benchmarks" on lender_benchmarks
  for select to anon using (true);

-- lender_advertised_rates: service role only (no anon policy = blocked)
