-- Add analysis_status to track item processing state
-- Supports batch processing workflow

alter table public.items 
  add column if not exists analysis_status text not null default 'pending'
  check (analysis_status in ('pending', 'analyzing', 'completed', 'failed'));

alter table public.items 
  add column if not exists analysis_error text;

-- Index for finding items that need analysis
create index if not exists items_analysis_status_idx 
  on public.items (household_id, analysis_status) 
  where analysis_status = 'pending';

-- Make title, description, and values nullable for pending items
alter table public.items alter column title drop not null;
alter table public.items alter column description drop not null;

-- Set default for title
alter table public.items alter column title set default null;
alter table public.items alter column description set default '';

-- Backfill: items that existed before this migration were already analyzed,
-- so mark them completed instead of leaving them at the 'pending' default
-- (which would hide them from lists and show them as "Analyzing..." forever).
update public.items
  set analysis_status = 'completed'
  where title is not null and analysis_status = 'pending';
