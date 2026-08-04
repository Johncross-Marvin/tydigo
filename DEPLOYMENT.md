# Tydigo Deployment Guide

Tydigo is an on-demand waste pickup, recycling, and rewards platform. This guide covers deploying the PWA frontend to Vercel and the backend worker.

---

## Architecture Overview

| Component | Technology | Deployment |
|-----------|-----------|-------------|
| Frontend (PWA) | React 19 + Vite 6 | **Vercel** (static + SPA rewrites) |
| Backend API | Worker (D1-backed) | OpenAI Sites / Cloudflare Workers |
| Database | D1 (SQLite) | Managed by worker host |
| Future: Auth/DB | Supabase | Supabase Cloud |
| Future: Payments | Paystack | Paystack API |

---

## 1. GitHub Setup

```bash
# Initialize / update remote
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/tydigo.git
# Or update existing:
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/tydigo.git

# Push
git add -A
git commit -m "Prepare Tydigo PWA for production deployment"
git branch -M main
git push -u origin main
```

### Pre-Push Checklist
- [ ] `.gitignore` excludes `.env`, `.env.local`, `.vercel`, `dist`, `node_modules`
- [ ] No real secrets committed (search for `SECRET_KEY`, `SERVICE_ROLE`, etc.)
- [ ] `.env.example` is up to date with all required variables
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run build` succeeds

---

## 2. Vercel Deployment (Frontend)

### Automatic Setup

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `tydigo` GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | **Vite** |
| Build Command | `pnpm run build` |
| Output Directory | `dist` |
| Install Command | `pnpm install --frozen-lockfile` |

4. Add **Environment Variables** (see `.env.example`):

```
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_NAME=Tydigo
VITE_APP_ENV=production
VITE_DEFAULT_CITY=Abuja
VITE_CURRENCY=NGN
VITE_ENABLE_PWA=true
# ... and all other VITE_ variables from .env.example
```

5. Click **Deploy**

### The `vercel.json` File

Already configured at the project root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures React Router handles all routes (SPA fallback).

### Post-Deployment Verification

- [ ] App loads at the Vercel URL
- [ ] Service worker registers (`/sw.js` returns 200)
- [ ] Manifest loads (`/site.webmanifest` returns 200)
- [ ] Offline page works (toggle airplane mode, refresh)
- [ ] Install prompt appears on supported browsers
- [ ] All routes work (login, dashboard, etc.)
- [ ] API calls reach the backend (if configured)

---

## 3. Backend Worker Deployment

The backend API worker is embedded during `pnpm run build` at `dist/server/index.js`.

### Environment Variables for Worker

Configure these as **server-side secrets** in your worker host:

```bash
# Required
DB=binding_name_for_d1

# Admin
ADMIN_INVITE_CODE=use-a-long-private-random-value

# SMS OTP (optional — falls back to in-app verification)
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=Tydigo
TERMII_CHANNEL=generic

# Or Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

---

## 4. Future: Supabase Integration

When ready to migrate from D1 to Supabase:

1. Create a Supabase project
2. Run the migration: `supabase/migrations/0001_tydigo_core.sql`
3. Set environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Server-side only:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Enable RLS policies (already defined in migration)
6. Create storage buckets: `waste-photos`, `pickup-proof`, `kyc-documents`, `avatars`, `partner-proof`, `complaint-evidence`

---

## 5. Future: Paystack Integration

1. Get API keys from [Paystack Dashboard](https://dashboard.paystack.com)
2. Set environment variables:

```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
PAYSTACK_CALLBACK_URL=https://tydigo.com/payment/callback
```

3. Configure webhook URL in Paystack dashboard:
   `https://your-api-domain.com/api/webhooks/paystack`

---

## 6. Future: Push Notifications

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Set environment variables:
```
VITE_VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_SUBJECT=mailto:notifications@tydigo.com
```

---

## Domain Setup

Once deployed, configure your custom domain:

1. In Vercel: **Settings → Domains → Add Domain**
2. Add `tydigo.com` (or your purchased domain)
3. Update DNS records at your domain registrar
4. Wait for SSL certificate provisioning
5. Verify HTTPS works

---

## Rollback

If a deployment breaks:

```bash
# In Vercel dashboard: Deployments → select previous → Promote to Production
# Or via CLI:
vercel rollback
```
