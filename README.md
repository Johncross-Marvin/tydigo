# Tydigo

Tydigo is an on-demand waste pickup, recycling, and rewards platform helping homes, estates, businesses, collectors, and recyclers build cleaner African cities.

**Tagline:** Tap. Sort. Picked.
**Promise:** Cleaner homes. Smarter cities.

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev
# → http://localhost:8080

# Run production checks
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run preview
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 6 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| State | TanStack Query + React Context |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Package Manager | pnpm |

---

## PWA Features

Tydigo is a **Progressive Web App** that can be installed on mobile and desktop.

| Feature | Status |
|---------|--------|
| Web App Manifest | ✅ |
| Service Worker (caching + offline) | ✅ |
| Offline Fallback Page | ✅ |
| Install Prompt | ✅ |
| Push Notification Ready | ✅ |
| Background Sync Ready | ✅ |
| Mobile-First UI | ✅ |

PWA files in `public/`:
- `site.webmanifest` — App manifest
- `sw.js` — Service worker
- `offline.html` — Offline fallback page
- `icons/` — App icons
- `screenshots/` — App screenshots (placeholder)

---

## Project Structure

```
tydigo/
├── public/           # Static assets, PWA files
│   ├── icons/        # App icons (SVG)
│   ├── screenshots/  # PWA screenshots
│   ├── sw.js         # Service worker
│   ├── offline.html  # Offline fallback
│   └── site.webmanifest
├── src/
│   ├── components/   # React components
│   │   ├── ui/       # shadcn/ui components
│   │   ├── auth-provider.tsx
│   │   ├── protected-route.tsx
│   │   └── pwa-banner.tsx
│   ├── pages/        # Route pages
│   ├── lib/          # API client, PWA utilities
│   ├── services/     # Business logic (pricing, EcoPoints, statuses)
│   ├── hooks/        # Custom hooks
│   └── utils/        # General utilities
├── drizzle/          # Database migrations
├── supabase/         # Supabase schema & migrations
│   └── migrations/   # SQL migrations
├── docs/             # Documentation
│   ├── ui/           # UI inventory & design docs
│   └── deployment/   # Deployment checklists
├── scripts/          # Build & utility scripts
├── .env.example      # Environment variable template
└── vercel.json       # Vercel deployment config
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required for production:**
- `VITE_API_BASE_URL` — Backend API URL
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — Supabase project
- `VITE_PAYSTACK_PUBLIC_KEY` — Paystack public key

**Server-only secrets (never expose to browser):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `VAPID_PRIVATE_KEY`

See `.env.example` for the full list and security rules.

---

## Deployment

### GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/tydigo.git
git branch -M main
git push -u origin main
```

### Vercel (Recommended)

1. Import the GitHub repo in [Vercel](https://vercel.com)
2. Framework preset: **Vite**
3. Build command: `pnpm run build`
4. Output directory: `dist`
5. Install command: `pnpm install --frozen-lockfile`
6. Add environment variables from `.env.example`
7. Deploy

**Important**: The `vercel.json` is already configured with SPA rewrite rules.

For detailed deployment instructions, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Full deployment guide
- [docs/deployment/vercel-deployment-checklist.md](./docs/deployment/vercel-deployment-checklist.md) — Pre-launch checklist

---

## Core Features

- 📱 Phone OTP signup/signin
- 🏠 Customer dashboard with pickup requests
- 🚛 Collector job matching and tracking
- ♻️ Partner material requests (recyclers, BSF farms, compost)
- 🪙 EcoPoints reward system
- 💳 Paystack payment integration (mock-ready)
- 📊 Admin dashboard with KYC, pricing, and analytics
- 📍 Location/map-ready architecture
- 🔔 Push notification architecture

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start dev server (port 8080) |
| `pnpm run build` | Production build |
| `pnpm run start` | Preview production build |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run lint` | ESLint linting |

---

## License

Private. All rights reserved.
