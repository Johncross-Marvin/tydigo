/**
 * Tydigo Public Page Content
 *
 * Editorial content for public informational pages (services, earn, company,
 * safety, support, cities, legal). Each entry provides a hero, feature blocks,
 * and optional FAQ/CTA content consistent with the Tydigo brand voice:
 * clear, confident, and focused on real outcomes for cleaner cities.
 */

export type ContentBlock = {
  icon: string;
  title: string;
  body: string;
};

export type PageContent = {
  /** Short eyebrow label above the hero. */
  eyebrow?: string;
  /** Hero headline (rendered as the page H1). */
  headline: string;
  /** Supporting paragraph under the headline. */
  intro: string;
  /** Feature/value blocks. */
  features: ContentBlock[];
  /** Optional closing call-to-action copy. */
  ctaNote?: string;
};

export const PUBLIC_PAGE_CONTENT: Record<string, PageContent> = {
  // ─── Services ────────────────────────────────────────────────
  "services/households": {
    eyebrow: "Household pickup",
    headline: "Waste collection that fits your home",
    intro:
      "Book on-demand or scheduled pickups for your household waste, track your collector in real time, and earn EcoPoints for every responsible disposal.",
    features: [
      { icon: "MapPin", title: "On-demand & scheduled", body: "Choose a time window that works for you — same-day or recurring weekly pickups." },
      { icon: "Truck", title: "Live tracking", body: "Follow your verified collector from dispatch to your doorstep with proof of service." },
      { icon: "Award", title: "Earn EcoPoints", body: "Every pickup earns points you can redeem for rewards and community impact." },
      { icon: "Shield", title: "Verified collectors", body: "Every collector is KYC-verified and reviewed, so you always know who's at your door." },
    ],
    ctaNote: "Ready to clean up? Create a household account and book your first pickup in minutes.",
  },
  "services/estates": {
    eyebrow: "Estate operations",
    headline: "Community-wide waste management, simplified",
    intro:
      "Give your residential estate a single, transparent waste solution — bulk scheduling, shared collection points, and clear reporting for residents and management.",
    features: [
      { icon: "Building2", title: "Bulk scheduling", body: "Coordinate collection across the entire estate with one dashboard and shared schedules." },
      { icon: "Users", title: "Resident management", body: "Onboard residents, assign collection points, and track participation across the community." },
      { icon: "BarChart3", title: "Transparent reporting", body: "See waste diverted, recycling rates, and environmental impact for your estate." },
      { icon: "Leaf", title: "Sustainability goals", body: "Track carbon offset and landfill diversion to meet your community's green targets." },
    ],
    ctaNote: "Bring cleaner, smarter waste management to your estate today.",
  },
  "services/businesses": {
    eyebrow: "Business waste",
    headline: "Bulk waste management for growing businesses",
    intro:
      "From offices to retail and hospitality, Tydigo handles your recurring and bulk waste with verified service, compliance-ready reporting, and predictable pricing.",
    features: [
      { icon: "Calendar", title: "Recurring service", body: "Set daily, weekly, or custom schedules that match your operational rhythm." },
      { icon: "FileText", title: "Compliance reporting", body: "Generate waste and sustainability reports for audits, ESG, and regulatory needs." },
      { icon: "CreditCard", title: "Predictable pricing", body: "Transparent, volume-based pricing with no hidden fees or surprises." },
      { icon: "Shield", title: "Verified & insured", body: "KYC-verified collectors and documented proof of service on every collection." },
    ],
    ctaNote: "Streamline your business waste operations with a dedicated account.",
  },
  "services/recycling": {
    eyebrow: "Recycling & recovery",
    headline: "A material recovery network that works",
    intro:
      "Tydigo routes recyclable waste to verified recyclers, turning what would be landfill into recovered materials — with full chain-of-custody tracking.",
    features: [
      { icon: "Recycle", title: "Material routing", body: "Recyclables are sorted and routed to the right processing partner by material type." },
      { icon: "Package", title: "Chain of custody", body: "Every batch is tracked from collection to destination with verified handoffs." },
      { icon: "BarChart3", title: "Recovery analytics", body: "Measure recovery rates, contamination, and material value across your operations." },
      { icon: "Globe", title: "Circular economy", body: "Keep materials in circulation and reduce pressure on virgin resources." },
    ],
    ctaNote: "Partner with Tydigo to source or supply recovered materials.",
  },
  "services/organic-recovery": {
    eyebrow: "Organic recovery",
    headline: "Turn organic waste into value",
    intro:
      "Food and agricultural waste becomes compost, BSF feedstock, and livestock feed — routed to verified organic recovery partners with full traceability.",
    features: [
      { icon: "Leaf", title: "Feedstock sourcing", body: "Reliable, traceable organic feedstock for BSF farms, composters, and feed producers." },
      { icon: "Droplets", title: "Quality control", body: "Contamination checks and quality grading on every organic batch." },
      { icon: "Truck", title: "Scheduled intake", body: "Consistent, scheduled deliveries that match your processing capacity." },
      { icon: "Award", title: "Impact tracking", body: "Quantify carbon offset and landfill diversion from your organic recovery." },
    ],
    ctaNote: "Become an organic recovery partner and turn waste into a resource.",
  },

  // ─── Earn ────────────────────────────────────────────────────
  "earn": {
    eyebrow: "Earn with Tydigo",
    headline: "Turn waste into income",
    intro:
      "Join the network of collectors, recyclers, organic partners, and fleet operators building cleaner cities — and get paid transparently for the work you do.",
    features: [
      { icon: "Truck", title: "Collect & earn", body: "Accept pickup jobs, see the price upfront, and get paid weekly." },
      { icon: "Recycle", title: "Recover materials", body: "Source recyclables and organic feedstock through the marketplace." },
      { icon: "DollarSign", title: "Transparent payouts", body: "Clear earnings, weekly payouts, and no hidden deductions." },
      { icon: "Award", title: "Grow your reputation", body: "Build ratings and unlock higher-value jobs as you complete more work." },
    ],
    ctaNote: "Choose your path and start earning with Tydigo.",
  },
  "earn/collector": {
    eyebrow: "Become a Collector",
    headline: "Earn on your own schedule",
    intro:
      "Accept pickup jobs in your area, see the price before you accept, and get paid weekly. You control when and how much you work.",
    features: [
      { icon: "MapPin", title: "Jobs near you", body: "See available pickups in your area with distance and earnings upfront." },
      { icon: "DollarSign", title: "Transparent pricing", body: "Know exactly what you'll earn before you accept any job." },
      { icon: "Clock", title: "Flexible schedule", body: "Go online when it suits you — no minimum hours, no forced shifts." },
      { icon: "Award", title: "Weekly payouts", body: "Earnings paid out weekly to your linked bank account." },
    ],
    ctaNote: "Start your collector application and begin earning.",
  },
  "earn/recycler": {
    eyebrow: "Partner as a Recycler",
    headline: "Source materials with confidence",
    intro:
      "Access a steady supply of recyclable materials through the Tydigo marketplace, with verified quality and full chain-of-custody tracking.",
    features: [
      { icon: "Package", title: "Material marketplace", body: "Browse and source recyclables by type, grade, and quantity." },
      { icon: "Shield", title: "Verified quality", body: "Quality grading and contamination checks on every batch." },
      { icon: "Truck", title: "Reliable intake", body: "Scheduled deliveries that match your processing capacity." },
      { icon: "BarChart3", title: "Settlement tracking", body: "Clear records of purchases, settlements, and material value." },
    ],
    ctaNote: "Apply to become a verified recycler partner.",
  },
  "earn/organic-partner": {
    eyebrow: "Organic Recovery Partner",
    headline: "Reliable feedstock for your operation",
    intro:
      "Whether you run a BSF farm, composting facility, or livestock feed operation, Tydigo delivers traceable organic feedstock on schedule.",
    features: [
      { icon: "Leaf", title: "Consistent feedstock", body: "Steady supply of food and agricultural organic waste." },
      { icon: "Droplets", title: "Quality grading", body: "Contamination checks and quality grading on every batch." },
      { icon: "Truck", title: "Scheduled intake", body: "Deliveries timed to your processing capacity." },
      { icon: "Award", title: "Impact reporting", body: "Quantify carbon offset and landfill diversion from your work." },
    ],
    ctaNote: "Apply to become an organic recovery partner.",
  },
  "earn/fleet-operator": {
    eyebrow: "Operate a Fleet",
    headline: "Run a smarter collection fleet",
    intro:
      "Manage vehicles, drivers, and dispatch from one dashboard — with real-time visibility, performance analytics, and transparent earnings.",
    features: [
      { icon: "Truck", title: "Vehicle management", body: "Track your fleet, maintenance status, and capacity in one place." },
      { icon: "Users", title: "Driver oversight", body: "Monitor driver availability, ratings, and active jobs." },
      { icon: "MapPin", title: "Dispatch control", body: "Coordinate routes and assignments with real-time visibility." },
      { icon: "BarChart3", title: "Performance analytics", body: "Measure utilization, completion rates, and earnings across your fleet." },
    ],
    ctaNote: "Apply to operate your fleet on the Tydigo network.",
  },

  // ─── Company ─────────────────────────────────────────────────
  "company/about": {
    eyebrow: "About Tydigo",
    headline: "Building cleaner cities, one pickup at a time",
    intro:
      "Tydigo connects households, estates, businesses, collectors, and recyclers to make waste collection simpler, more transparent, and more rewarding for everyone.",
    features: [
      { icon: "Globe", title: "Our mission", body: "Divert waste from landfill and build a circular economy across Nigerian cities." },
      { icon: "Shield", title: "Verified & accountable", body: "Every collector is KYC-verified and every job is tracked with proof of service." },
      { icon: "Leaf", title: "Real impact", body: "We measure waste diverted, materials recovered, and carbon offset — not just pickups." },
      { icon: "Users", title: "Community first", body: "We create earning opportunities for collectors and operators across the network." },
    ],
    ctaNote: "Join us in building cleaner, smarter cities.",
  },
  "company/impact": {
    eyebrow: "Impact",
    headline: "Measurable outcomes for people and planet",
    intro:
      "Tydigo tracks the environmental and economic impact of every pickup — waste diverted, materials recovered, carbon offset, and income earned.",
    features: [
      { icon: "Recycle", title: "Waste diverted", body: "Tonnes of waste kept out of landfill through collection and recovery." },
      { icon: "Leaf", title: "Carbon offset", body: "Greenhouse gas emissions avoided through recycling and organic recovery." },
      { icon: "DollarSign", title: "Income earned", body: "Transparent earnings for collectors and operators across the network." },
      { icon: "BarChart3", title: "Transparent reporting", body: "Clear, verifiable impact data for partners, estates, and government." },
    ],
    ctaNote: "See the impact we're building together.",
  },
  "company/careers": {
    eyebrow: "Careers",
    headline: "Do work that matters",
    intro:
      "Join a team building the infrastructure for cleaner cities — from engineering and operations to partnerships and community.",
    features: [
      { icon: "Users", title: "Mission-driven", body: "Work on problems that directly improve cities and livelihoods." },
      { icon: "BarChart3", title: "Growth & impact", body: "Build your career while building measurable environmental impact." },
      { icon: "Globe", title: "Local & real", body: "Operate on the ground in Nigerian cities, close to the communities we serve." },
      { icon: "Award", title: "Ownership", body: "Take ownership of meaningful work from day one." },
    ],
    ctaNote: "Explore opportunities to join the Tydigo team.",
  },

  // ─── Safety ──────────────────────────────────────────────────
  "safety": {
    eyebrow: "Safety Centre",
    headline: "Safety is the foundation of everything we do",
    intro:
      "From verified collectors to safe waste handling guidance, Tydigo is built on standards that protect people, communities, and the environment.",
    features: [
      { icon: "Shield", title: "Verified collectors", body: "Every collector is KYC-verified before they can accept jobs." },
      { icon: "FileText", title: "Waste handling guidance", body: "Clear standards for safe sorting, handling, and disposal." },
      { icon: "Bell", title: "Incident reporting", body: "A simple, confidential way to report safety concerns." },
      { icon: "Users", title: "Community standards", body: "Shared expectations that keep everyone safe and accountable." },
    ],
    ctaNote: "Learn more about our safety standards and how to report concerns.",
  },
  "safety/collectors": {
    eyebrow: "Collector Safety",
    headline: "Keeping collectors safe on every job",
    intro:
      "We provide collectors with the guidance, tools, and support to work safely — from proper handling to incident reporting.",
    features: [
      { icon: "Shield", title: "Protective guidance", body: "Best practices for safe lifting, handling, and transport." },
      { icon: "FileText", title: "Clear protocols", body: "Step-by-step procedures for common and hazardous situations." },
      { icon: "Bell", title: "Report & support", body: "Confidential incident reporting with follow-up support." },
      { icon: "Award", title: "Recognition", body: "Safety-conscious collectors are recognized and rewarded." },
    ],
    ctaNote: "Review collector safety guidance and protocols.",
  },
  "safety/waste-handling": {
    eyebrow: "Waste Handling",
    headline: "Safe sorting and disposal, made simple",
    intro:
      "Proper waste handling protects people and the environment. Here's how to sort, store, and dispose of waste responsibly.",
    features: [
      { icon: "Recycle", title: "Sort correctly", body: "Separate recyclables, organics, and general waste at the source." },
      { icon: "Package", title: "Store safely", body: "Keep waste contained and secure until collection." },
      { icon: "Leaf", title: "Reduce contamination", body: "Clean and dry recyclables to improve recovery quality." },
      { icon: "Shield", title: "Handle with care", body: "Follow guidance for sharp, heavy, or hazardous items." },
    ],
    ctaNote: "Learn safe waste handling practices for your home or business.",
  },
  "safety/report-incident": {
    eyebrow: "Report an Incident",
    headline: "Tell us what happened, so we can help",
    intro:
      "Your safety matters. Report any incident or concern — from a missed pickup to a safety issue — and our team will follow up.",
    features: [
      { icon: "Bell", title: "Quick reporting", body: "A simple form to report incidents and concerns." },
      { icon: "Shield", title: "Confidential", body: "Your report is handled with care and confidentiality." },
      { icon: "Clock", title: "Timely follow-up", body: "Our team reviews and responds to every report." },
      { icon: "Users", title: "Accountability", body: "Reports drive improvements across the network." },
    ],
    ctaNote: "Report an incident and help us keep the network safe.",
  },

  // ─── Support ─────────────────────────────────────────────────
  "support": {
    eyebrow: "Help Centre",
    headline: "How can we help?",
    intro:
      "Find answers to common questions, get help with your account, or reach our support team for anything else.",
    features: [
      { icon: "FileText", title: "Guides & FAQs", body: "Step-by-step help for pickups, payments, and account management." },
      { icon: "Users", title: "Account & verification", body: "Help with KYC, profile setup, and account access." },
      { icon: "CreditCard", title: "Payments & rewards", body: "Wallet, payouts, and EcoPoints support." },
      { icon: "Bell", title: "Contact support", body: "Reach our team when you need a human to help." },
    ],
    ctaNote: "Browse help topics or contact our support team.",
  },

  // ─── Cities ──────────────────────────────────────────────────
  "cities": {
    eyebrow: "Cities",
    headline: "Where Tydigo operates",
    intro:
      "Tydigo is live in Abuja and piloting in Lagos, with more cities on the way. Request Tydigo for your city and help us expand.",
    features: [
      { icon: "MapPin", title: "Active coverage", body: "Full service available in Abuja across households, businesses, and collectors." },
      { icon: "Globe", title: "Pilot cities", body: "Lagos is in pilot with household and collector service." },
      { icon: "Truck", title: "Expanding network", body: "We're growing — request Tydigo for your city." },
      { icon: "Users", title: "Community-driven", body: "Expansion is guided by demand from communities like yours." },
    ],
    ctaNote: "Request Tydigo for your city and help us grow.",
  },

  // ─── Legal ───────────────────────────────────────────────────
  "legal/terms": {
    eyebrow: "Terms of Service",
    headline: "The terms that govern your use of Tydigo",
    intro:
      "These terms outline your rights and responsibilities when using the Tydigo platform, including service, payments, and account conduct.",
    features: [
      { icon: "FileText", title: "Service terms", body: "How collection, recycling, and recovery services work." },
      { icon: "CreditCard", title: "Payments", body: "Pricing, payouts, and payment terms for all users." },
      { icon: "Shield", title: "Account conduct", body: "Expectations for safe, respectful use of the platform." },
      { icon: "Users", title: "Responsibilities", body: "Your obligations as a customer, collector, or partner." },
    ],
    ctaNote: "Review the full Terms of Service.",
  },
  "legal/privacy": {
    eyebrow: "Privacy Policy",
    headline: "How Tydigo handles your data",
    intro:
      "We're committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.",
    features: [
      { icon: "Shield", title: "Data protection", body: "How we safeguard your personal information." },
      { icon: "FileText", title: "What we collect", body: "The data we gather to provide and improve our services." },
      { icon: "Users", title: "Your rights", body: "Access, correct, and control your personal data." },
      { icon: "Globe", title: "Data sharing", body: "When and why we share data with partners." },
    ],
    ctaNote: "Read the full Privacy Policy.",
  },
  "legal/cookies": {
    eyebrow: "Cookie Policy",
    headline: "How Tydigo uses cookies",
    intro:
      "Cookies help us provide a better experience. This policy explains what cookies we use and how you can control them.",
    features: [
      { icon: "FileText", title: "What are cookies", body: "Small files that help websites remember your preferences." },
      { icon: "Shield", title: "How we use them", body: "To improve performance, security, and your experience." },
      { icon: "Users", title: "Your choices", body: "Control or disable cookies through your browser settings." },
      { icon: "Globe", title: "Third-party cookies", body: "How partners may use cookies on our platform." },
    ],
    ctaNote: "Review the full Cookie Policy.",
  },
  "legal/security": {
    eyebrow: "Security",
    headline: "How Tydigo protects your account and data",
    intro:
      "Security is built into everything we do — from verified identities to encrypted data and secure payments.",
    features: [
      { icon: "Shield", title: "Verified identities", body: "KYC verification for collectors and partners." },
      { icon: "FileText", title: "Encrypted data", body: "Your data is protected in transit and at rest." },
      { icon: "CreditCard", title: "Secure payments", body: "Payments processed through trusted, secure channels." },
      { icon: "Bell", title: "Report concerns", body: "Report security issues and we'll respond promptly." },
    ],
    ctaNote: "Learn more about our security practices.",
  },
};

/**
 * Resolve content for a route path. Falls back to a generic entry.
 */
export function getPublicPageContent(path: string): PageContent {
  return (
    PUBLIC_PAGE_CONTENT[path] || {
      headline: "Tydigo",
      intro: "Explore the Tydigo experience and build cleaner cities with us.",
      features: [],
    }
  );
}
