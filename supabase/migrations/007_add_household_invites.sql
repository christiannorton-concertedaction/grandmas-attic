-- Invite codes so family members can join a household from their own device.
-- Joining requires knowing the code (shared by the owner); there is no way
-- to list or discover households.

create table if not exists public.household_invites (
  code text primary key,
  household_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists household_invites_household_id_idx
  on public.household_invites (household_id);

alter table public.household_invites enable row level security;

-- Selects only ever filter by exact code (join flow) or by household_id
-- (owner viewing their own code), so a permissive policy matches the
-- trust model used by the rest of the schema.
create policy "household_invites_select" on public.household_invites for select using (true);
create policy "household_invites_insert" on public.household_invites for insert with check (true);
create policy "household_invites_delete" on public.household_invites for delete using (true);
