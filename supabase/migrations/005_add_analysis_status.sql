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
