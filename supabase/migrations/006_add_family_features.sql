-- Add tables for family collaboration features

-- Track which family members are interested in which items
create table if not exists public.item_interests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(item_id, family_member_id)
);

create index if not exists item_interests_item_id_idx 
  on public.item_interests (item_id);
create index if not exists item_interests_family_member_id_idx 
  on public.item_interests (family_member_id);

alter table public.item_interests enable row level security;

create policy "item_interests_select" on public.item_interests for select using (true);
create policy "item_interests_insert" on public.item_interests for insert with check (true);
create policy "item_interests_delete" on public.item_interests for delete using (true);

-- Family member notes on items
create table if not exists public.family_notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_notes_item_id_idx 
  on public.family_notes (item_id);

alter table public.family_notes enable row level security;

create policy "family_notes_select" on public.family_notes for select using (true);
create policy "family_notes_insert" on public.family_notes for insert with check (true);
create policy "family_notes_update" on public.family_notes for update using (true) with check (true);
create policy "family_notes_delete" on public.family_notes for delete using (true);

-- Trigger for updated_at on family_notes
drop trigger if exists family_notes_set_updated_at on public.family_notes;
create trigger family_notes_set_updated_at
  before update on public.family_notes
  for each row execute function public.set_updated_at();
