/**
 * Tydigo Analytics Service
 *
 * Tracks business events for observability, metrics, and reporting.
 * Events are written to the analytics_events table.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type AnalyticsEventName =
  | "pickup.created"
  | "matching.started"
  | "matching.succeeded"
  | "matching.exhausted"
  | "collector.offer_sent"
  | "collector.offer_accepted"
  | "collector.offer_rejected"
  | "collector.en_route"
  | "collector.arrived"
  | "pickup.verified"
  | "pickup.collected"
  | "pickup.completed"
  | "pickup.cancelled"
  | "payment.initialized"
  | "payment.completed"
  | "payment.failed"
  | "ecopoints.earned"
  | "ecopoints.redeemed"
  | "rating.submitted";

// ─── Track Event ──────────────────────────────────────────────

export async function trackEvent(params: {
  eventName: AnalyticsEventName;
  profileId?: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseAvailable() || !supabase) return;

  try {
    await supabase.from("analytics_events").insert({
      event_name: params.eventName,
      profile_id: params.profileId || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      properties: params.properties || {},
      occurred_at: new Date().toISOString(),
    });
  } catch (err) {
    // Analytics should never block the main flow
    console.warn("[Tydigo Analytics] Failed to track event:", params.eventName, err);
  }
}

// ─── Pickup Lifecycle Tracking ────────────────────────────────

export async function trackPickupCreated(pickupId: string, profileId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "pickup.created",
    profileId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackMatchingStarted(pickupId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "matching.started",
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackMatchingSucceeded(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "matching.succeeded",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackMatchingExhausted(pickupId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "matching.exhausted",
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackOfferSent(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "collector.offer_sent",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackOfferAccepted(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "collector.offer_accepted",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackOfferRejected(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "collector.offer_rejected",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackCollectorEnRoute(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "collector.en_route",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackCollectorArrived(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "collector.arrived",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackPickupVerified(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "pickup.verified",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackWasteCollected(pickupId: string, collectorId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "pickup.collected",
    profileId: collectorId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackPickupCompleted(pickupId: string, profileId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "pickup.completed",
    profileId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackPickupCancelled(pickupId: string, profileId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "pickup.cancelled",
    profileId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackPaymentInitialized(pickupId: string, profileId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "payment.initialized",
    profileId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackPaymentCompleted(pickupId: string, profileId: string, properties?: Record<string, unknown>) {
  await trackEvent({
    eventName: "payment.completed",
    profileId,
    entityType: "pickup",
    entityId: pickupId,
    properties,
  });
}

export async function trackEcoPointsEarned(profileId: string, points: number, sourceType: string, sourceId: string) {
  await trackEvent({
    eventName: "ecopoints.earned",
    profileId,
    entityType: sourceType,
    entityId: sourceId,
    properties: { points },
  });
}

export async function trackEcoPointsRedeemed(profileId: string, points: number, redemptionType: string, relatedId: string) {
  await trackEvent({
    eventName: "ecopoints.redeemed",
    profileId,
    entityType: redemptionType,
    entityId: relatedId,
    properties: { points },
  });
}

export async function trackRatingSubmitted(pickupId: string, profileId: string, rating: number) {
  await trackEvent({
    eventName: "rating.submitted",
    profileId,
    entityType: "pickup",
    entityId: pickupId,
    properties: { rating },
  });
}
