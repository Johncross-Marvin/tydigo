# Tydigo — GitHub & Vercel Development Workflow

This document describes the complete development workflow for Tydigo, from local development through production deployment on Vercel.

---

## Architecture Overview

```
Local Dev  →  GitHub  →  Vercel (Auto Deploy)
(pnpm dev)    (push)     (build + deploy)
```

- **Framework:** Vite + React 19 + TypeScript
- **Hosting:** Vercel (static SPA with server-side worker)
- **CI/CD:** Vercel auto-deploys on push to `main`
- **Package Manager:** pnpm

---

## 1. Getting Started (Local Development)

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (install via `npm install -g pnpm`)
- **Git**

### First-Time Setup

```bash
# Clone the repo
git clone https://github.com/Johncross-Marvin/tydigo.git
cd tydigo

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your local values (or leave defaults for mock mode)

# Start dev server
pnpm run dev
# → http://localhost:8080
```

### Daily Development

```bash
pnpm run dev          # Start dev server (hot reload on port 8080)
pnpm run typecheck    # Check TypeScript types
pnpm run lint         # Run ESLint
pnpm run build        # Production build (runs before every commit is recommended)
pnpm run preview      # Preview production build locally
```

---

## 2. Git Workflow

### Branch Strategy

```
main         → Production (auto-deploys to Vercel)
feature/*    → Feature branches
fix/*        → Bug fix branches
docs/*       → Documentation updates
```

### Making Changes

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes, then verify
pnpm run typecheck
pnpm run lint
pnpm run build

# 3. Stage and commit
git add .
git commit -m "feat: description of change"

# 4. Push to GitHub
git push -u origin feature/my-feature

# 5. Create a Pull Request on GitHub
# 6. After review, merge to main

# 7. Switch back to main and pull
git checkout main
git pull origin main
```

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add customer pickup flow
fix: resolve OTP verification timeout
docs: update Vercel deployment guide
refactor: extract pricing engine to shared service
style: update EcoPoints card design
chore: update dependencies
```

### Pre-Commit Checklist

Before every commit:

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run build` succeeds
- [ ] No `.env` files staged (`git status` — `.env` must NOT appear)
- [ ] No secrets in changed files (search for `SECRET_KEY`, `SERVICE_ROLE`, `PRIVATE_KEY`)
- [ ] New features have corresponding UI/page updates

---

## 3. Vercel Deployment

### How Auto-Deploy Works

1. You push to `main` branch on GitHub
2. Vercel detects the push automatically
3. Vercel runs `pnpm install --frozen-lockfile`
4. Vercel runs `pnpm run build`
5. Vercel deploys the `dist/` directory
6. Deployment URL is updated (or custom domain)

### Vercel Configuration

Defined in `vercel.json` at the project root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Vercel Dashboard Settings

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Root Directory | `./` |
| Build Command | `pnpm run build` |
| Output Directory | `dist` |
| Install Command | `pnpm install --frozen-lockfile` |

### Preview Deployments

Every Pull Request automatically gets a **Preview Deployment** on Vercel. The URL is posted as a comment on the PR. Use this to test changes before merging.

### Production Deployments

Merging to `main` automatically triggers a production deployment. You can also trigger manually from the Vercel dashboard.

---

## 4. Environment Variables

### Adding Variables Locally

Edit your `.env` file (never committed):

```bash
# .env (local only — DO NOT COMMIT)
VITE_APP_ENV=development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Adding Variables on Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → Tydigo project → **Settings → Environment Variables**
2. Add key-value pairs
3. Choose environments: Production, Preview, Development
4. Click **Save**
5. Redeploy for changes to take effect

### Variable Naming Rules

| Prefix | Scope | Example |
|--------|-------|---------|
| `VITE_` | Public (browser) | `VITE_SUPABASE_URL` |
| No prefix | Server-only (secrets) | `PAYSTACK_SECRET_KEY` |

**Never add `VITE_` prefix to secret variables.** They would be exposed to the browser.

---

## 5. Testing Deployments

### Test Production Build Locally

```bash
pnpm run build
pnpm run preview
# → http://localhost:4173
```

### Test on Vercel Preview

1. Create a PR on GitHub
2. Wait for Vercel bot to comment with preview URL
3. Click the URL and test thoroughly
4. Merge when ready

### Smoke Test Checklist

After every deployment, verify:

- [ ] `https://<domain>/` — Landing page loads
- [ ] `https://<domain>/login` — Login page loads
- [ ] `https://<domain>/status` — Status page shows OK
- [ ] `https://<domain>/site.webmanifest` — Returns valid JSON
- [ ] `https://<domain>/sw.js` — Returns JavaScript
- [ ] `https://<domain>/offline.html` — Returns HTML
- [ ] No console errors
- [ ] Page title: "Tydigo — Tap. Sort. Picked."
- [ ] Theme color: `#145C25` (green)

---

## 6. Rollback

If a deployment breaks:

### Via Vercel Dashboard

1. Go to **Dashboard → Deployments**
2. Find the last working deployment
3. Click **"…"** → **Promote to Production**

### Via Git

```bash
# Revert the bad commit
git revert <bad-commit-hash>
git push origin main
# Vercel auto-deploys the revert
```

---

## 7. Troubleshooting

### Build fails on Vercel but passes locally

- Check Node.js version in Vercel settings (should be ≥ 18)
- Check that all environment variables are set on Vercel
- Look at Vercel build logs for specific errors
- Run `pnpm install --frozen-lockfile && pnpm run build` locally to reproduce

### Service Worker not registering

- Check `VITE_ENABLE_PWA` is not `"false"`
- Verify `public/sw.js` exists
- Check browser console for SW registration errors
- Ensure site is served over HTTPS (required for SW)

### "Page not found" on route refresh

- Verify `vercel.json` has the SPA rewrite rule
- Check that `dist/index.html` is the output

### Environment variables not working

- Variables must start with `VITE_` to be accessible in frontend code
- After changing vars on Vercel, you must redeploy
- Use `import.meta.env.VITE_VAR_NAME` in code (not `process.env`)

---

## 8. Useful Commands

```bash
# See what Vercel is deploying
vercel --prod

# Pull Vercel environment variables locally
vercel env pull

# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs <deployment-url>
```
