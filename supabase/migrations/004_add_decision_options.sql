-- Add keep, donate, and trash decision options

alter table public.items drop constraint if exists items_decision_check;
alter table public.items 
  add constraint items_decision_check 
  check (decision in ('undecided', 'keep', 'ebay', 'garage_sale', 'donate', 'trash', 'family_member'));
