# Tydigo Vercel Deployment Checklist

Use this checklist when deploying Tydigo to Vercel for the first time, and before every production release.

---

## Pre-Deployment (Local)

### Code Quality
- [ ] `pnpm run typecheck` — zero TypeScript errors
- [ ] `pnpm run lint` — zero ESLint errors
- [ ] `pnpm run build` — builds successfully
- [ ] `pnpm run preview` — works locally

### Git Readiness
- [ ] `.gitignore` includes: `.env`, `.env.local`, `.env.production`, `.vercel`, `dist`, `node_modules`, `.next`
- [ ] No real secrets in committed code (search for `SECRET_KEY`, `SERVICE_ROLE`, `PRIVATE_KEY`)
- [ ] `.env.example` up to date with all variables
- [ ] All changes committed and pushed to GitHub

### Environment Variables Audit

| Variable | Public (VITE_) | Required | Value Set |
|----------|---------------|----------|-----------|
| `VITE_APP_NAME` | ✅ | Yes | Tydigo |
| `VITE_APP_ENV` | ✅ | Yes | production |
| `VITE_APP_URL` | ✅ | Yes | |
| `VITE_API_BASE_URL` | ✅ | If using backend | |
| `VITE_SUPABASE_URL` | ✅ | If using Supabase | |
| `VITE_SUPABASE_ANON_KEY` | ✅ | If using Supabase | |
| `VITE_PAYSTACK_PUBLIC_KEY` | ✅ | If using Paystack | |
| `VITE_GOOGLE_MAPS_API_KEY` | ✅ | If using maps | |
| `VITE_MAP_PROVIDER` | ✅ | Yes | |
| `VITE_ENABLE_PWA` | ✅ | Yes | true |
| `VITE_ENABLE_PUSH_NOTIFICATIONS` | ✅ | Yes | |
| `VITE_ENABLE_MOCK_AUTH` | ✅ | Dev only | false in prod |
| `VITE_ENABLE_MOCK_PAYMENTS` | ✅ | Dev only | false in prod |
| `VITE_ENABLE_MOCK_MAPS` | ✅ | Dev only | false in prod |
| `VITE_VAPID_PUBLIC_KEY` | ✅ | If using push | |
| `VITE_DEFAULT_CITY` | ✅ | Yes | Abuja |
| `VITE_CURRENCY` | ✅ | Yes | NGN |
| `VITE_TIMEZONE` | ✅ | Yes | Africa/Lagos |
| `VITE_DEFAULT_COUNTRY_CODE` | ✅ | Yes | +234 |

**Server-only secrets (NEVER put in VITE_ variables):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `VAPID_PRIVATE_KEY`
- `TERMII_API_KEY`
- `TWILIO_AUTH_TOKEN`
- `ADMIN_INVITE_CODE`

---

## Vercel Setup

### First Deployment
- [ ] GitHub repo imported into Vercel
- [ ] Framework preset: **Vite**
- [ ] Build command: `pnpm run build`
- [ ] Output directory: `dist`
- [ ] Install command: `pnpm install --frozen-lockfile`
- [ ] Root Directory: `./` (project is at root, not in a monorepo subdirectory)
- [ ] All `VITE_*` environment variables added in Vercel dashboard
- [ ] Server-side secrets added in Vercel dashboard (if backend runs on Vercel)
- [ ] Custom domain configured (if applicable)

### Vercel Configuration (`vercel.json`)
Already configured in project root:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Post-Deployment Verification

### PWA Checks
- [ ] App loads on HTTPS
- [ ] `https://<domain>/site.webmanifest` returns valid JSON
- [ ] `https://<domain>/sw.js` returns JavaScript
- [ ] `https://<domain>/offline.html` returns HTML page
- [ ] Service worker registers in browser (DevTools → Application → Service Workers)
- [ ] Manifest is valid (DevTools → Application → Manifest)
- [ ] "Install" prompt appears on supported browsers
- [ ] Installed app opens in standalone mode (no browser chrome)
- [ ] Icons display correctly on home screen / app launcher

### Offline Check
- [ ] Open DevTools → Network → check "Offline"
- [ ] Refresh the page → offline fallback shows
- [ ] Previously visited pages load from cache
- [ ] API calls gracefully fail (no white screen)

### Functional Smoke Tests
- [ ] Landing page (`/`) loads
- [ ] Login page (`/login`) loads
- [ ] OTP page (`/otp`) loads
- [ ] Role selection (`/role-selection`) loads
- [ ] **Status page (`/status`) — all lights green or yellow (no red)**
- [ ] Customer dashboard (`/household/dashboard`) loads
- [ ] Request pickup (`/household/request-pickup`) loads
- [ ] EcoPoints (`/household/ecopoints`) loads
- [ ] History (`/household/history`) loads
- [ ] Collector dashboard (`/collector/dashboard`) loads
- [ ] Business dashboard (`/business/dashboard`) loads
- [ ] Partner dashboard (`/partner/dashboard`) loads
- [ ] Admin dashboard (`/admin/dashboard`) loads
- [ ] 404 page works for unknown routes

### Brand & SEO
- [ ] `<title>` says "Tydigo — Tap. Sort. Picked."
- [ ] Meta description is present and accurate
- [ ] OG tags resolve correctly (use [opengraph.xyz](https://opengraph.xyz) or similar)
- [ ] `robots.txt` is accessible
- [ ] Favicon loads
- [ ] Theme color (`#145C25`) applied correctly
- [ ] No "WastiGo" text anywhere visible

### Performance
- [ ] Loads in under 3 seconds on 4G
- [ ] Lighthouse PWA score ≥ 90 (audit in Chrome DevTools)
- [ ] No console errors on any page
- [ ] Images and assets load correctly from CDN

---

## Supabase (If Connected)

- [ ] Supabase project created
- [ ] Migration `supabase/migrations/0001_tydigo_core.sql` applied
- [ ] RLS policies enabled on all tables
- [ ] Storage buckets created with correct privacy settings
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set as server-side secret (if using Edge Functions)

---

## Paystack (If Connected)

- [ ] Paystack account active
- [ ] `VITE_PAYSTACK_PUBLIC_KEY` set to live public key
- [ ] `PAYSTACK_SECRET_KEY` set as server-side secret
- [ ] `PAYSTACK_WEBHOOK_SECRET` configured
- [ ] Webhook URL registered in Paystack dashboard
- [ ] `PAYSTACK_CALLBACK_URL` set to production URL

---

## Push Notifications (If Enabled)

- [ ] VAPID keys generated
- [ ] `VITE_VAPID_PUBLIC_KEY` set
- [ ] `VAPID_PRIVATE_KEY` set as server-side secret
- [ ] `VAPID_SUBJECT` set to valid email
- [ ] Notification permission flow tested
- [ ] Push subscription saved and verified

---

## Monitoring & Rollback

- [ ] Vercel Analytics enabled (optional)
- [ ] Know how to rollback: Vercel Dashboard → Deployments → Promote previous deployment
- [ ] Documented any deployment-specific configurations

---

## Launch Sign-Off

| Check | Signed Off |
|-------|-----------|
| Build passes | ☐ |
| All pages load | ☐ |
| PWA installs | ☐ |
| Offline works | ☐ |
| No secrets exposed | ☐ |
| Branding correct | ☐ |
| Environment vars set | ☐ |
| Custom domain active | ☐ |
| HTTPS works | ☐ |

**Deployer:** _____________
**Date:** _____________
**Version:** _____________
