import { describe, it, expect } from "vitest";
import { ACCOUNT_TYPES, getAccountTypeConfig } from "./signup-config";

describe("signup account type registry", () => {
  it("defines all nine public account types", () => {
    const roles = ACCOUNT_TYPES.map((c) => c.role).sort();
    expect(roles).toEqual([
      "business",
      "collector",
      "corporate_partner",
      "estate",
      "fleet_owner",
      "government",
      "household",
      "organic_partner",
      "recycler",
    ]);
  });

  it("does not expose admin or partner as public signup", () => {
    const roles = ACCOUNT_TYPES.map((c) => c.role);
    expect(roles).not.toContain("admin");
    expect(roles).not.toContain("partner");
  });

  it("marks operational roles as requiring verification", () => {
    const verificationRoles = ACCOUNT_TYPES.filter((c) => c.requiresVerification).map((c) => c.role);
    expect(verificationRoles).toContain("collector");
    expect(verificationRoles).toContain("recycler");
    expect(verificationRoles).toContain("fleet_owner");
    expect(verificationRoles).toContain("government");
    expect(verificationRoles).toContain("corporate_partner");
    expect(verificationRoles).toContain("organic_partner");
  });

  it("does not require verification for household/estate/business", () => {
    expect(getAccountTypeConfig("household")?.requiresVerification).toBe(false);
    expect(getAccountTypeConfig("estate")?.requiresVerification).toBe(false);
    expect(getAccountTypeConfig("business")?.requiresVerification).toBe(false);
  });

  it("every account type has a title, description, and at least one step", () => {
    for (const type of ACCOUNT_TYPES) {
      expect(type.title).toBeTruthy();
      expect(type.description).toBeTruthy();
      expect(type.steps.length).toBeGreaterThan(0);
    }
  });

  it("getAccountTypeConfig returns undefined for unknown role", () => {
    expect(getAccountTypeConfig("admin")).toBeUndefined();
  });
});
