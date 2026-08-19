import { IMAGE_IDS, gdUrl } from "@/lib/images";

type BrandMarkProps = {
  /** Size in pixels (applied to both width and height). */
  size?: number;
  /** Optional className for the wrapping element. */
  className?: string;
  /** Alt text. */
  alt?: string;
};

/**
 * Tydigo brand mark — the general dashboard icon.
 *
 * Used across dashboards and public surfaces as the canonical logo mark.
 * Falls back gracefully if the remote image is unavailable.
 */
export function BrandMark({ size = 36, className = "", alt = "Tydigo" }: BrandMarkProps) {
  return (
    <img
      src={gdUrl(IMAGE_IDS.dashboardIcon, Math.max(size * 2, 128))}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-xl object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
