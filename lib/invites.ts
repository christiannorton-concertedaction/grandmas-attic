import { supabase } from './supabase';
import { getHouseholdId, clearMembershipCache } from './household';

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
 * RLS restricts this to the household owner.
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
 * given the old code can no longer join with it (already-joined members
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
 * Joins a household using an invite code. Validation happens in the
 * join-household edge function (service role), so invite codes can never
 * be read or enumerated by clients. Returns false for an invalid code.
 */
export async function joinHouseholdWithCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== CODE_LENGTH) return false;

  const { data, error } = await supabase.functions.invoke('join-household', {
    body: { code: normalized },
  });

  if (error) {
    // supabase-js surfaces non-2xx responses as FunctionsHttpError with the
    // JSON body available on the context response.
    const context = (error as { context?: Response }).context;
    let body: { error?: string } | null = null;
    if (context) {
      body = await context.json().catch(() => null);
    }
    if (body?.error === 'invalid_code') return false;
    throw new Error(body?.error ?? 'Failed to join. Please try again.');
  }

  if (data?.error === 'invalid_code') return false;
  if (data?.error) throw new Error(data.error);

  clearMembershipCache();
  return true;
}
