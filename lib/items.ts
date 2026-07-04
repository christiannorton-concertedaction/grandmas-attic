import { PHOTO_BUCKET, supabase } from './supabase';
import { getHouseholdId } from './household';
import { compressImage } from './imageCompression';
import type {
  AnalyzeResult,
  AnalysisStatus,
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
      title: input.title ?? null,
      description: input.description ?? '',
      estimated_value_low: input.estimated_value_low ?? null,
      estimated_value_high: input.estimated_value_high ?? null,
      notes: input.notes ?? null,
      prominence: input.prominence ?? null,
      decision: input.decision ?? 'undecided',
      family_member_id: input.family_member_id ?? null,
      ai_confidence: input.ai_confidence ?? null,
      analysis_status: input.analysis_status ?? 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Item;
}

export async function createPendingItem(
  photoPath: string,
  prominence?: string | null
): Promise<Item> {
  return createItem({
    photo_path: photoPath,
    prominence: prominence ?? null,
    analysis_status: 'pending',
  });
}

export async function listPendingItems(): Promise<Item[]> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('household_id', householdId)
    .eq('analysis_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function updateItemAnalysis(
  id: string,
  analysis: {
    title: string;
    description: string;
    estimated_value_low: number | null;
    estimated_value_high: number | null;
    ai_confidence: 'low' | 'medium' | 'high';
    analysis_status: AnalysisStatus;
    analysis_error?: string | null;
  }
): Promise<Item> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .update(analysis)
    .eq('id', id)
    .eq('household_id', householdId)
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

export async function updateItemProminence(
  id: string,
  prominence: string
): Promise<Item> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase
    .from('items')
    .update({ prominence })
    .eq('id', id)
    .eq('household_id', householdId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItemDecision(
  id: string,
  decision: Decision,
  familyMemberId?: string | null
): Promise<Item> {
  const householdId = await getHouseholdId();
  const updateData: { decision: Decision; family_member_id?: string | null } = { decision };
  
  if (decision === 'family_member') {
    updateData.family_member_id = familyMemberId ?? null;
  } else {
    updateData.family_member_id = null;
  }

  const { data, error } = await supabase
    .from('items')
    .update(updateData)
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

  const compressed = await compressImage(localUri);
  
  const response = await fetch(compressed.uri);
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
  photoPath: string,
  prominence?: string
): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke('analyze-item', {
    body: { photo_path: photoPath, prominence },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as AnalyzeResult;
}

export interface BatchAnalysisResult {
  message: string;
  processed: number;
  failed: number;
  results: { id: string; success: boolean; error?: string }[];
}

export async function analyzePendingItems(): Promise<BatchAnalysisResult> {
  const householdId = await getHouseholdId();
  const { data, error } = await supabase.functions.invoke('analyze-batch', {
    body: { household_id: householdId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data as BatchAnalysisResult;
}

export interface EbayPricingResult {
  query: string;
  results: {
    title: string;
    price: number;
    currency: string;
    soldDate: string;
    condition: string;
    url: string;
  }[];
  stats: {
    count: number;
    avgPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    medianPrice: number | null;
  };
}

export async function getEbayPricing(query: string): Promise<EbayPricingResult> {
  const { data, error } = await supabase.functions.invoke('ebay-pricing', {
    body: { query, limit: 20 },
  });

  if (error) throw error;
  if (data?.error && data.error !== 'eBay API not configured') {
    throw new Error(data.error);
  }

  return data as EbayPricingResult;
}
