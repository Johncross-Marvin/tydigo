# Tydigo UI Inventory

Generated during the WastiGo → Tydigo PWA upgrade.

## Brand Identity

- **App Name:** Tydigo
- **Tagline:** Tap. Sort. Picked.
- **Core Promise:** Cleaner homes. Smarter cities.

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Primary Deep Green | `#145C25` | Header, buttons, brand accents |
| Primary Lighter Green | `#1A7A30` | Gradients, hover states |
| Brand Light Green | `#2E8B3E` | Accent gradients |
| Dark Hero Green | `#0A2F14` | Hero backgrounds, dark mode |
| Warm Amber Accent | `#F59E0B` | EcoPoints, rewards, CTAs |
| Sky Blue Accent | `#0EA5E9` | Trust accents, info badges |
| Charcoal Text | HSL(142, 80%, 8%) | Primary text |
| Soft Off-White | `#F8FAF8` | Backgrounds |
| White | `#FFFFFF` | Cards, surfaces |

## Screen Inventory

### Public
1. **Landing Page** (`/`) — Hero, how it works, role cards, CTA
2. **Login** (`/login`) — Phone number input, mode toggle
3. **OTP Verification** (`/otp`) — 6-digit code entry
4. **Role Selection** (`/role-selection`) — Cards for customer, collector, business, partner

### Customer
5. **Dashboard** (`/household/dashboard`) — Stats cards, active pickup, recent activity, challenges
6. **Request Pickup** (`/household/request-pickup`) — Multi-step waste pickup form
7. **Tracking** (`/household/tracking`) — Live map, collector info, status timeline
8. **Payment** (`/household/payment`) — Payment method, amount, confirmation
9. **Completion** (`/household/completion`) — Success state, EcoPoints earned, rating
10. **EcoPoints** (`/household/ecopoints`) — Balance, history, challenges, redeem
11. **History** (`/household/history`) — Past pickups list with status badges
12. **Challenges** (`/household/challenges`) — Progress cards for reward challenges
13. **Redeem** (`/household/redeem`) — Redeem EcoPoints for rewards
14. **Profile** (`/household/profile`) — User info, role, settings

### Collector
15. **Collector Dashboard** (`/collector/dashboard`) — Online toggle, nearby jobs, earnings

### Business
16. **Business Dashboard** (`/business/dashboard`) — Waste overview, pickups, volume tracking

### Partner
17. **Partner Dashboard** (`/partner/dashboard`) — Material requests, incoming batches, Impact Credits
18. **New Material Request** (`/partner/request`) — Request recyclable/organic materials

### Admin
19. **Admin Dashboard** (`/admin/dashboard`) — KPIs, pending KYC, overview charts
20. **KYC Approvals** (`/admin/kyc`) — Review and approve/reject KYC submissions
21. **Pricing Rules** (`/admin/pricing`) — Manage pricing tiers
22. **EcoPoints Admin** (`/admin/ecopoints`) — Manage reward rules
23. **Waste Batches** (`/admin/batches`) — Track waste batches
24. **Impact Reports** (`/admin/impact`) — ESG-style impact metrics

### System
25. **Offline Fallback** (`/offline.html`) — Static offline page
26. **404 Not Found** (`*`) — Custom 404 page

## Component Patterns

- **Cards:** Rounded-xl (`border-radius: 0.75rem`), subtle shadows, white bg
- **Buttons:** Rounded, green filled primary, outlined secondary
- **Inputs:** Rounded, full-width, clear labels
- **Navigation:** Bottom tab bar (mobile), sidebar (admin)
- **Stats Cards:** Icon + label + value + trend indicator
- **Status Badges:** Colored pill badges for pickup statuses
- **Progress Bars:** Green fill for challenges, milestones

## Layout Rules

- Mobile-first single column layout
- Max container width: `max-w-lg` or `max-w-md` for forms
- Bottom padding for mobile navigation
- Smooth page transitions
- Skeleton loading states
- Pull-to-refresh pattern (future)
