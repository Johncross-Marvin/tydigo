# Tydigo PWA Launch Checklist

Use this checklist before deploying Tydigo to production.

## Pre-Launch Verification

### PWA Requirements
- [ ] Web manifest (`/site.webmanifest`) present and valid
- [ ] Service worker (`/sw.js`) registered and caching correctly
- [ ] Offline fallback page (`/offline.html`) accessible
- [ ] App installable (beforeinstallprompt fires)
- [ ] App opens in standalone mode when installed
- [ ] Icons: 72×72, 96×96, 128×128, 144×144, 152×152, 192×192, 384×384, 512×512
- [ ] Maskable icons present (192×192, 512×512)
- [ ] Apple touch icon linked
- [ ] Theme color set (#145C25)
- [ ] Background color set (#ffffff)
- [ ] Display mode: standalone
- [ ] Orientation: portrait-primary

### Performance
- [ ] Lighthouse PWA score ≥ 90
- [ ] Lighthouse Performance score ≥ 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 4s
- [ ] No render-blocking resources
- [ ] Images optimized
- [ ] Code splitting enabled (manual chunks)
- [ ] Static assets cached by service worker

### Security
- [ ] HTTPS enforced (or planned for production domain)
- [ ] SUPABASE_SERVICE_ROLE_KEY not exposed in frontend
- [ ] PAYSTACK_SECRET_KEY not exposed in frontend
- [ ] VAPID_PRIVATE_KEY not exposed in frontend
- [ ] RLS policies enabled on all user-facing tables
- [ ] KYC documents in private storage bucket
- [ ] Payment records not editable by users
- [ ] CORS configured correctly
- [ ] Content Security Policy considered

### Brand
- [ ] All references say "Tydigo" (no "WastiGo" remaining)
- [ ] App name in manifest: Tydigo
- [ ] Tagline: "Tap. Sort. Picked."
- [ ] Page titles: "Tydigo — Tap. Sort. Picked."
- [ ] OG metadata updated
- [ ] Twitter card updated
- [ ] Favicon is Tydigo branded

### SEO
- [ ] Landing page with proper headings
- [ ] Meta description present
- [ ] OG tags present
- [ ] Sitemap generated
- [ ] Robots.txt configured
- [ ] Structured data (optional)
- [ ] Privacy Policy page
- [ ] Terms of Service page

### Auth
- [ ] Phone signup/signin working
- [ ] OTP verification working (or mock fallback)
- [ ] Session persistence working
- [ ] Logout working
- [ ] Role-based routing working
- [ ] Protected routes redirecting properly

### Core Flows
- [ ] Customer can create pickup request
- [ ] Price estimate displays correctly
- [ ] EcoPoints display working
- [ ] Payment placeholder/mock working
- [ ] Collector can view jobs
- [ ] Partner can create material request
- [ ] Admin can view dashboard and KPIs
- [ ] Admin can review KYC submissions

### Push Notifications (if enabled)
- [ ] VAPID keys configured
- [ ] Service worker handles push events
- [ ] Notification permission flow working
- [ ] Subscription saved to database

### Offline
- [ ] Offline banner appears when disconnected
- [ ] Offline fallback page serves when navigating offline
- [ ] App shell cached
- [ ] Static assets cached
- [ ] No API responses cached
- [ ] No sensitive data cached

### Deployment
- [ ] `.env.example` created and documented
- [ ] Environment variables set on deployment platform
- [ ] Build succeeds without errors
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Domain configured (tydigo.com / tydigo.ng)
- [ ] HTTPS certificate active
- [ ] Supabase project connected
- [ ] Paystack webhook URL configured
- [ ] Post-deployment smoke test passed

## Post-Launch Monitoring
- [ ] Analytics tracking set up
- [ ] Error tracking set up (Sentry or similar)
- [ ] Uptime monitoring configured
- [ ] Database backups scheduled
- [ ] Security patches auto-applied

## Notes
- Replace placeholder icons in `public/icons/` with proper Tydigo brand icons
- Replace placeholder screenshots in `public/screenshots/`
- Configure real SMS provider (Termii or Twilio) for production OTP
- Configure Paystack live keys for real payments
- Set up Supabase production project with proper RLS
