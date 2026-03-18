# AGENTS.md — AIRchetipo Workshop

## Stack
- **Next.js 15** (App Router, `src/` directory, Turbopack dev)
- **Supabase** for auth (OAuth via GitHub & Google managed providers) and storage
- **Prisma** for database access (connected to Supabase PostgreSQL)
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **shadcn/ui** for UI components

## File Structure
```
src/
  app/
    layout.tsx          # Root layout (Geist font, globals.css)
    page.tsx            # Home page (server component)
    providers.tsx       # Client wrapper (extensible)
    globals.css         # Tailwind + shadcn CSS vars
    dashboard/
      page.tsx          # Protected page (middleware guards)
    auth/
      signin/page.tsx   # Sign-in page (GitHub + Google OAuth)
      callback/route.ts # OAuth callback handler + Prisma user sync
      signout/route.ts  # POST handler for sign out
    api/
      hello/route.ts    # Example API route (GET + POST)
  components/ui/        # shadcn/ui components
  lib/
    utils.ts            # cn() utility (shadcn)
    prisma.ts           # Prisma client singleton
    supabase/
      client.ts         # Browser Supabase client
      server.ts         # Server Supabase client (cookies)
      middleware.ts      # Session refresh helper
  middleware.ts          # Protects /dashboard, refreshes session
prisma/
  schema.prisma         # User model (UUID, supabaseId, email, name, image)
```

## Common Tasks

### Add a shadcn/ui component
```bash
npx shadcn@latest add <component-name>
```

### Extend the Prisma schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Use `prisma` from `@/lib/prisma` to query

### Query with Prisma
```ts
import { prisma } from "@/lib/prisma";
const users = await prisma.user.findMany();
```

### Auth Patterns

**Server Component** (recommended):
```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Client Component**:
```ts
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Sign in with OAuth** (client-side):
```ts
const supabase = createClient();
await supabase.auth.signInWithOAuth({
  provider: "github", // or "google"
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

**User sync**: On OAuth callback, the user is automatically synced to Prisma via `prisma.user.upsert()` using `supabaseId` as the key. This keeps the `User` table in sync with Supabase Auth.

### Supabase Storage
```ts
const supabase = createClient(); // or await createClient() on server
const { data } = await supabase.storage.from("bucket").upload("path", file);
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — Supabase publishable key
- `DATABASE_URL` — Supabase PostgreSQL connection string (for Prisma)
  - Go to **Supabase Dashboard → Project Settings → Database → Connection string**
  - Select **Session Pooler** as connection method (not Direct — incompatible with IPv4)
  - Copy the connection string

## AIRchetipo Skills — Boilerplate Constraints

This project ships with a fully configured boilerplate. The skills `/airchetipo-inception` and `/airchetipo-backlog` **must** respect the existing implementation described above.

### Constraint for `airchetipo-inception` (Phase 2 — Technical Architecture)

When Leonardo (Architect) proposes the technical architecture:

- **Mandate the existing stack** — the base technology choices are not up for discussion:
  - Next.js 15 (App Router, `src/` directory, Turbopack dev)
  - Supabase (auth via GitHub & Google OAuth + storage)
  - Prisma (PostgreSQL, connected to Supabase)
  - Tailwind CSS v4 with `@tailwindcss/postcss`
  - shadcn/ui for UI components
- **Explain why** when presenting the stack: *"This project uses an existing boilerplate with auth, database, and UI already configured. Rebuilding would waste time and introduce inconsistencies."*
- **Additions are welcome** — Leonardo may propose new libraries, APIs, external services, or tools on top of the base stack, but must never replace or contradict it.
- **Pre-fill** the Technology Stack table in the PRD with the boilerplate values listed above.

### Constraint for `airchetipo-inception` and `airchetipo-backlog` (Requirements & Stories)

The following features are **already implemented** in the boilerplate. Agents must not generate functional requirements or user stories that recreate them:

- Email/password authentication (sign up, sign in, email verification)
- OAuth sign-in (GitHub & Google) with callback handling
- OAuth callback → Prisma user sync (`prisma.user.upsert` by `supabaseId`)
- Session management middleware (auto-refresh, route protection for `/dashboard`)
- Server-side and client-side Supabase client helpers (`@/lib/supabase/server`, `@/lib/supabase/client`)
- User model (`UUID`, `supabaseId`, `email`, `name`, `image`)
- Dashboard page (protected, displays user profile)
- Home page with auth-aware content
- shadcn/ui integration + Tailwind design tokens (`globals.css`)
- API route scaffold (`/api/hello`)

When generating FRs or user stories:

- **Skip** anything fully covered by the boilerplate list above.
- If a requirement **extends** an existing feature (e.g., "add profile editing"), reference the existing implementation as the starting point instead of recreating it.
- Mark any story that builds on boilerplate features with: **"Extends existing boilerplate: [feature]"**.
