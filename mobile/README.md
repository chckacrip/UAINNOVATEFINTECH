# UA Innovate Fintech – iOS App

SwiftUI app that uses the same Supabase backend and **Next.js app as API** for uploads, household, chat, and Plaid.

## Requirements

- Xcode 15+
- iOS 16+
- Next.js backend running (e.g. `npm run dev` or your deployed URL)

## Quick start

1. **Open the project**  
   Open `mobile/UAInnovateFintech.xcodeproj` in Xcode (double‑click or File → Open).

2. **Configure backend and Supabase**  
   Edit `UAInnovateFintech/Config.plist` and set:
   - `BACKEND_BASE_URL`: your Next.js backend (e.g. `https://your-app.vercel.app` or `http://127.0.0.1:3000` for simulator).
   - `SUPABASE_URL`: same as in the Next.js `.env.local`.
   - `SUPABASE_ANON_KEY`: same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Next.js.

3. **Run**  
   Choose the **UAInnovateFintech** scheme and a simulator (or your device), then press **Run** (⌘R).  
   The first build will fetch the Supabase Swift package; sign in with the same account as the web app.

## Features (mirrors web app)

- **Auth**: Sign in / Sign up with email (Supabase).
- **Dashboard**: Summary of transactions, income vs expenses, budgets.
- **Transactions**: List, filter, add/edit (via Supabase + backend rules).
- **Upload**: CSV upload via Next.js `POST /api/upload` (Bearer token).
- **Profile / Settings**: Financial profile, budgets, goals (Supabase `profiles`).
- **Household**: Create/invite/accept (Next.js `GET/POST /api/household`).
- **Chat**: Ask questions (Next.js `POST /api/chat`).

## API (Next.js backend)

All Next.js API routes expect:

- **Authorization**: `Bearer <access_token>` (Supabase session `access_token`).

The app gets the token after Supabase sign-in and sends it on every request to the backend.

**Code signing:** To run on a real device, set your **Team** under Signing & Capabilities for the UAInnovateFintech target.

## Project structure

```
mobile/
├── README.md
├── Config.plist.example
├── UAInnovateFintech.xcodeproj   ← open this in Xcode
│   └── xcshareddata/xcschemes/UAInnovateFintech.xcscheme
└── UAInnovateFintech/
    ├── UAInnovateFintechApp.swift
    ├── ContentView.swift
    ├── Config/
    │   └── AppConfig.swift
    ├── Services/
    │   ├── SupabaseService.swift
    │   └── BackendAPIClient.swift
    ├── Models/
    │   └── Models.swift
    ├── Auth/
    │   └── LoginView.swift
    └── Views/
        ├── DashboardView.swift
        ├── TransactionsView.swift
        ├── UploadView.swift
        ├── ProfileView.swift
        └── MainTabView.swift
```
