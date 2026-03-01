# MotionFi

AI-powered personal accountant and financial analyst. Upload bank statements, get spending analysis, detect subscriptions, and chat with an AI that knows your finances.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** for UI
- **Supabase** (Postgres + Auth) for database and authentication
- **OpenAI API** (GPT-4o-mini) for transaction categorization and financial analysis
- **Recharts** for data visualization
- **PapaParse** for CSV parsing
- **Zod** for validation

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### 2. Environment Variables

Copy the example env file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `OPENAI_API_KEY` | OpenAI API key (server-side only) |

### 3. Database Setup

Run the SQL migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migrations/001_schema.sql
# and execute it in the Supabase SQL Editor
```

This creates:
- `profiles` table with RLS (auto-created on signup)
- `transactions` table with RLS
- `chat_messages` table with RLS
- Row Level Security policies ensuring users only access their own data

**Important**: In your Supabase dashboard, go to **Authentication > Providers** and ensure Email auth is enabled. For development, you may want to disable email confirmation under **Authentication > Settings**.

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Email/password authentication (sign up & sign in) |
| `/onboarding` | Set monthly income, fixed costs, and financial goals |
| `/upload` | Upload CSV bank statements — auto-categorized via rules + AI |
| `/dashboard` | Spending by category, income vs expenses, top merchants, recurring subscriptions, Financial Confidence Score |
| `/chat` | Chat with your AI financial analyst — get insights, risks, and recommendations |

## CSV Format

The upload accepts CSV files with columns for date, description, and amount. Column names are matched flexibly:

- **Date**: `date`, `posted_at`, `posted`, `transaction_date`, etc.
- **Description**: `description`, `desc`, `memo`, `narrative`, etc.
- **Amount**: `amount`, `total`, `value`, `debit`, etc.

Positive amounts are treated as income; negative amounts as expenses.

A demo CSV can be downloaded from the Upload page for testing.

## Architecture

### Transaction Categorization

1. **Local rules**: A keyword map for 50+ common merchants (Walmart → Groceries, Netflix → Subscriptions, etc.)
2. **Positive amounts**: Auto-classified as Income
3. **AI fallback**: Unrecognized descriptions are batched and sent to GPT-4o-mini for classification into 13 predefined categories

### Financial Confidence Score (0–100)

Computed deterministically from three factors:
- **Savings Rate** (0–40 pts): `(income - expenses) / income`
- **Expense Stability** (0–30 pts): Coefficient of variation across recent months (lower = better)
- **Emergency Runway** (0–30 pts): Estimated months of expenses covered by monthly savings

### AI Chat

- Builds a compact JSON summary from the last 90 days of transactions
- Selects top 50 relevant transactions based on keyword matching, recency, and amount
- Uses GPT-4o-mini with JSON mode to return structured insights, risks, and recommendations

## Security

- OpenAI API key is server-side only (never in client bundle)
- User session validated on every API route
- Row Level Security on all Supabase tables
- No account numbers or raw CSV content stored
- Only normalized transactions are persisted

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Login/signup page
│   ├── (app)/               # Authenticated app layout
│   │   ├── onboarding/      # Financial profile setup
│   │   ├── upload/          # CSV upload page
│   │   ├── dashboard/       # Spending dashboard
│   │   └── chat/            # AI analyst chat
│   ├── api/
│   │   ├── upload/          # CSV processing endpoint
│   │   └── chat/            # AI chat endpoint
│   ├── layout.tsx
│   └── page.tsx             # Landing page
├── components/
│   ├── nav.tsx              # App navigation
│   ├── spending-chart.tsx   # Category bar chart
│   └── score-gauge.tsx      # Financial score gauge
├── lib/
│   ├── supabase/            # Supabase client configs
│   ├── types.ts             # TypeScript interfaces
│   ├── categorize.ts        # Merchant extraction + categorization
│   ├── csv-parser.ts        # CSV parsing + normalization
│   ├── summary.ts           # Monthly summaries, recurring detection, score
│   ├── chat-context.ts      # Build compact context for AI chat
│   └── openai.ts            # OpenAI integration
└── middleware.ts             # Auth middleware
```
