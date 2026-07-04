-- Add family_members table for flexible family member tagging
-- Replaces hardcoded child_a/child_b decisions

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  household_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists family_members_household_id_idx 
  on public.family_members (household_id);

alter table public.family_members enable row level security;

create policy "family_members_select_by_household"
  on public.family_members for select
  using (true);

create policy "family_members_insert_by_household"
  on public.family_members for insert
  with check (true);

create policy "family_members_update_by_household"
  on public.family_members for update
  using (true)
  with check (true);

create policy "family_members_delete_by_household"
  on public.family_members for delete
  using (true);

-- Add family_member_id column to items table (nullable FK)
alter table public.items 
  add column if not exists family_member_id uuid references public.family_members(id) on delete set null;

-- Update decision check constraint to remove child_a/child_b and add 'family_member'
alter table public.items drop constraint if exists items_decision_check;
alter table public.items 
  add constraint items_decision_check 
  check (decision in ('undecided', 'ebay', 'garage_sale', 'family_member'));

-- Migrate existing child_a/child_b decisions to 'undecided' 
-- (since we don't have the family members created yet)
update public.items 
  set decision = 'undecided' 
  where decision in ('child_a', 'child_b');
