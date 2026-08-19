/**
 * Tydigo Google Drive Image IDs
 *
 * Each ID maps to a specific UI design screenshot or brand asset.
 * Using Google Drive thumbnail API for reliable cross-origin embedding.
 */

export const IMAGE_IDS = {
  // Brand assets
  heroBackground: "1eV2qt7IRnOK4hNZCt22mJC3bwF-hONVx",
  favicon: "1flG4z--jtG3r-yBwqtNtwnoq7LQ9-pWM",
  navbarLogo: "1-q_7Yway8YZNK2Swow8RFwHU3qlE4HjA",
  dashboardIcon: "1K6fONWY85K5cfo1wQ84HifyQ-SeBVVa1",
  heroVideo: "1xxRtH_WpUoQM-wOYToQ7kGKeDipep0fl",

  // Public / Landing
  hero: "1Iipeg7HtEfp8Thx6bRt_0OX36M0l9Jge",
  onboarding: "1TcIeg2FTB04UtdKaZGwEr3dJ6dGMedCO",

  // Auth
  login: "1VfqVsULLkE-tzkDENDtPWgqz-7QLIXnA",
  roleSelection: "1iBtupkO46BJPOyX83CEuxRarqAFsfiM7",

  // Household
  dashboard: "1b5h3vD3HPb_4iPqCUZSRqBPXC5sCL0_k",
  requestPickup: "17M5utbdVYw3TYuCQVORgbf6TAA8UROqA",
  tracking: "1wDKGZLthGyQW9jCcPOf3PyHzFqoji7gq",
  ecopoints: "1Yi-vG8rjWtUQK6fo_2VSijujwU9wJQCc",
  payment: "1UhYHrADHT-P0wWK1mtGzcgCqWjcJyQvq",
  completion: "18EaT2-o1Xbpig84Cfb_vniIlEQk_ZDmN",
  challenges: "189IgEpg1rKhMooMMpaM97Lae7JmfWQRX",
  redeem: "1Tn2o_tvrhid5Ka98oy3Cf2ujoZ2mgbJL",

  // Collector
  collectorDashboard: "1Y_Ugn-S5jC7QzQSDD1WmX-2bse_V_wqe",

  // Business
  businessDashboard: "1fR41RA7kqtdTbjjera1rIoqZHxB3ryjR",

  // Partner
  partnerDashboard: "1zA1ZzfFRRelgV6cHRehjQBd-Z6YNNfxL",

  // Admin
  adminDashboard: "1PAkVI48arw1x4b8Pd4s_QOiyHtoH1Xkk",
} as const;

export type ImageId = keyof typeof IMAGE_IDS;

/**
 * Returns a reliable Google Drive image URL for embedding.
 * Uses the thumbnail API with a large size for quality.
 */
export function gdUrl(id: string, width: number = 1000): string {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}

/**
 * Returns a srcSet for responsive images from Google Drive.
 */
export function gdSrcSet(id: string): string {
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w400 400w`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w800 800w`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200 1200w`,
  ].join(", ");
}

/**
 * Returns a direct streaming URL for a Google Drive video.
 *
 * Uses the `drive.usercontent.google.com` CDN endpoint which serves the raw
 * file bytes directly (no HTML confirmation page), so it works reliably in a
 * `<video>` element with autoplay/loop.
 */
export function gdVideoUrl(id: string): string {
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
}
