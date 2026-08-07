-- Migration: Pickup Verification Code System
-- Generates and validates pickup-specific verification codes.
-- NOT authentication OTP — these are transaction-specific codes.

BEGIN;

-- Function: generate_pickup_verification_code
-- Generates a random 6-digit code for pickup verification.
-- Called when a collector is assigned to a pickup.
CREATE OR REPLACE FUNCTION public.generate_pickup_verification_code(
  p_pickup_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_code TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Generate a random 6-digit code
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Store it on the pickup
  UPDATE pickup_requests
  SET verification_code = v_code, updated_at = v_now
  WHERE id = p_pickup_id;

  RETURN v_code;
END;
$$;

-- Function: validate_pickup_verification_code
-- Validates a verification code for a pickup.
-- Rate-limited: max 5 attempts per pickup.
CREATE OR REPLACE FUNCTION public.validate_pickup_verification_code(
  p_pickup_id UUID,
  p_code TEXT,
  p_validator_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_pickup RECORD;
  v_attempts INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get pickup with lock
  SELECT * INTO v_pickup
  FROM pickup_requests
  WHERE id = p_pickup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Pickup not found');
  END IF;

  -- Check if already verified
  IF v_pickup.status IN ('pickup_verified', 'waste_picked', 'in_transit_to_destination', 'delivered_to_partner', 'completed') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Pickup already verified');
  END IF;

  -- Check if collector is assigned
  IF v_pickup.collector_id IS NULL OR v_pickup.collector_id != p_validator_profile_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Not authorized to verify this pickup');
  END IF;

  -- Check verification attempts (rate limiting)
  SELECT COUNT(*) INTO v_attempts
  FROM pickup_status_events
  WHERE pickup_id = p_pickup_id
    AND to_status = 'pickup_verified'
    AND created_at > (v_now - INTERVAL '15 minutes');

  IF v_attempts >= 5 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Too many verification attempts. Please wait 15 minutes.');
  END IF;

  -- Validate code
  IF v_pickup.verification_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'No verification code set for this pickup');
  END IF;

  IF v_pickup.verification_code != p_code THEN
    -- Record failed attempt
    INSERT INTO pickup_status_events (pickup_id, to_status, notes, created_at)
    VALUES (p_pickup_id, v_pickup.status, 'Verification code attempt failed', v_now);

    RETURN jsonb_build_object('valid', false, 'error', 'Invalid verification code');
  END IF;

  -- Code is valid — transition to verified
  UPDATE pickup_requests
  SET
    status = 'pickup_verified',
    pickup_verified_at = v_now,
    updated_at = v_now
  WHERE id = p_pickup_id;

  -- Record successful verification
  INSERT INTO pickup_status_events (pickup_id, to_status, notes, created_at)
  VALUES (p_pickup_id, 'pickup_verified', 'Pickup verified with code', v_now);

  -- Create domain event
  INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, actor_profile_id, payload, occurred_at, processing_status)
  VALUES (
    gen_random_uuid()::text,
    'pickup.verified',
    'pickup',
    p_pickup_id,
    p_validator_profile_id,
    jsonb_build_object('pickup_id', p_pickup_id, 'collector_id', p_validator_profile_id),
    v_now,
    'pending'
  );

  -- Create analytics event
  INSERT INTO analytics_events (event_name, profile_id, entity_type, entity_id, properties, occurred_at)
  VALUES (
    'pickup.verified',
    p_validator_profile_id,
    'pickup',
    p_pickup_id,
    jsonb_build_object('method', 'code'),
    v_now
  );

  RETURN jsonb_build_object('valid', true, 'status', 'pickup_verified');
END;
$$;

-- Trigger: auto-generate verification code when collector is assigned
CREATE OR REPLACE FUNCTION public.auto_generate_verification_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Generate verification code when collector is assigned and no code exists
  IF NEW.status = 'collector_assigned' AND NEW.collector_id IS NOT NULL AND NEW.verification_code IS NULL THEN
    NEW.verification_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verification_code ON pickup_requests;
CREATE TRIGGER trg_auto_verification_code
  BEFORE UPDATE ON pickup_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_verification_code();

COMMIT;
