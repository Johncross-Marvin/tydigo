-- Migration: Acceptance Race Protection RPC
-- Ensures only one collector can accept a pickup assignment.
-- Uses row-level locking to prevent race conditions.

BEGIN;

-- Function: accept_collector_assignment
-- Atomically accepts an assignment, supersedes competing offers,
-- and transitions the pickup to collector_assigned.
CREATE OR REPLACE FUNCTION public.accept_collector_assignment(
  p_assignment_id UUID,
  p_collector_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_assignment RECORD;
  v_pickup RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Lock the assignment row
  SELECT * INTO v_assignment
  FROM collector_assignments
  WHERE id = p_assignment_id
    AND collector_id = p_collector_id
    AND status = 'offered'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found, not yours, or already taken');
  END IF;

  -- Lock the pickup row
  SELECT * INTO v_pickup
  FROM pickup_requests
  WHERE id = v_assignment.pickup_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pickup not found');
  END IF;

  -- Verify pickup is in a matchable state
  IF v_pickup.status NOT IN ('requested', 'matching_collector') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pickup is no longer available. Current status: ' || v_pickup.status);
  END IF;

  -- Check no other accepted assignment exists for this pickup
  IF EXISTS (
    SELECT 1 FROM collector_assignments
    WHERE pickup_request_id = v_assignment.pickup_request_id
      AND status = 'accepted'
      AND id != p_assignment_id
  ) THEN
    -- Mark this offer as superseded
    UPDATE collector_assignments
    SET status = 'superseded', cancelled_at = v_now
    WHERE id = p_assignment_id;

    RETURN jsonb_build_object('success', false, 'error', 'Another collector already accepted this pickup');
  END IF;

  -- Accept this assignment
  UPDATE collector_assignments
  SET status = 'accepted', accepted_at = v_now
  WHERE id = p_assignment_id;

  -- Supersede all other offers for this pickup
  UPDATE collector_assignments
  SET status = 'superseded', cancelled_at = v_now
  WHERE pickup_request_id = v_assignment.pickup_request_id
    AND id != p_assignment_id
    AND status = 'offered';

  -- Update pickup request
  UPDATE pickup_requests
  SET
    collector_id = p_collector_id,
    status = 'collector_assigned',
    collector_assigned_at = v_now,
    updated_at = v_now
  WHERE id = v_assignment.pickup_request_id;

  -- Create status event
  INSERT INTO pickup_status_events (pickup_id, to_status, notes, created_at)
  VALUES (v_assignment.pickup_request_id, 'collector_assigned', 'Collector accepted assignment', v_now);

  -- Create domain event
  INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, actor_profile_id, payload, occurred_at, processing_status)
  VALUES (
    gen_random_uuid()::text,
    'collector.assignment_accepted',
    'pickup',
    v_assignment.pickup_request_id,
    p_collector_id,
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'pickup_id', v_assignment.pickup_request_id,
      'collector_id', p_collector_id
    ),
    v_now,
    'pending'
  );

  -- Create analytics event
  INSERT INTO analytics_events (event_name, profile_id, entity_type, entity_id, properties, occurred_at)
  VALUES (
    'collector.offer_accepted',
    p_collector_id,
    'pickup',
    v_assignment.pickup_request_id,
    jsonb_build_object('assignment_id', p_assignment_id),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'pickup_id', v_assignment.pickup_request_id,
    'assignment_id', p_assignment_id,
    'status', 'collector_assigned'
  );
END;
$$;

-- Function: create_collector_offer
-- Creates an assignment offer for a collector.
-- Used by the matching engine.
CREATE OR REPLACE FUNCTION public.create_collector_offer(
  p_pickup_request_id UUID,
  p_collector_id UUID,
  p_distance_km REAL DEFAULT NULL,
  p_estimated_arrival_minutes INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_assignment_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Verify pickup exists and is matchable
  IF NOT EXISTS (
    SELECT 1 FROM pickup_requests
    WHERE id = p_pickup_request_id
      AND status IN ('requested', 'matching_collector')
  ) THEN
    RAISE EXCEPTION 'Pickup is not in a matchable state';
  END IF;

  -- Verify collector is eligible (active, online, not suspended)
  IF NOT EXISTS (
    SELECT 1 FROM collector_profiles cp
    JOIN profiles p ON p.id = cp.profile_id
    WHERE p.id = p_collector_id
      AND p.status = 'active'
      AND cp.is_online = true
  ) THEN
    RAISE EXCEPTION 'Collector is not eligible';
  END IF;

  -- Check no existing active assignment for this collector-pickup pair
  IF EXISTS (
    SELECT 1 FROM collector_assignments
    WHERE pickup_request_id = p_pickup_request_id
      AND collector_id = p_collector_id
      AND status IN ('offered', 'accepted')
  ) THEN
    RAISE EXCEPTION 'Collector already has an active offer for this pickup';
  END IF;

  -- Create offer
  INSERT INTO collector_assignments (
    pickup_request_id,
    collector_id,
    distance_km,
    estimated_arrival_minutes,
    status,
    created_at
  ) VALUES (
    p_pickup_request_id,
    p_collector_id,
    p_distance_km,
    p_estimated_arrival_minutes,
    'offered',
    v_now
  )
  RETURNING id INTO v_assignment_id;

  -- Transition pickup to matching_collector if not already
  UPDATE pickup_requests
  SET status = 'matching_collector', updated_at = v_now
  WHERE id = p_pickup_request_id
    AND status = 'requested';

  -- Create analytics event
  INSERT INTO analytics_events (event_name, profile_id, entity_type, entity_id, properties, occurred_at)
  VALUES (
    'collector.offer_sent',
    p_collector_id,
    'pickup',
    p_pickup_request_id,
    jsonb_build_object('assignment_id', v_assignment_id, 'distance_km', p_distance_km),
    v_now
  );

  RETURN v_assignment_id;
END;
$$;

-- Function: find_nearby_eligible_collectors
-- Finds collectors near a pickup point who are eligible for matching.
-- Uses PostGIS for geospatial queries.
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
    COALESCE(cperf.average_rating, 5.0) AS rating,
    COALESCE(cv.capacity_kg, 100) AS vehicle_capacity_kg,
    (
      SELECT COUNT(*)
      FROM collector_assignments ca
      WHERE ca.collector_id = p.id
        AND ca.status = 'accepted'
    ) AS current_jobs,
    COALESCE(cperf.acceptance_rate, 100) AS acceptance_rate,
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
