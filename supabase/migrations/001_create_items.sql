-- Grandma's Attic: items table, storage bucket, and RLS policies

create extension if not exists "pgcrypto";

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  household_id text not null,
  photo_path text not null,
  title text not null default 'Unknown item',
  description text not null default '',
  estimated_value_low numeric,
  estimated_value_high numeric,
  notes text,
  decision text not null default 'undecided'
    check (decision in ('undecided', 'ebay', 'garage_sale', 'child_a', 'child_b')),
  ai_confidence text
    check (ai_confidence is null or ai_confidence in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_household_id_idx on public.items (household_id);
create index if not exists items_created_at_idx on public.items (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

-- MVP: anon access scoped by household_id passed from the client.
-- Tighten with auth.uid() in v2.
create policy "items_select_by_household"
  on public.items for select
  using (true);

create policy "items_insert_by_household"
  on public.items for insert
  with check (true);

create policy "items_update_by_household"
  on public.items for update
  using (true)
  with check (true);

create policy "items_delete_by_household"
  on public.items for delete
  using (true);

-- Storage bucket for item photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "item_photos_select"
  on storage.objects for select
  using (bucket_id = 'item-photos');

create policy "item_photos_insert"
  on storage.objects for insert
  with check (bucket_id = 'item-photos');

create policy "item_photos_update"
  on storage.objects for update
  using (bucket_id = 'item-photos');

create policy "item_photos_delete"
  on storage.objects for delete
  using (bucket_id = 'item-photos');
