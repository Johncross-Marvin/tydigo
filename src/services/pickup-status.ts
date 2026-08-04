/**
 * Tydigo Pickup Status Transitions
 *
 * Defines valid status transitions for the pickup lifecycle.
 * Ensures status changes follow the correct workflow.
 */

export type PickupStatus =
  | "draft"
  | "requested"
  | "matching_collector"
  | "collector_assigned"
  | "collector_en_route"
  | "collector_arrived"
  | "pickup_verified"
  | "waste_picked"
  | "in_transit_to_destination"
  | "delivered_to_partner"
  | "completed"
  | "cancelled"
  | "disputed";

// ─── Valid Transitions ───────────────────────────────────────

export const VALID_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  draft: ["requested", "cancelled"],
  requested: ["matching_collector", "cancelled"],
  matching_collector: ["collector_assigned", "cancelled"],
  collector_assigned: ["collector_en_route", "cancelled"],
  collector_en_route: ["collector_arrived", "cancelled"],
  collector_arrived: ["pickup_verified", "cancelled"],
  pickup_verified: ["waste_picked", "cancelled", "disputed"],
  waste_picked: ["in_transit_to_destination", "cancelled", "disputed"],
  in_transit_to_destination: ["delivered_to_partner", "cancelled"],
  delivered_to_partner: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  disputed: ["cancelled", "completed"],
};

// ─── Status Labels ───────────────────────────────────────────

export const STATUS_LABELS: Record<PickupStatus, string> = {
  draft: "Draft",
  requested: "Requested",
  matching_collector: "Matching Collector",
  collector_assigned: "Collector Assigned",
  collector_en_route: "Collector En Route",
  collector_arrived: "Collector Arrived",
  pickup_verified: "Pickup Verified",
  waste_picked: "Waste Picked",
  in_transit_to_destination: "In Transit",
  delivered_to_partner: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

// ─── Status Colors (for badges) ──────────────────────────────

export const STATUS_COLORS: Record<PickupStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  requested: "bg-blue-100 text-blue-700",
  matching_collector: "bg-purple-100 text-purple-700",
  collector_assigned: "bg-indigo-100 text-indigo-700",
  collector_en_route: "bg-sky-100 text-sky-700",
  collector_arrived: "bg-teal-100 text-teal-700",
  pickup_verified: "bg-emerald-100 text-emerald-700",
  waste_picked: "bg-green-100 text-green-700",
  in_transit_to_destination: "bg-amber-100 text-amber-700",
  delivered_to_partner: "bg-orange-100 text-orange-700",
  completed: "bg-green-200 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  disputed: "bg-red-200 text-red-800",
};

// ─── Status Icons ────────────────────────────────────────────

export const STATUS_ICONS: Record<PickupStatus, string> = {
  draft: "Edit3",
  requested: "Send",
  matching_collector: "Search",
  collector_assigned: "UserCheck",
  collector_en_route: "Truck",
  collector_arrived: "MapPin",
  pickup_verified: "CheckCircle",
  waste_picked: "PackageCheck",
  in_transit_to_destination: "Navigation",
  delivered_to_partner: "Building",
  completed: "Award",
  cancelled: "XCircle",
  disputed: "AlertTriangle",
};

// ─── Transition Helpers ──────────────────────────────────────

/**
 * Check if a transition is valid.
 */
export function canTransition(
  from: PickupStatus,
  to: PickupStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the list of possible next statuses.
 */
export function getNextStatuses(from: PickupStatus): PickupStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

/**
 * Get the display label for a status.
 */
export function getStatusLabel(status: PickupStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Get the CSS classes for a status badge.
 */
export function getStatusColor(status: PickupStatus): string {
  return STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
}

/**
 * Check if a status represents an active/in-progress pickup.
 */
export function isActivePickup(status: PickupStatus): boolean {
  const activeStatuses: PickupStatus[] = [
    "requested",
    "matching_collector",
    "collector_assigned",
    "collector_en_route",
    "collector_arrived",
    "pickup_verified",
    "waste_picked",
    "in_transit_to_destination",
    "delivered_to_partner",
  ];
  return activeStatuses.includes(status);
}

/**
 * Check if a status is a terminal state.
 */
export function isTerminalStatus(status: PickupStatus): boolean {
  return status === "completed" || status === "cancelled";
}
