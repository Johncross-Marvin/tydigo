import { useRef, useEffect, useState } from "react";
import { Recycle } from "lucide-react";

type ScrollMediaStageProps = {
  /** Optional image source. Falls back to a brand panel when absent. */
  src?: string;
  /** Optional video source (direct .mp4/.webm URL). */
  videoSrc?: string;
  /** Optional poster image shown while the video loads. */
  poster?: string;
  alt?: string;
  /** Optional overlay content. */
  children?: React.ReactNode;
};

/**
 * Scroll-reactive media stage.
 *
 * A large rounded media panel that subtly expands toward the viewport edges
 * and relaxes its corner radius as the user scrolls into it. Uses
 * IntersectionObserver + requestAnimationFrame-throttled progress and only
 * animates compositor-friendly properties (transform, border-radius, opacity).
 *
 * Supports an image (`src`) or an autoplaying, looping video (`videoSrc`).
 */
export function ScrollMediaStage({ src, videoSrc, poster, alt = "", children }: ScrollMediaStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);

  // Scroll-reactive expansion
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const stage = stageRef.current;
    if (!stage) return;

    let raf = 0;
    let observer: IntersectionObserver;

    const update = () => {
      const rect = stage.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const raw = (viewportH - rect.top) / (viewportH + rect.height);
      const clamped = Math.max(0, Math.min(1, raw));
      setProgress(clamped);
    };

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(update);
          };
          window.addEventListener("scroll", onScroll, { passive: true });
          update();
          (stage as unknown as { _cleanup?: () => void })._cleanup = () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(raf);
          };
        }
      },
      { threshold: 0 },
    );

    observer.observe(stage);
    return () => {
      observer.disconnect();
      const cleanup = (stage as unknown as { _cleanup?: () => void })._cleanup;
      cleanup?.();
    };
  }, []);

  // Ensure the video autoplays and loops. `muted` + `playsInline` are required
  // for autoplay to be permitted by all browsers. We also call `play()`
  // programmatically as a belt-and-suspenders measure.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    };

    video.addEventListener("canplay", tryPlay);
    video.addEventListener("loadeddata", tryPlay);
    tryPlay();

    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [videoSrc]);

  // Compute styles from progress (compositor-friendly)
  const scale = 1 + progress * 0.06;
  const radius = Math.max(8, 24 - progress * 16);
  const opacity = 1;

  return (
    <div ref={stageRef} className="relative w-full py-4">
      <div
        ref={mediaRef}
        className="relative w-full overflow-hidden bg-[#0A2F14]"
        style={{
          transform: `scale(${scale})`,
          borderRadius: `${radius}px`,
          opacity,
          willChange: "transform, border-radius",
        }}
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={poster}
            className="w-full h-[60vh] sm:h-[70vh] object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : src || poster ? (
          <img
            src={src || poster}
            alt={alt}
            className="w-full h-[60vh] sm:h-[70vh] object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-[60vh] sm:h-[70vh] flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 mx-auto mb-4 flex items-center justify-center">
                <Recycle className="w-8 h-8 text-green-300/60" />
              </div>
              <p className="text-green-200/70 text-sm">Tydigo media placeholder</p>
            </div>
          </div>
        )}

        {/* Optional overlay */}
        {children && (
          <div className="absolute inset-0 flex items-end p-6 sm:p-10 bg-gradient-to-t from-black/50 to-transparent">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
