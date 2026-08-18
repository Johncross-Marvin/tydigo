-- ============================================================================
-- Migration 0019: PHASE 3R — Collector Assignment Status Column
-- ============================================================================
-- ROOT CAUSE:
--   Migration 0005 created `collector_assignments` WITHOUT a `status` column.
--   Migration 0007 (`accept_collector_assignment`, `create_collector_offer`,
--   `find_nearby_eligible_collectors`) and the frontend `collector.ts` service
--   all reference `collector_assignments.status` with values:
--       'offered', 'accepted', 'rejected', 'expired', 'superseded', 'cancelled'
--
--   Because the column does not exist, the ENTIRE collector offer/acceptance
--   flow fails at runtime with "column status does not exist" (SQLSTATE 42703).
--
-- FIX:
--   Add the missing `status` column (TEXT + CHECK constraint) and backfill
--   existing rows deterministically from their timestamp columns.
--
-- FORWARD-ONLY & IDEMPOTENT. Safe to run against production.
-- ============================================================================

BEGIN;

-- 1. Add the missing `status` column (idempotent)
ALTER TABLE public.collector_assignments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'offered';

-- 2. Add a CHECK constraint to enforce the canonical offer/assignment states.
--    (Wrapped in DO block so it is idempotent across re-runs.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'collector_assignments_status_check'
      AND conrelid = 'public.collector_assignments'::regclass
  ) THEN
    ALTER TABLE public.collector_assignments
      ADD CONSTRAINT collector_assignments_status_check
      CHECK (status IN ('offered', 'accepted', 'rejected', 'expired', 'superseded', 'cancelled'));
  END IF;
END $$;

-- 3. Backfill existing rows deterministically from timestamp columns.
--    Priority: cancelled_at → 'cancelled'; accepted_at → 'accepted';
--    otherwise → 'offered' (the default already applied).
UPDATE public.collector_assignments
SET status = CASE
  WHEN cancelled_at IS NOT NULL THEN 'cancelled'
  WHEN accepted_at IS NOT NULL THEN 'accepted'
  ELSE 'offered'
END
WHERE status = 'offered'
  AND (cancelled_at IS NOT NULL OR accepted_at IS NOT NULL);

-- 4. Index on status for offer/assignment queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_collector_assignments_status
  ON public.collector_assignments(status);

COMMIT;
