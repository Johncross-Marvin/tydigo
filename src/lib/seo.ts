import { useEffect } from "react";

type SeoProps = {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noIndex?: boolean;
};

const SITE_NAME = "Tydigo";
const BASE_URL = "https://tydigo.africa";
const DEFAULT_DESCRIPTION =
  "Tydigo is an on-demand waste pickup, recycling, and rewards platform helping homes, estates, businesses, collectors, and recyclers build cleaner African cities.";
const DEFAULT_IMAGE = "/icons/icon-512x512.svg";

export function useSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  noIndex = false,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    // Basic meta
    document.title = fullTitle;
    setMeta("description", description);

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:image", `${BASE_URL}${ogImage}`, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:url", typeof window !== "undefined" ? window.location.href : BASE_URL, "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", `${BASE_URL}${ogImage}`);

    // Robots
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow");
    }

    return () => {
      // Cleanup not strictly needed for meta tags but good practice
    };
  }, [title, description, ogImage, ogType, noIndex]);
}

function setMeta(name: string, content: string, attributeName = "name") {
  let el = document.querySelector(`meta[${attributeName}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attributeName, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// ─── Pre-built SEO configs for each route ────────────────────

export const seoConfig = {
  home: {
    title: "Tydigo — Cleaner Homes, Smarter Cities",
    description: DEFAULT_DESCRIPTION,
  },
  login: {
    title: "Sign In",
    description: "Sign in to Tydigo with your phone number or email. No password needed.",
  },
  signup: {
    title: "Create Account",
    description: "Join Tydigo in 60 seconds. Register with your phone number and start recycling.",
  },
  householdDashboard: {
    title: "Dashboard",
    description: "Manage your waste pickups, track collectors, and earn EcoPoints.",
  },
  requestPickup: {
    title: "Request Pickup",
    description: "Schedule a waste pickup. Choose waste type, set a time, and confirm your location.",
  },
  tracking: {
    title: "Live Tracking",
    description: "Track your waste collector in real-time on the map.",
  },
  ecopoints: {
    title: "EcoPoints",
    description: "View your EcoPoints balance, earning history, and redemption options.",
  },
  history: {
    title: "Pickup History",
    description: "View your past waste pickups and recycling history.",
  },
  payment: {
    title: "Payment",
    description: "Securely pay for your waste pickup with card, transfer, or EcoPoints.",
  },
  collectorDashboard: {
    title: "Collector Dashboard",
    description: "Find nearby pickup jobs, track earnings, and manage your collection route.",
  },
  businessDashboard: {
    title: "Business Dashboard",
    description: "Manage bulk waste pickups, track impact, and handle multiple locations.",
  },
  partnerDashboard: {
    title: "Partner Dashboard",
    description: "Source recyclable materials, track batches, and manage your material marketplace.",
  },
  adminDashboard: {
    title: "Admin Panel",
    description: "Manage Tydigo platform operations, users, pricing, and KYC reviews.",
  },
  governmentDashboard: {
    title: "Government Oversight",
    description: "Monitor regional waste analytics, compliance, and environmental impact.",
  },
};
