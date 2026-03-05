# PM Copilot — AI-Native Project Management

Built on Next.js 14 · Convex · Clerk · Claude API

---

## Iteration 1 Setup — Schema, Auth & App Shell

### Prerequisites
- Node.js 18+
- A [Clerk](https://clerk.com) account (free)
- A [Convex](https://convex.dev) account (free)

---

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Set up Clerk

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application
3. Enable **Google OAuth** and **Email** sign-in
4. Copy your keys from **API Keys** tab

### Step 3 — Set up Convex + Clerk JWT integration

1. Run `npx convex dev` — this creates your Convex deployment and starts the dev server
2. In [Convex Dashboard](https://dashboard.convex.dev) → your project → **Settings → Authentication**
3. Add Clerk as an auth provider, paste your **Clerk Frontend API URL**
4. In **Clerk Dashboard → JWT Templates** → create a new **Convex** template
5. Copy the **Issuer URL** from the template (your `CLERK_JWT_ISSUER_DOMAIN`)

### Step 4 — Create your .env.local
```bash
cp .env.example .env.local
```

Fill in:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

### Step 5 — Run the development servers

In two terminals:

**Terminal 1 — Convex backend:**
```bash
npx convex dev
```

**Terminal 2 — Next.js frontend:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Verification Checklist

1. Navigate to `http://localhost:3000` → redirects to `/dashboard`
2. Redirected to `/sign-in` (Clerk auth wall active)
3. Sign in with Google → lands on `/dashboard`
4. Dashboard renders with three-panel layout:
   - 64px icon nav on left (Dashboard + Projects icons)
   - Main content area with stat cards and empty project table
   - 320px AI panel on right with command hints
5. Navigate to `/projects/any-id` → project shell renders
6. Check Convex Dashboard → **Data** → `users` table has your user record
7. Check Convex Dashboard → **Data** → `workspaces` table has your workspace

---

## What's in scope (Iteration 1)
- ✅ Full Convex schema (all 7 tables — never changed again)
- ✅ Clerk Google OAuth + email auth
- ✅ Convex users upsert on first sign-in (creates workspace)
- ✅ Three-panel layout shell (64px nav / main / 320px AI panel)
- ✅ Routes: `/` → `/dashboard`, `/dashboard`, `/projects/[id]`
- ✅ Full design token system (#0F1117 background, #9D7FEA AI accent, DM Sans / DM Mono)
- ✅ Sign-in / sign-up pages styled to match design system

## What's out of scope (Iteration 1)
- ❌ Jira integration (Iteration 2)
- ❌ Real project/ticket data (Iteration 2)
- ❌ Board health scoring (Iteration 3)
- ❌ Claude API / AI actions (Iteration 4)
- ❌ Billing, settings, onboarding flow (post-MVP)

---

## Iteration 2 Setup — Jira OAuth, Project Import & Ticket Sync

### New environment variables

**Next.js `.env.local`:**
```
JIRA_CLIENT_ID=...          # Atlassian Developer Console → your OAuth app
JIRA_CLIENT_SECRET=...      # Atlassian Developer Console → your OAuth app
JIRA_REDIRECT_URI=http://localhost:3000/api/jira/callback
ENCRYPTION_KEY=<64-char hex>  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Convex (must be set separately):**
```bash
npx convex env set ENCRYPTION_KEY <same 64-char hex as above>
```

### Setting up the Jira OAuth app

1. Go to https://developer.atlassian.com/console/myapps/
2. Create a new **OAuth 2.0 (3LO)** app
3. Set **Callback URL** to `http://localhost:3000/api/jira/callback` (local) or your production URL
4. Add **API scopes**: `read:jira-work`, `read:jira-user`, `offline_access`
5. Copy **Client ID** and **Secret** to `.env.local`

### How to verify Iteration 2

1. Sign in → Dashboard → click **Connect Jira**
2. Authorize on Atlassian → redirects back to `/dashboard?connected=1`
3. Projects appear in the dashboard list with names, keys, ticket counts
4. Click a project → ticket list renders with status, assignee, priority, story points
5. Click **Sync Now** → ticket data refreshes
6. Check Convex Dashboard → **Data** → `projects` and `tickets` tables populated
7. Check Convex Dashboard → **Crons** → `sync all jira projects` scheduled every 15 minutes

### What's in scope (Iteration 2)
- ✅ Jira OAuth 2.0 (3LO) — full authorize + callback flow
- ✅ AES-256-GCM token encryption at rest
- ✅ Convex action: syncJiraProjects (all projects for workspace)
- ✅ Convex action: syncJiraTickets (all tickets for a project, paginated)
- ✅ Convex cron: syncJiraTickets every 15 minutes
- ✅ Live dashboard with project list (name, key, ticket count, last synced)
- ✅ Project view with ticket table + filter bar (status, assignee, priority, search)
- ✅ "Sync Now" button on project view

### What's out of scope (Iteration 2)
- ❌ Health scoring on tickets (Iteration 3)
- ❌ AI/Claude calls (Iteration 4)
- ❌ Jira webhooks — cron polling only (post-MVP)
