-- Add prominence field to items table
-- Allows users to record the story/history of an item

alter table public.items 
  add column if not exists prominence text;

comment on column public.items.prominence is 'Story or history about the item - its significance to the family or past owner';
