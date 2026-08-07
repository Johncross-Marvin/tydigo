-- Migration: Pickup Creation Idempotency
-- Ensures double-tap / retry does not create duplicate pickups.
-- Uses idempotency keys to detect and reject duplicate submissions.

BEGIN;

-- Add idempotency_key column to pickup_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_requests' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE pickup_requests ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX idx_pickup_requests_idempotency_key
      ON pickup_requests(idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

-- Function: create_pickup_idempotent
-- Creates a pickup request atomically with idempotency protection.
-- If the idempotency key already exists, returns the existing pickup.
CREATE OR REPLACE FUNCTION public.create_pickup_idempotent(
  p_idempotency_key TEXT,
  p_customer_id UUID,
  p_waste_type TEXT,
  p_estimated_weight_kg REAL,
  p_pickup_address TEXT,
  p_pickup_lat DOUBLE PRECISION DEFAULT NULL,
  p_pickup_lng DOUBLE PRECISION DEFAULT NULL,
  p_pickup_instructions TEXT DEFAULT NULL,
  p_requested_window TEXT DEFAULT NULL,
  p_sorting_verified BOOLEAN DEFAULT FALSE,
  p_base_price_ngn INTEGER DEFAULT NULL,
  p_waste_modifier_ngn INTEGER DEFAULT NULL,
  p_platform_fee_ngn INTEGER DEFAULT NULL,
  p_ecopoints_discount_ngn INTEGER DEFAULT NULL,
  p_final_total_ngn INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'card',
  p_ecopoints_to_apply INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_existing RECORD;
  v_pickup_id UUID;
  v_pickup_code TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_payment_status TEXT;
BEGIN
  -- Check idempotency: if this key was already used, return existing pickup
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM pickup_requests
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', v_existing.id,
        'pickup_code', v_existing.pickup_code,
        'status', v_existing.status,
        'payment_status', v_existing.payment_status,
        'final_total_ngn', v_existing.final_total_ngn,
        'created_at', v_existing.created_at,
        'idempotent', true,
        'existing', true
      );
    END IF;
  END IF;

  -- Generate pickup ID and code
  v_pickup_id := gen_random_uuid();
  v_pickup_code := 'TYD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Determine payment status
  v_payment_status := CASE
    WHEN p_payment_method = 'transfer' THEN 'pay_on_pickup'
    ELSE 'pending'
  END;

  -- Create pickup request
  INSERT INTO pickup_requests (
    id,
    customer_id,
    waste_type,
    estimated_weight_kg,
    sorting_verified,
    pickup_address,
    pickup_lat,
    pickup_lng,
    pickup_instructions,
    requested_window,
    pickup_code,
    base_price_ngn,
    waste_modifier_ngn,
    platform_fee_ngn,
    ecopoints_discount_ngn,
    final_total_ngn,
    status,
    payment_status,
    idempotency_key,
    created_at,
    updated_at
  ) VALUES (
    v_pickup_id,
    p_customer_id,
    p_waste_type,
    p_estimated_weight_kg,
    p_sorting_verified,
    p_pickup_address,
    p_pickup_lat,
    p_pickup_lng,
    p_pickup_instructions,
    p_requested_window,
    v_pickup_code,
    p_base_price_ngn,
    p_waste_modifier_ngn,
    p_platform_fee_ngn,
    p_ecopoints_discount_ngn,
    p_final_total_ngn,
    'requested',
    v_payment_status,
    p_idempotency_key,
    v_now,
    v_now
  );

  -- Create status event
  INSERT INTO pickup_status_events (pickup_id, to_status, notes, created_at)
  VALUES (v_pickup_id, 'requested', 'Pickup request created', v_now);

  -- Handle EcoPoints redemption if applicable
  IF p_ecopoints_to_apply > 0 AND p_ecopoints_discount_ngn > 0 THEN
    BEGIN
      PERFORM redeem_ecopoints(
        p_customer_id,
        p_ecopoints_to_apply,
        'pickup_discount',
        'pickup',
        v_pickup_id,
        'pickup_' || v_pickup_id || '_ecopoints',
        'EcoPoints discount for pickup ' || v_pickup_code
      );
    EXCEPTION WHEN OTHERS THEN
      -- EcoPoints redemption failure should not block pickup creation
      RAISE WARNING 'EcoPoints redemption failed for pickup %: %', v_pickup_id, SQLERRM;
    END;
  END IF;

  -- Create domain event
  INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, actor_profile_id, payload, occurred_at, processing_status)
  VALUES (
    gen_random_uuid()::text,
    'pickup.created',
    'pickup',
    v_pickup_id,
    p_customer_id,
    jsonb_build_object(
      'pickup_id', v_pickup_id,
      'pickup_code', v_pickup_code,
      'waste_type', p_waste_type,
      'estimated_weight_kg', p_estimated_weight_kg,
      'final_total_ngn', p_final_total_ngn
    ),
    v_now,
    'pending'
  );

  -- Create analytics event
  INSERT INTO analytics_events (event_name, profile_id, entity_type, entity_id, properties, occurred_at)
  VALUES (
    'pickup.created',
    p_customer_id,
    'pickup',
    v_pickup_id,
    jsonb_build_object(
      'waste_type', p_waste_type,
      'estimated_weight_kg', p_estimated_weight_kg,
      'final_total_ngn', p_final_total_ngn,
      'payment_method', p_payment_method
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'id', v_pickup_id,
    'pickup_code', v_pickup_code,
    'status', 'requested',
    'payment_status', v_payment_status,
    'final_total_ngn', p_final_total_ngn,
    'created_at', v_now,
    'idempotent', true,
    'existing', false
  );
END;
$$;

COMMIT;
