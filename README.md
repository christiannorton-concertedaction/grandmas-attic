# Grandma's Attic

Catalog items around your home with photos, AI-powered identification and value estimates, notes, and keep/sell decisions.

## Stack

- **Expo** (React Native) — iPhone app
- **Supabase** — Postgres database, photo storage, Edge Functions
- **OpenAI GPT-4o Vision** — item identification and value estimates

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the migrations in order:
   - `supabase/migrations/001_create_items.sql`
   - `supabase/migrations/002_add_family_members.sql`
   - `supabase/migrations/003_add_prominence.sql`
   - `supabase/migrations/004_add_decision_options.sql`
   - `supabase/migrations/005_add_analysis_status.sql`
3. Copy your project URL and anon key

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy the AI Edge Function

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set EBAY_APP_ID=your-ebay-app-id  # Optional, for eBay pricing
supabase functions deploy analyze-item
supabase functions deploy analyze-batch
supabase functions deploy ebay-pricing
```

The edge function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically in production.

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone, or press `i` for the iOS simulator.

## App flow

1. **Items tab** — view everything you've cataloged
2. **Add tab** — batch capture: take multiple photos with stories → analyze all at once (saves ~90% on AI costs)
3. **Item detail** — edit notes, change decision, view eBay pricing, delete item

## Cost Optimization

The app is designed to minimize AI and API costs:

- **Batch Analysis**: Queue multiple photos and analyze them together instead of one at a time
- **GPT-4o-mini**: Uses the smaller, cheaper model (~90% less than GPT-4o)
- **Image Compression**: Photos are compressed to 1024px before upload (reduces storage and API costs)
- **eBay Pricing**: Real sold prices from eBay supplement AI estimates (free API)

## Decision options

- Undecided
- Keep
- Sell on eBay
- Garage Sale
- Donate
- Trash
- Give to Family Member (tag any family member by name)

### Family Members

You can add family members by name (e.g., "Sarah", "Mike", "Grandma June") and tag items with them. Family members can be added directly from the decision picker when cataloging or editing an item. The family member list is scoped to your household.

### Story & History (Prominence)

Each item can have a "Story & History" field where you can record:
- Where the item came from
- Who owned it previously
- Why it matters to the family
- Memories associated with it

This helps preserve the sentimental value and history of items, especially useful for heirlooms and keepsakes.

## Notes

- v1 uses a device-local `household_id` (no login). Data stays on this phone's scope.
- AI value estimates are rough guides, not professional appraisals.
- Requires Node.js 18.18+ (20+ recommended) for development.
