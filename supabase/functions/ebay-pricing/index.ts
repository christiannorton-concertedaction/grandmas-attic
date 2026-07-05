import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  query: string;
  limit?: number;
}

interface SoldItem {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  condition: string;
  url: string;
}

interface PricingResponse {
  query: string;
  results: SoldItem[];
  stats: {
    count: number;
    avgPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    medianPrice: number | null;
  };
}

async function searchEbaySoldListings(
  appId: string,
  query: string,
  limit: number = 10
): Promise<SoldItem[]> {
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': query,
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': limit.toString(),
  });

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`eBay API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

  return items.map((item: any) => ({
    title: item.title?.[0] || '',
    price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
    currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
    soldDate: item.listingInfo?.[0]?.endTime?.[0] || '',
    condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
    url: item.viewItemURL?.[0] || '',
  }));
}

function calculateStats(items: SoldItem[]): PricingResponse['stats'] {
  if (items.length === 0) {
    return {
      count: 0,
      avgPrice: null,
      minPrice: null,
      maxPrice: null,
      medianPrice: null,
    };
  }

  const prices = items.map((i) => i.price).filter((p) => p > 0).sort((a, b) => a - b);
  
  if (prices.length === 0) {
    return {
      count: items.length,
      avgPrice: null,
      minPrice: null,
      maxPrice: null,
      medianPrice: null,
    };
  }

  const sum = prices.reduce((a, b) => a + b, 0);
  const avg = sum / prices.length;
  const median = prices.length % 2 === 0
    ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
    : prices[Math.floor(prices.length / 2)];

  return {
    count: items.length,
    avgPrice: Math.round(avg * 100) / 100,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    medianPrice: Math.round(median * 100) / 100,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ebayAppId = Deno.env.get('EBAY_APP_ID');
    if (!ebayAppId) {
      return new Response(
        JSON.stringify({ 
          error: 'eBay API not configured',
          query: '',
          results: [],
          stats: { count: 0, avgPrice: null, minPrice: null, maxPrice: null, medianPrice: null }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, limit = 20 }: PricingRequest = await req.json();
    if (!query) {
      throw new Error('query is required');
    }

    const items = await searchEbaySoldListings(ebayAppId, query, limit);
    const stats = calculateStats(items);

    const result: PricingResponse = {
      query,
      results: items,
      stats,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
