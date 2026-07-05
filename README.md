# Grandma's Attic

Catalog items around your home with photos, AI-powered identification and value estimates, notes, and keep/sell decisions. Family members can browse the catalog, leave notes, and indicate interest in items.

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
   - `supabase/migrations/006_add_family_features.sql`
   - `supabase/migrations/007_add_household_invites.sql`
   - `supabase/migrations/008_add_accounts.sql`
3. Copy your project URL and anon key

### 2b. Configure OAuth sign-in (no passwords)

Users sign in with Apple or Google — there are no passwords to manage.

**Sign in with Apple** (required for the App Store if you offer other social logins):
1. In the [Apple Developer portal](https://developer.apple.com), enable the "Sign in with Apple" capability for your bundle id (`com.grandmasattic.app`).
2. In the Supabase dashboard, go to **Authentication → Providers → Apple**, enable it, and add your bundle id as the client id.
3. The app uses the native Apple sign-in sheet on iOS (no browser round-trip).

**Google:**
1. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com) (type: Web application).
2. Add your Supabase callback URL (`https://your-project.supabase.co/auth/v1/callback`) as an authorized redirect URI.
3. In the Supabase dashboard, go to **Authentication → Providers → Google**, enable it, and paste the client id and secret.
4. In **Authentication → URL Configuration**, add the app's redirect URL `grandmas-attic://` to the allowed redirect URLs.

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy the Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set EBAY_APP_ID=your-ebay-app-id  # Optional, for eBay pricing
supabase functions deploy analyze-item
supabase functions deploy analyze-batch
supabase functions deploy ebay-pricing
supabase functions deploy join-household
```

The edge function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically in production.

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone, or press `i` for the iOS simulator.

## Accounts & Roles

Everyone signs in with **Apple or Google** (OAuth — no passwords). A user's role comes from their household membership on the server, enforced by row level security:

### Owner ("Grandma")
- Creates the household during onboarding
- Add, edit, and delete items; AI analysis and valuation
- Make decisions about items (keep, sell, donate, etc.)
- Manage family members and the invite code
- See who is interested in items and read family comments

### Family
- Joins the owner's household with an invite code
- Browse the catalog of completed items
- Mark items they're interested in ("I want this")
- Leave notes/comments on items
- Identity comes from their account — no impersonation

## Household Invites

Family members join the owner's household with an **invite code** — there is no way to browse or request access to other households.

- The owner finds their 6-character invite code in **Settings → Invite Family** and can share it via the system share sheet.
- A family member signs in on their own phone, chooses "I'm Family", and enters the code to join.
- Codes are validated server-side (edge function); clients can never read or enumerate them.
- The owner can generate a new code at any time; the old code stops working immediately, but members who already joined keep their access.
- Family members can leave a household from Settings and rejoin later with a current code.

## Security model

- **Row level security** on every table: members can only read data for their own household; only the owner can write items, photos, and invites; family users can only manage their own interests, notes, and identity.
- **Storage policies**: item photos are readable only by household members and writable only by the owner.
- **Edge functions** verify the caller's JWT: only the household owner can trigger (and pay for) batch AI analysis; joining a household is validated server-side.

## App flow

### Owner Flow
1. **Sign in** with Apple or Google → choose "I'm the Owner" (creates your household)
2. **Items tab** — view everything you've cataloged
3. **Add tab** — batch capture: take multiple photos with stories → analyze all at once (saves ~90% on AI costs)
4. **Item detail** — edit notes, change decision, view eBay pricing, see family interest, delete item
5. **Settings tab** — share/regenerate invite code, sign out

### Family Flow
1. **Sign in** with Apple or Google → choose "I'm Family" → enter the owner's invite code
2. **Browse tab** — view all cataloged items
3. **Item detail** — view details, mark interest, leave comments
4. **My Interests tab** — see items you've marked as wanting
5. **Settings tab** — leave household, sign out

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

## Family Collaboration

### Interest Tracking
Family members can mark items they're interested in. The owner sees:
- Heart indicators on item cards showing how many family members want each item
- List of interested family members on item detail pages

### Family Notes
Family members can leave comments on items. Notes appear on the item detail page for both the owner and other family members to read.

## Notes

- Sign in with Apple and native OAuth require a development build (`npx expo run:ios`); they do not work in Expo Go.
- Family member identity is created automatically from the account's name when joining. The owner can still create name-only family members (no account) to tag items like "give to Sarah".
- AI value estimates are rough guides, not professional appraisals.
- Requires Node.js 18.18+ (20+ recommended) for development.
