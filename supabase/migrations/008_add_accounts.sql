-- Accounts: OAuth sign-in (Supabase Auth), real households, memberships,
-- and auth-based row level security replacing the permissive MVP policies.
--
-- Model:
--   - households: created by an owner (auth user)
--   - household_members: links users to a household with a role
--     (v1 constraint: one membership per user)
--   - family_members gains user_id so a family member's identity comes
--     from their account (rows with null user_id are name-only tags the
--     owner creates, e.g. to mark "give to Sarah" before Sarah joins)
--
-- Pre-existing device-scoped rows (from the no-auth MVP) simply become
-- invisible: they belong to no household and no policy matches them.

-- 1. Households and memberships -------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Attic',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'family')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id),
  -- v1: a user belongs to exactly one household. Simplifies role
  -- resolution in the app; relax later if multi-household is needed.
  unique (user_id)
);

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);

-- 2. Helper functions (security definer so policies avoid RLS recursion) --

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- 3. Convert household_id columns from device-generated text to uuid ------

alter table public.items
  alter column household_id type uuid using household_id::uuid;
alter table public.family_members
  alter column household_id type uuid using household_id::uuid;
alter table public.household_invites
  alter column household_id type uuid using household_id::uuid;

-- 4. Family member identities tied to accounts ----------------------------

alter table public.family_members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists family_members_household_user_idx
  on public.family_members (household_id, user_id)
  where user_id is not null;

-- 5. Row level security ---------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- households
create policy "households_select" on public.households for select
  using (public.is_household_member(id));
create policy "households_insert" on public.households for insert
  with check (owner_user_id = auth.uid());
create policy "households_update" on public.households for update
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "households_delete" on public.households for delete
  using (owner_user_id = auth.uid());

-- household_members: owners bootstrap their own membership; family members
-- are added by the join-household edge function (service role). A family
-- member may remove themselves ("leave household").
create policy "household_members_select" on public.household_members for select
  using (public.is_household_member(household_id));
create policy "household_members_insert" on public.household_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_user_id = auth.uid()
    )
  );
create policy "household_members_delete" on public.household_members for delete
  using (user_id = auth.uid() and role = 'family');

-- items: replace permissive MVP policies
drop policy if exists "items_select_by_household" on public.items;
drop policy if exists "items_insert_by_household" on public.items;
drop policy if exists "items_update_by_household" on public.items;
drop policy if exists "items_delete_by_household" on public.items;

create policy "items_select" on public.items for select
  using (public.is_household_member(household_id));
create policy "items_insert" on public.items for insert
  with check (public.is_household_owner(household_id));
create policy "items_update" on public.items for update
  using (public.is_household_owner(household_id))
  with check (public.is_household_owner(household_id));
create policy "items_delete" on public.items for delete
  using (public.is_household_owner(household_id));

-- family_members
drop policy if exists "family_members_select_by_household" on public.family_members;
drop policy if exists "family_members_insert_by_household" on public.family_members;
drop policy if exists "family_members_update_by_household" on public.family_members;
drop policy if exists "family_members_delete_by_household" on public.family_members;

create policy "family_members_select" on public.family_members for select
  using (public.is_household_member(household_id));
-- Owner manages the list; a member may also create/update their own row
-- (used to self-heal if the owner deleted it).
create policy "family_members_insert" on public.family_members for insert
  with check (
    public.is_household_owner(household_id)
    or (user_id = auth.uid() and public.is_household_member(household_id))
  );
create policy "family_members_update" on public.family_members for update
  using (public.is_household_owner(household_id) or user_id = auth.uid())
  with check (public.is_household_owner(household_id) or user_id = auth.uid());
create policy "family_members_delete" on public.family_members for delete
  using (public.is_household_owner(household_id) or user_id = auth.uid());

-- item_interests: members can read; users only manage their own interests
drop policy if exists "item_interests_select" on public.item_interests;
drop policy if exists "item_interests_insert" on public.item_interests;
drop policy if exists "item_interests_delete" on public.item_interests;

create policy "item_interests_select" on public.item_interests for select
  using (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_household_member(i.household_id)
    )
  );
create policy "item_interests_insert" on public.item_interests for insert
  with check (
    exists (
      select 1 from public.family_members fm
      join public.items i on i.id = item_id
      where fm.id = family_member_id
        and fm.user_id = auth.uid()
        and fm.household_id = i.household_id
    )
  );
create policy "item_interests_delete" on public.item_interests for delete
  using (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id and fm.user_id = auth.uid()
    )
  );

-- family_notes: members read; authors manage their own; owner may delete
drop policy if exists "family_notes_select" on public.family_notes;
drop policy if exists "family_notes_insert" on public.family_notes;
drop policy if exists "family_notes_update" on public.family_notes;
drop policy if exists "family_notes_delete" on public.family_notes;

create policy "family_notes_select" on public.family_notes for select
  using (
    exists (
      select 1 from public.items i
      where i.id = item_id and public.is_household_member(i.household_id)
    )
  );
create policy "family_notes_insert" on public.family_notes for insert
  with check (
    exists (
      select 1 from public.family_members fm
      join public.items i on i.id = item_id
      where fm.id = family_member_id
        and fm.user_id = auth.uid()
        and fm.household_id = i.household_id
    )
  );
create policy "family_notes_update" on public.family_notes for update
  using (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id and fm.user_id = auth.uid()
    )
  );
create policy "family_notes_delete" on public.family_notes for delete
  using (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id and fm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.items i
      where i.id = item_id and public.is_household_owner(i.household_id)
    )
  );

-- household_invites: owner-only. Family members never read invites directly;
-- the join-household edge function (service role) validates codes, so codes
-- cannot be enumerated.
drop policy if exists "household_invites_select" on public.household_invites;
drop policy if exists "household_invites_insert" on public.household_invites;
drop policy if exists "household_invites_delete" on public.household_invites;

create policy "household_invites_select" on public.household_invites for select
  using (public.is_household_owner(household_id));
create policy "household_invites_insert" on public.household_invites for insert
  with check (public.is_household_owner(household_id));
create policy "household_invites_delete" on public.household_invites for delete
  using (public.is_household_owner(household_id));

-- 6. Storage: photos readable by household members, writable by the owner.
-- Photo paths are "<household_id>/<item_id>.jpg" so the first path segment
-- identifies the household.

drop policy if exists "item_photos_select" on storage.objects;
drop policy if exists "item_photos_insert" on storage.objects;
drop policy if exists "item_photos_update" on storage.objects;
drop policy if exists "item_photos_delete" on storage.objects;

create policy "item_photos_select" on storage.objects for select
  using (
    bucket_id = 'item-photos'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
create policy "item_photos_insert" on storage.objects for insert
  with check (
    bucket_id = 'item-photos'
    and public.is_household_owner(((storage.foldername(name))[1])::uuid)
  );
create policy "item_photos_update" on storage.objects for update
  using (
    bucket_id = 'item-photos'
    and public.is_household_owner(((storage.foldername(name))[1])::uuid)
  );
create policy "item_photos_delete" on storage.objects for delete
  using (
    bucket_id = 'item-photos'
    and public.is_household_owner(((storage.foldername(name))[1])::uuid)
  );
