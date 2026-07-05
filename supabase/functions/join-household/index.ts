import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);

    // Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(jwt);

    if (userError || !user) {
      return jsonResponse({ error: 'Not signed in' }, 401);
    }

    const { code, name } = (await req.json()) as {
      code?: string;
      name?: string;
    };
    const normalized = (code ?? '').trim().toUpperCase();
    if (!normalized) {
      return jsonResponse({ error: 'Invite code is required' }, 400);
    }

    // Validate the invite code.
    const { data: invite, error: inviteError } = await admin
      .from('household_invites')
      .select('household_id')
      .eq('code', normalized)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) {
      return jsonResponse({ error: 'invalid_code' }, 404);
    }

    const householdId = invite.household_id as string;

    // One household per user (v1). Re-joining the same household is a no-op.
    const { data: existing, error: existingError } = await admin
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      if (existing.household_id === householdId) {
        return jsonResponse({ household_id: householdId, role: existing.role });
      }
      return jsonResponse(
        {
          error:
            'You already belong to a household. Leave it first to join a different one.',
        },
        409
      );
    }

    const { error: memberError } = await admin
      .from('household_members')
      .insert({ household_id: householdId, user_id: user.id, role: 'family' });

    if (memberError) throw memberError;

    // Ensure a family_member identity row exists for this user.
    const displayName =
      name?.trim() ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Family member';

    const { data: existingIdentity, error: identityError } = await admin
      .from('family_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (identityError) throw identityError;
    if (!existingIdentity) {
      const { error: createIdentityError } = await admin
        .from('family_members')
        .insert({
          household_id: householdId,
          user_id: user.id,
          name: displayName,
        });
      if (createIdentityError) throw createIdentityError;
    }

    return jsonResponse({ household_id: householdId, role: 'family' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
