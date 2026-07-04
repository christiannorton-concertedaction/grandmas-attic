import { supabase } from './supabase';
import { getHouseholdId } from './household';

export interface ItemInterest {
  id: string;
  item_id: string;
  family_member_id: string;
  created_at: string;
}

export interface FamilyNote {
  id: string;
  item_id: string;
  family_member_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ItemInterestWithMember extends ItemInterest {
  family_member: {
    id: string;
    name: string;
  };
}

export interface FamilyNoteWithMember extends FamilyNote {
  family_member: {
    id: string;
    name: string;
  };
}

export async function getItemInterests(itemId: string): Promise<ItemInterestWithMember[]> {
  const { data, error } = await supabase
    .from('item_interests')
    .select('*, family_member:family_members(id, name)')
    .eq('item_id', itemId);

  if (error) throw error;
  return (data ?? []) as ItemInterestWithMember[];
}

export async function addItemInterest(
  itemId: string,
  familyMemberId: string
): Promise<ItemInterest> {
  const { data, error } = await supabase
    .from('item_interests')
    .insert({ item_id: itemId, family_member_id: familyMemberId })
    .select('*')
    .single();

  if (error) throw error;
  return data as ItemInterest;
}

export async function removeItemInterest(
  itemId: string,
  familyMemberId: string
): Promise<void> {
  const { error } = await supabase
    .from('item_interests')
    .delete()
    .eq('item_id', itemId)
    .eq('family_member_id', familyMemberId);

  if (error) throw error;
}

export async function hasInterest(
  itemId: string,
  familyMemberId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('item_interests')
    .select('id')
    .eq('item_id', itemId)
    .eq('family_member_id', familyMemberId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function getFamilyNotes(itemId: string): Promise<FamilyNoteWithMember[]> {
  const { data, error } = await supabase
    .from('family_notes')
    .select('*, family_member:family_members(id, name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FamilyNoteWithMember[];
}

export async function addFamilyNote(
  itemId: string,
  familyMemberId: string,
  note: string
): Promise<FamilyNote> {
  const { data, error } = await supabase
    .from('family_notes')
    .insert({
      item_id: itemId,
      family_member_id: familyMemberId,
      note: note.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as FamilyNote;
}

export async function updateFamilyNote(
  noteId: string,
  note: string
): Promise<FamilyNote> {
  const { data, error } = await supabase
    .from('family_notes')
    .update({ note: note.trim() })
    .eq('id', noteId)
    .select('*')
    .single();

  if (error) throw error;
  return data as FamilyNote;
}

export async function deleteFamilyNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('family_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}

export async function getInterestCounts(): Promise<Map<string, number>> {
  const householdId = await getHouseholdId();
  
  const { data, error } = await supabase
    .from('item_interests')
    .select('item_id, items!inner(household_id)')
    .eq('items.household_id', householdId);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const itemId = row.item_id;
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }
  return counts;
}
