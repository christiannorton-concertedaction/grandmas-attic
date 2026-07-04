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
supabase functions deploy analyze-item
```

The edge function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically in production.

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone, or press `i` for the iOS simulator.

## App flow

1. **Items tab** — view everything you've cataloged
2. **Add tab** — take a photo → AI analyzes it → add notes and pick a decision → save
3. **Item detail** — edit notes, change decision, delete item

## Decision options

- Undecided
- Sell on eBay
- Garage Sale
- Give to Family Member (tag any family member by name)

### Family Members

You can add family members by name (e.g., "Sarah", "Mike", "Grandma June") and tag items with them. Family members can be added directly from the decision picker when cataloging or editing an item. The family member list is scoped to your household.

## Notes

- v1 uses a device-local `household_id` (no login). Data stays on this phone's scope.
- AI value estimates are rough guides, not professional appraisals.
- Requires Node.js 18.18+ (20+ recommended) for development.
