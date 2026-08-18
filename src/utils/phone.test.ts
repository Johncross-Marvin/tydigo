import { describe, it, expect } from "vitest";
import { normalizeNigerianPhone, isValidNigerianPhone, maskPhone } from "./phone";

describe("normalizeNigerianPhone", () => {
  it("normalizes 0800... to +234", () => {
    expect(normalizeNigerianPhone("08000000000")).toBe("+2348000000000");
  });

  it("normalizes 10-digit without leading 0", () => {
    expect(normalizeNigerianPhone("8000000000")).toBe("+2348000000000");
  });

  it("keeps +234 format", () => {
    expect(normalizeNigerianPhone("+2348000000000")).toBe("+2348000000000");
  });

  it("normalizes 234 prefix without +", () => {
    expect(normalizeNigerianPhone("2348000000000")).toBe("+2348000000000");
  });

  it("strips spaces and dashes", () => {
    expect(normalizeNigerianPhone("0800 000 0000")).toBe("+2348000000000");
    expect(normalizeNigerianPhone("0800-000-0000")).toBe("+2348000000000");
  });
});

describe("isValidNigerianPhone", () => {
  it("accepts valid Nigerian formats", () => {
    expect(isValidNigerianPhone("08000000000")).toBe(true);
    expect(isValidNigerianPhone("8000000000")).toBe(true);
    expect(isValidNigerianPhone("+2348000000000")).toBe(true);
  });

  it("rejects empty/invalid", () => {
    expect(isValidNigerianPhone("")).toBe(false);
    expect(isValidNigerianPhone("123")).toBe(false);
  });
});

describe("maskPhone", () => {
  it("masks middle digits", () => {
    expect(maskPhone("+2348000000000")).toContain("****");
  });

  it("returns short input unchanged", () => {
    expect(maskPhone("123")).toBe("123");
  });
});
