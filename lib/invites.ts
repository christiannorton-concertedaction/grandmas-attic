import { supabase } from './supabase';
import {
  getHouseholdId,
  setHouseholdId,
  markJoinedHousehold,
} from './household';

// No ambiguous characters (0/O, 1/I/L) so codes are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function createInvite(householdId: string): Promise<string> {
  // Retry a few times in case of a code collision (primary key conflict).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabase
      .from('household_invites')
      .insert({ code, household_id: householdId });

    if (!error) return code;
    if (error.code !== '23505') throw error;
  }
  throw new Error('Failed to generate an invite code. Please try again.');
}

/**
 * Returns the household's invite code, creating one if none exists yet.
 * Only used on the owner's device.
 */
export async function getOrCreateInviteCode(): Promise<string> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('household_invites')
    .select('code')
    .eq('household_id', householdId)
    .limit(1);

  if (error) throw error;
  if (data && data.length > 0) return data[0].code as string;

  return createInvite(householdId);
}

/**
 * Invalidates the current invite code and issues a new one. Anyone who was
 * given the old code can no longer join with it (already-joined devices
 * keep their access).
 */
export async function regenerateInviteCode(): Promise<string> {
  const householdId = await getHouseholdId();
  const { error } = await supabase
    .from('household_invites')
    .delete()
    .eq('household_id', householdId);

  if (error) throw error;
  return createInvite(householdId);
}

/**
 * Joins the household that the code belongs to. Returns false if the code
 * is invalid. On success the device's household id is switched to the
 * owner's household.
 */
export async function joinHouseholdWithCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== CODE_LENGTH) return false;

  const { data, error } = await supabase
    .from('household_invites')
    .select('household_id')
    .eq('code', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  await setHouseholdId(data.household_id as string);
  await markJoinedHousehold();
  return true;
}
