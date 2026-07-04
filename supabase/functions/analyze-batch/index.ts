import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface BatchRequest {
  household_id: string;
}

interface ItemToAnalyze {
  id: string;
  photo_path: string;
  prominence: string | null;
}

interface AnalyzeResponse {
  title: string;
  description: string;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  confidence: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `You identify household items from photos for a decluttering app called Grandma's Attic.
Return JSON only with keys: title, description, estimated_value_low, estimated_value_high, confidence.
- title: short item name (max 8 words)
- description: 1-2 sentences about what it is, era/style if visible, condition cues
- estimated_value_low / estimated_value_high: USD resale estimate range as numbers (integers). Use null if truly unknown.
- confidence: "low", "medium", or "high" based on image clarity and identifiability
Estimates are rough resale guides for garage sales or eBay, NOT professional appraisals.
If you cannot identify the item, use title "Unknown item", describe what you see, null values, and confidence "low".`;

async function analyzeItem(
  openAiKey: string,
  imageUrl: string,
  prominence?: string | null
): Promise<AnalyzeResponse> {
  const userContent = prominence?.trim()
    ? `Identify this item and estimate its resale value range in USD.\n\nThe owner provided this context about the item's story/history:\n"${prominence.trim()}"\n\nUse this context to help identify the item more accurately (e.g., era, origin, type).`
    : 'Identify this item and estimate its resale value range in USD.';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userContent },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error: ${errText}`);
  }

  const completion = await response.json();
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content) as AnalyzeResponse;
  return {
    title: parsed.title?.trim() || 'Unknown item',
    description: parsed.description?.trim() || '',
    estimated_value_low:
      typeof parsed.estimated_value_low === 'number'
        ? Math.round(parsed.estimated_value_low)
        : null,
    estimated_value_high:
      typeof parsed.estimated_value_high === 'number'
        ? Math.round(parsed.estimated_value_high)
        : null,
    confidence: ['low', 'medium', 'high'].includes(parsed.confidence)
      ? parsed.confidence
      : 'low',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { household_id }: BatchRequest = await req.json();
    if (!household_id) {
      throw new Error('household_id is required');
    }

    const { data: pendingItems, error: fetchError } = await supabase
      .from('items')
      .select('id, photo_path, prominence')
      .eq('household_id', household_id)
      .eq('analysis_status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch pending items: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending items to analyze', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const item of pendingItems as ItemToAnalyze[]) {
      try {
        await supabase
          .from('items')
          .update({ analysis_status: 'analyzing' })
          .eq('id', item.id);

        const { data: signedData, error: signedError } = await supabase.storage
          .from('item-photos')
          .createSignedUrl(item.photo_path, 300);

        if (signedError || !signedData?.signedUrl) {
          throw new Error(signedError?.message ?? 'Failed to create signed URL');
        }

        const analysis = await analyzeItem(
          openAiKey,
          signedData.signedUrl,
          item.prominence
        );

        await supabase
          .from('items')
          .update({
            title: analysis.title,
            description: analysis.description,
            estimated_value_low: analysis.estimated_value_low,
            estimated_value_high: analysis.estimated_value_high,
            ai_confidence: analysis.confidence,
            analysis_status: 'completed',
            analysis_error: null,
          })
          .eq('id', item.id);

        results.push({ id: item.id, success: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        await supabase
          .from('items')
          .update({
            analysis_status: 'failed',
            analysis_error: errorMessage,
          })
          .eq('id', item.id);

        results.push({ id: item.id, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} items`,
        processed: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
