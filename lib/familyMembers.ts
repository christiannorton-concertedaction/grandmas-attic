import { supabase } from './supabase';
import { getHouseholdId } from './household';
import type { FamilyMember } from '@/types/item';

export async function listFamilyMembers(): Promise<FamilyMember[]> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('household_id', householdId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

export async function getFamilyMember(id: string): Promise<FamilyMember | null> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('id', id)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) throw error;
  return data as FamilyMember | null;
}

export async function createFamilyMember(name: string): Promise<FamilyMember> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      household_id: householdId,
      name: name.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as FamilyMember;
}

export async function updateFamilyMember(
  id: string,
  name: string
): Promise<FamilyMember> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('family_members')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error) throw error;
  return data as FamilyMember;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const householdId = await getHouseholdId();
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw error;
}
