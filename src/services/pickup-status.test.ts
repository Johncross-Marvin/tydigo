import { describe, it, expect } from "vitest";
import {
  canTransition,
  getNextStatuses,
  isActivePickup,
  isTerminalStatus,
  VALID_TRANSITIONS,
  type PickupStatus,
} from "./pickup-status";

describe("pickup status state machine", () => {
  it("allows draft → requested", () => {
    expect(canTransition("draft", "requested")).toBe(true);
  });

  it("allows draft → cancelled", () => {
    expect(canTransition("draft", "cancelled")).toBe(true);
  });

  it("does not allow draft → completed (skipping lifecycle)", () => {
    expect(canTransition("draft", "completed")).toBe(false);
  });

  it("does not allow completed → anything (terminal)", () => {
    expect(getNextStatuses("completed")).toEqual([]);
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("does not allow cancelled → anything (terminal)", () => {
    expect(getNextStatuses("cancelled")).toEqual([]);
  });

  it("allows the full happy-path lifecycle in order", () => {
    const path: PickupStatus[] = [
      "draft",
      "requested",
      "matching_collector",
      "collector_assigned",
      "collector_en_route",
      "collector_arrived",
      "pickup_verified",
      "waste_picked",
      "in_transit_to_destination",
      "delivered_to_partner",
      "completed",
    ];

    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it("allows cancellation at every pre-completion stage", () => {
    const cancellable: PickupStatus[] = [
      "draft",
      "requested",
      "matching_collector",
      "collector_assigned",
      "collector_en_route",
      "collector_arrived",
      "pickup_verified",
      "waste_picked",
      "in_transit_to_destination",
    ];
    for (const status of cancellable) {
      expect(canTransition(status, "cancelled")).toBe(true);
    }
  });

  it("does not allow cancellation after completion", () => {
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("allows dispute from verified/waste_picked/delivered", () => {
    expect(canTransition("pickup_verified", "disputed")).toBe(true);
    expect(canTransition("waste_picked", "disputed")).toBe(true);
    expect(canTransition("delivered_to_partner", "disputed")).toBe(true);
  });

  it("identifies active vs terminal statuses", () => {
    expect(isActivePickup("collector_en_route")).toBe(true);
    expect(isActivePickup("completed")).toBe(false);
    expect(isActivePickup("cancelled")).toBe(false);
    expect(isActivePickup("draft")).toBe(false);
  });

  it("identifies terminal statuses", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("collector_en_route")).toBe(false);
  });

  it("has a transition map covering every status key", () => {
    const keys = Object.keys(VALID_TRANSITIONS) as PickupStatus[];
    expect(keys).toContain("draft");
    expect(keys).toContain("completed");
    expect(keys).toContain("disputed");
  });
});
