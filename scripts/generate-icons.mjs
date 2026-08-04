/**
 * Tydigo PWA Icon Generator (Placeholder)
 *
 * Run this script to generate placeholder PWA icons.
 * For production, replace with proper branded Tydigo icons.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ICONS_DIR = join(process.cwd(), "public", "icons");
const SCREENSHOTS_DIR = join(process.cwd(), "public", "screenshots");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Minimal SVG template for a Tydigo placeholder icon
function svgIcon(size, text = "T") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#145C25"/>
  <text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle"
    font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="${Math.round(size * 0.5)}"
    font-weight="700" fill="white">${text}</text>
</svg>`;
}

// Maskable icon template (with padding for safe zone)
function svgMaskable(size, text = "T") {
  const padding = Math.round(size * 0.15);
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#145C25"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${Math.round(inner * 0.2)}" fill="#1A7A30"/>
  <text x="${size / 2}" y="${size / 2}" dominant-baseline="central" text-anchor="middle"
    font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="${Math.round(inner * 0.45)}"
    font-weight="700" fill="white">${text}</text>
</svg>`;
}

// Placeholder screenshot SVG
function svgScreenshot(width, height, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#0A2F14"/>
  <rect y="0" width="${width}" height="48" fill="#145C25"/>
  <text x="16" y="30" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" fill="white" font-weight="600">Tydigo</text>
  <text x="${width / 2}" y="${height / 2}" dominant-baseline="central" text-anchor="middle"
    font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="18" fill="white" opacity="0.6">${label}</text>
</svg>`;
}

// Generate icons
mkdirSync(ICONS_DIR, { recursive: true });

for (const size of SIZES) {
  writeFileSync(join(ICONS_DIR, `icon-${size}x${size}.png`), svgIcon(size));
  console.log(`  icon-${size}x${size}.png`);
}

// Maskable icons
writeFileSync(join(ICONS_DIR, "maskable-192x192.png"), svgMaskable(192));
console.log("  maskable-192x192.png");
writeFileSync(join(ICONS_DIR, "maskable-512x512.png"), svgMaskable(512));
console.log("  maskable-512x512.png");

// Shortcut icons
writeFileSync(join(ICONS_DIR, "shortcut-pickup.png"), svgIcon(96, "P"));
console.log("  shortcut-pickup.png");
writeFileSync(join(ICONS_DIR, "shortcut-ecopoints.png"), svgIcon(96, "E"));
console.log("  shortcut-ecopoints.png");

// Badge icon
writeFileSync(join(ICONS_DIR, "badge-72x72.png"), svgIcon(72, "T"));
console.log("  badge-72x72.png");

// Screenshots
mkdirSync(SCREENSHOTS_DIR, { recursive: true });
writeFileSync(join(SCREENSHOTS_DIR, "home.png"), svgScreenshot(390, 844, "Home Dashboard"));
console.log("  screenshots/home.png");
writeFileSync(join(SCREENSHOTS_DIR, "pickup.png"), svgScreenshot(390, 844, "Request Pickup"));
console.log("  screenshots/pickup.png");
writeFileSync(join(SCREENSHOTS_DIR, "ecopoints.png"), svgScreenshot(390, 844, "EcoPoints Wallet"));
console.log("  screenshots/ecopoints.png");

console.log("\n✅ Placeholder icons generated in public/icons/");
console.log("⚠️  Replace with proper branded Tydigo icons for production.");
