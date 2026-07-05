import { supabase } from './supabase';
import { getMyMembership, type HouseholdRole } from './household';
import type { FamilyMember } from '@/types/item';

export type UserRole = HouseholdRole;

/**
 * The user's role now comes from their household membership on the server
 * (not device storage), so it can't be spoofed by switching modes locally.
 * Returns null when the user hasn't created or joined a household yet.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const membership = await getMyMembership();
  return membership?.role ?? null;
}

/**
 * The signed-in user's family member identity row within their household.
 * Created automatically by the join-household edge function; may be null
 * for owners (who don't need one) or if the owner deleted the row.
 */
export async function getMyFamilyMember(): Promise<FamilyMember | null> {
  const membership = await getMyMembership();
  if (!membership) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('household_id', membership.household_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as FamilyMember | null;
}

/**
 * Self-heal: recreate the user's identity row if it's missing (e.g. the
 * owner removed it). RLS allows members to insert their own row.
 */
export async function ensureMyFamilyMember(name: string): Promise<FamilyMember> {
  const existing = await getMyFamilyMember();
  if (existing) return existing;

  const membership = await getMyMembership();
  if (!membership) throw new Error('Not a member of a household');

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('family_members')
    .insert({
      household_id: membership.household_id,
      user_id: userId,
      name: name.trim() || 'Family member',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as FamilyMember;
}
