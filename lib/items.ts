import { PHOTO_BUCKET, supabase } from './supabase';
import { getHouseholdId } from './household';
import type {
  AnalyzeResult,
  CreateItemInput,
  Decision,
  Item,
} from '@/types/item';

export async function listItems(): Promise<Item[]> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function getItem(id: string): Promise<Item | null> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) throw error;
  return data as Item | null;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .insert({
      ...(input.id ? { id: input.id } : {}),
      household_id: householdId,
      photo_path: input.photo_path,
      title: input.title,
      description: input.description,
      estimated_value_low: input.estimated_value_low,
      estimated_value_high: input.estimated_value_high,
      notes: input.notes ?? null,
      decision: input.decision ?? 'undecided',
      ai_confidence: input.ai_confidence ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItemNotes(
  id: string,
  notes: string
): Promise<Item> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .update({ notes })
    .eq('id', id)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItemDecision(
  id: string,
  decision: Decision
): Promise<Item> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .update({ decision })
    .eq('id', id)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Item;
}

export async function deleteItem(id: string, photoPath: string): Promise<void> {
  const householdId = await getHouseholdId();
  const { error: storageError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([photoPath]);

  if (storageError) throw storageError;

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId);

  if (error) throw error;
}

export async function getPhotoSignedUrl(
  photoPath: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(photoPath, expiresIn);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function uploadItemPhoto(
  localUri: string,
  itemId: string
): Promise<string> {
  const householdId = await getHouseholdId();
  const photoPath = `${householdId}/${itemId}.jpg`;

  const response = await fetch(localUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(photoPath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;
  return photoPath;
}

export async function analyzeItemPhoto(
  photoPath: string
): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke('analyze-item', {
    body: { photo_path: photoPath },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as AnalyzeResult;
}
