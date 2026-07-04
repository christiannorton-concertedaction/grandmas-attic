export type Decision =
  | 'undecided'
  | 'ebay'
  | 'garage_sale'
  | 'child_a'
  | 'child_b';

export type AiConfidence = 'low' | 'medium' | 'high';

export interface Item {
  id: string;
  household_id: string;
  photo_path: string;
  title: string;
  description: string;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  notes: string | null;
  decision: Decision;
  ai_confidence: AiConfidence | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyzeResult {
  title: string;
  description: string;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  confidence: AiConfidence;
}

export interface CreateItemInput {
  id?: string;
  photo_path: string;
  title: string;
  description: string;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  notes?: string | null;
  decision?: Decision;
  ai_confidence?: AiConfidence | null;
}

export const DECISIONS: Decision[] = [
  'undecided',
  'ebay',
  'garage_sale',
  'child_a',
  'child_b',
];

export const DECISION_LABELS: Record<Decision, string> = {
  undecided: 'Undecided',
  ebay: 'Sell on eBay',
  garage_sale: 'Garage Sale',
  child_a: 'Child A wants it',
  child_b: 'Child B wants it',
};

export const DECISION_COLORS: Record<Decision, string> = {
  undecided: '#9CA3AF',
  ebay: '#2563EB',
  garage_sale: '#16A34A',
  child_a: '#9333EA',
  child_b: '#DB2777',
};

export function formatValueRange(
  low: number | null,
  high: number | null
): string {
  if (low == null && high == null) return 'Value unknown';
  if (low != null && high != null) {
    if (low === high) return `$${Math.round(low)}`;
    return `$${Math.round(low)} – $${Math.round(high)}`;
  }
  const value = low ?? high;
  return value != null ? `~$${Math.round(value)}` : 'Value unknown';
}
