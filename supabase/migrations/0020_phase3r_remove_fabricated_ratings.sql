-- ============================================================================
-- Migration 0020: PHASE 3R — Remove Fabricated Ratings / Rates
-- ============================================================================
-- ROOT CAUSE:
--   Several places fabricate a "5.0" rating and "100%" acceptance rate when no
--   real data exists, violating the directive's "no hard-coded ratings" rule:
--     1. `collector_performance.average_rating` has DEFAULT 5.0.
--     2. `find_nearby_eligible_collectors` RPC uses COALESCE(..., 5.0) for
--        rating and COALESCE(..., 100) for acceptance_rate.
--
-- FIX:
--   Make `average_rating` nullable (no fabricated default) and rewrite the RPC
--   to return NULL when no real rating/rate exists, so the UI can display
--   "New collector" / "—" instead of a fake 5.0 / 100%.
--
-- FORWARD-ONLY & IDEMPOTENT. Safe to run against production.
-- ============================================================================

BEGIN;

-- 1. Drop the fabricated default on average_rating and make it nullable.
ALTER TABLE public.collector_performance
  ALTER COLUMN average_rating DROP DEFAULT,
  ALTER COLUMN average_rating DROP NOT NULL;

-- 2. Rewrite the matching RPC to stop fabricating rating/acceptance_rate.
--    Return NULL when no real value exists (no COALESCE to 5.0 / 100).
CREATE OR REPLACE FUNCTION public.find_nearby_eligible_collectors(
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_max_distance_km REAL DEFAULT 10,
  p_required_capacity_kg REAL DEFAULT NULL,
  p_waste_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  collector_id UUID,
  profile_id UUID,
  full_name TEXT,
  distance_km REAL,
  rating REAL,
  vehicle_capacity_kg REAL,
  current_jobs BIGINT,
  acceptance_rate REAL,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_pickup_point GEOGRAPHY;
  v_location_max_age INTERVAL := '30 minutes';
BEGIN
  v_pickup_point := ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::GEOGRAPHY;

  RETURN QUERY
  SELECT
    p.id AS collector_id,
    p.id AS profile_id,
    p.full_name,
    ST_Distance(cp_loc.geog, v_pickup_point) / 1000.0 AS distance_km,
    -- Do NOT fabricate a rating. NULL means "no real rating yet".
    cperf.average_rating AS rating,
    COALESCE(cv.capacity_kg, 100) AS vehicle_capacity_kg,
    (
      SELECT COUNT(*)
      FROM collector_assignments ca
      WHERE ca.collector_id = p.id
        AND ca.status = 'accepted'
    ) AS current_jobs,
    -- Do NOT fabricate an acceptance rate. NULL means "no real data yet".
    cperf.acceptance_rate AS acceptance_rate,
    cp.current_lat,
    cp.current_lng
  FROM profiles p
  JOIN collector_profiles cp ON cp.profile_id = p.id
  LEFT JOIN collector_vehicles cv ON cv.collector_id = p.id AND cv.status = 'active'
  LEFT JOIN collector_performance cperf ON cperf.collector_id = p.id
  CROSS JOIN LATERAL (
    SELECT ST_SetSRID(ST_MakePoint(cp.current_lng, cp.current_lat), 4326)::GEOGRAPHY AS geog
  ) cp_loc
  WHERE p.role = 'collector'
    AND p.status = 'active'
    AND cp.is_online = true
    AND cp.kyc_status = 'approved'
    AND cp.current_lat IS NOT NULL
    AND cp.current_lng IS NOT NULL
    AND cp.last_location_at IS NOT NULL
    AND cp.last_location_at > (NOW() - v_location_max_age)
    AND ST_DWithin(cp_loc.geog, v_pickup_point, p_max_distance_km * 1000)
    AND (p_required_capacity_kg IS NULL OR COALESCE(cv.capacity_kg, 100) >= p_required_capacity_kg)
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$$;

COMMIT;
