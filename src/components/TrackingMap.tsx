/**
 * Tydigo Live Tracking Map
 *
 * Google Maps integration for real-time collector tracking.
 * Falls back gracefully to a text-based display when Maps API is unavailable.
 */

import { useEffect, useRef, useState } from "react";
import { Navigation } from "lucide-react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const HAS_MAPS = Boolean(GOOGLE_MAPS_API_KEY);

type TrackingMapProps = {
  pickupLat?: number | null;
  pickupLng?: number | null;
  collectorLat?: number | null;
  collectorLng?: number | null;
  collectorHeading?: number | null;
  isLive?: boolean;
  etaMinutes?: number | null;
  lastUpdatedAt?: string | null;
};

export function TrackingMap({
  pickupLat,
  pickupLng,
  collectorLat,
  collectorLng,
  collectorHeading,
  isLive,
  etaMinutes,
  lastUpdatedAt,
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapInstanceRef = useRef<unknown>(null);
  const pickupMarkerRef = useRef<unknown>(null);
  const collectorMarkerRef = useRef<unknown>(null);

  // Initialize map
  useEffect(() => {
    if (!HAS_MAPS || !mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapRef.current) return;

      const center = pickupLat && pickupLng
        ? { lat: pickupLat, lng: pickupLng }
        : { lat: 9.0765, lng: 7.3986 }; // Default: Abuja

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        if (!google?.maps) {
          setMapError(true);
          return;
        }

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch {
        setMapError(true);
      }
    };

    // Load Google Maps script dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).google?.maps) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [pickupLat, pickupLng]);

  // Update pickup marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !pickupLat || !pickupLng) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.maps) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapInstanceRef.current as any;

    if (pickupMarkerRef.current) {
      (pickupMarkerRef.current as any).setPosition({ lat: pickupLat, lng: pickupLng });
    } else {
      pickupMarkerRef.current = new google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#145C25",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: "Pickup Location",
      });
    }
  }, [mapLoaded, pickupLat, pickupLng]);

  // Update collector marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !collectorLat || !collectorLng) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.maps) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapInstanceRef.current as any;
    const position = { lat: collectorLat, lng: collectorLng };

    if (collectorMarkerRef.current) {
      (collectorMarkerRef.current as any).setPosition(position);
    } else {
      collectorMarkerRef.current = new google.maps.Marker({
        position,
        map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#2563EB",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          rotation: collectorHeading || 0,
        },
        title: "Collector",
      });

      // Fit bounds to show both markers
      if (pickupLat && pickupLng) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(position);
        bounds.extend({ lat: pickupLat, lng: pickupLng });
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      }
    }
  }, [mapLoaded, collectorLat, collectorLng, collectorHeading, pickupLat, pickupLng]);

  // Fallback: no Google Maps
  if (!HAS_MAPS || mapError) {
    return (
      <div className="bg-neutral-200 h-64 flex items-center justify-center relative rounded-3xl overflow-hidden">
        <div className="text-center px-4">
          <Navigation className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
          <p className="text-neutral-500 font-semibold text-sm">Live Map</p>
          {collectorLat && collectorLng && (
            <p className="text-xs text-neutral-400 mt-1">
              Collector at {collectorLat.toFixed(4)}, {collectorLng.toFixed(4)}
            </p>
          )}
          {pickupLat && pickupLng && (
            <p className="text-xs text-neutral-400 mt-1">
              Pickup at {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
            </p>
          )}
          {!HAS_MAPS && (
            <p className="text-xs text-amber-500 mt-2">
              Google Maps API key not configured
            </p>
          )}
        </div>
        {isLive && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-bold text-neutral-900">Live</span>
              </div>
              {etaMinutes != null && (
                <span className="text-sm font-bold text-[#145C25]">ETA: {etaMinutes} min</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Staleness indicator
  const isStale = lastUpdatedAt
    ? (Date.now() - new Date(lastUpdatedAt).getTime()) > 120000 // 2 min
    : false;

  return (
    <div className="relative rounded-3xl overflow-hidden h-64">
      <div ref={mapRef} className="w-full h-full" />

      {/* Live indicator overlay */}
      {isLive && (
        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isStale ? "bg-amber-500" : "bg-green-500 animate-pulse"}`} />
              <span className="text-sm font-bold text-neutral-900">
                {isStale ? "Location stale" : "Live"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdatedAt && (
                <span className="text-xs text-neutral-500">
                  {isStale
                    ? `Updated ${Math.round((Date.now() - new Date(lastUpdatedAt).getTime()) / 60000)}m ago`
                    : "Just now"}
                </span>
              )}
              {etaMinutes != null && (
                <span className="text-sm font-bold text-[#145C25]">ETA: {etaMinutes} min</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
