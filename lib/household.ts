import { supabase } from './supabase';

export type HouseholdRole = 'owner' | 'family';

export interface Membership {
  household_id: string;
  role: HouseholdRole;
}

// Membership rarely changes, so cache it for the session. Cleared on
// sign-out / leave / join via clearMembershipCache().
let cachedMembership: Membership | null | undefined;

export function clearMembershipCache(): void {
  cachedMembership = undefined;
}

/**
 * The signed-in user's household membership, or null if they haven't
 * created or joined a household yet.
 */
export async function getMyMembership(): Promise<Membership | null> {
  if (cachedMembership !== undefined) return cachedMembership;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  cachedMembership = data as Membership | null;
  return cachedMembership;
}

/**
 * The current household id. Callers use this only after onboarding has
 * completed, so a missing membership is a programming error surfaced loudly.
 */
export async function getHouseholdId(): Promise<string> {
  const membership = await getMyMembership();
  if (!membership) {
    throw new Error('Not a member of a household yet');
  }
  return membership.household_id;
}

/**
 * Creates a household with the signed-in user as owner. Used during
 * onboarding when the user picks "I'm the Owner".
 */
export async function createHousehold(name = 'My Attic'): Promise<Membership> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Not signed in');

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, owner_user_id: userId })
    .select('id')
    .single();

  if (householdError) throw householdError;

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) throw memberError;

  const membership: Membership = {
    household_id: household.id as string,
    role: 'owner',
  };
  cachedMembership = membership;
  return membership;
}

/**
 * Family members can disconnect from a household. RLS only permits
 * deleting your own non-owner membership row.
 */
export async function leaveHousehold(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Not signed in');

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'family');

  if (error) throw error;
  clearMembershipCache();
}
