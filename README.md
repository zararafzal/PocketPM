# Pocket PM — AI-Native Project Management Copilot

> An AI-powered PM tool that connects to Jira, scores ticket health, analyses sprint risks, and drafts stakeholder updates — built with Next.js, Convex, Clerk, and Claude.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zararafzal/PocketPM)

---

## Features

- 🔗 **Jira Integration** — OAuth 2.0 connection, full project & ticket import, auto-sync every 15 minutes
- 🧠 **AI Ticket Health Scoring** — every ticket is scored on description quality, assignee, and estimate
- ⚡ **Sprint Risk Analysis** — Claude (Haiku + Sonnet) analyses your board and surfaces blocked/at-risk tickets
- 📝 **Stakeholder Status Updates** — one-click AI-drafted update for your whole sprint
- ✍️ **Ticket Rewriter** — rewrite any ticket to be clearer, more actionable, and better estimated
- 🔍 **Semantic Search** — Voyage AI embeddings on every ticket for context-aware AI responses
- 🔐 **Auth** — Clerk Google OAuth + email sign-in with JWT-authenticated Convex backend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend / DB | Convex (serverless functions + real-time DB) |
| Auth | Clerk |
| AI | Anthropic Claude (Haiku + Sonnet 3.5) |
| Embeddings | Voyage AI |
| Styling | Tailwind CSS |
| Deployment | Vercel (frontend) + Convex Cloud (backend) |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- [Clerk](https://clerk.com) account (free)
- [Convex](https://convex.dev) account (free)
- [Anthropic](https://console.anthropic.com) API key
- [Atlassian Developer](https://developer.atlassian.com/console/myapps/) OAuth app (for Jira)

### 1. Clone and install

```bash
git clone https://github.com/zararafzal/PocketPM.git
cd PocketPM
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Convex (auto-filled by npx convex dev)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Jira OAuth
JIRA_CLIENT_ID=your_client_id
JIRA_CLIENT_SECRET=your_client_secret
JIRA_REDIRECT_URI=http://localhost:3000/api/jira/callback

# Encryption (for Jira token storage)
ENCRYPTION_KEY=<64-char hex>  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Clerk JWT (for Convex auth)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

### 3. Set up Convex environment variables

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-...
npx convex env set ENCRYPTION_KEY <same 64-char hex>
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
```

### 4. Run the development servers

```bash
# Terminal 1 — Convex backend
npx convex dev

# Terminal 2 — Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Connecting Jira

1. Go to [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/)
2. Create a new **OAuth 2.0 (3LO)** app
3. Set the **Callback URL** to `http://localhost:3000/api/jira/callback` (or your production URL)
4. Add scopes: `read:jira-work`, `read:jira-user`, `write:jira-work`
5. Copy **Client ID** and **Secret** into `.env.local`
6. Sign in to the app → Dashboard → click **Connect Jira**

---

## Deploying to Vercel

### 1. Deploy Convex backend to production

```bash
npx convex deploy
```

Copy the production URL (e.g. `https://capable-snake-828.convex.cloud`).

### 2. Import to Vercel

Go to [vercel.com/new](https://vercel.com/new) → import `zararafzal/PocketPM` from GitHub.

Add all environment variables from `.env.local` plus set:
- `NEXT_PUBLIC_CONVEX_URL` → your production Convex URL
- `JIRA_REDIRECT_URI` → `https://your-app.vercel.app/api/jira/callback`

### 3. Update Jira OAuth callback URL

In your Atlassian app, update the **Callback URL** to your Vercel production URL.

---

## Project Structure

```
├── app/
│   ├── api/jira/          # Jira OAuth authorize + callback routes
│   ├── dashboard/         # Main dashboard page + layout
│   └── projects/[id]/     # Project detail page
├── components/
│   ├── dashboard/         # DashboardClient, ConnectJiraButton
│   ├── layout/            # IconNav, AIPanel, TopBar
│   ├── projects/          # ProjectPageClient, ticket table, filters, AI panels
│   └── slash/             # ⌘K slash command bar
├── convex/
│   ├── schema.ts          # Database schema (7 tables)
│   ├── jira.ts            # Jira sync actions
│   ├── rewriteTicket.ts   # AI ticket rewriter
│   ├── analyzeSprintRisk.ts # Sprint risk analysis
│   ├── draftStatusUpdate.ts # AI status update drafter
│   ├── embeddings.ts      # Voyage AI embedding pipeline
│   └── crons.ts           # 15-min Jira sync + embedding cron
└── lib/
    └── encryption.ts      # AES-256-GCM token encryption
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk public key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ | Convex deployment URL |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (set in Convex too) |
| `CLERK_JWT_ISSUER_DOMAIN` | ✅ | Clerk Frontend API URL (set in Convex too) |
| `ENCRYPTION_KEY` | ✅ | 64-char hex key for Jira token encryption (set in Convex too) |
| `JIRA_CLIENT_ID` | ✅ | Atlassian OAuth app Client ID |
| `JIRA_CLIENT_SECRET` | ✅ | Atlassian OAuth app Secret |
| `JIRA_REDIRECT_URI` | ✅ | OAuth callback URL |
| `VOYAGE_API_KEY` | Optional | Voyage AI key for ticket embeddings |

---

## License

MIT
