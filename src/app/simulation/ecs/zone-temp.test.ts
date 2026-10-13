import { describe, expect, it } from "vitest";
import { DUCT_OVERHEAT_SENSORS, INITIAL_DUCT_OVERHEAT, isTrimValveOpen } from "./zone-temp";

describe("duct overheat", () => {
  it("has one sensor per zone temperature light", () => {
    expect(DUCT_OVERHEAT_SENSORS.map((s) => s.light)).toEqual(["CONT CAB", "FWD CAB", "AFT CAB"]);
    expect(Object.values(INITIAL_DUCT_OVERHEAT).every((tripped) => !tripped)).toBe(true);
  });

  it("closes the zone trim air valve while its duct is overheated", () => {
    expect(isTrimValveOpen(true, false)).toBe(true);
    expect(isTrimValveOpen(true, true)).toBe(false);
    expect(isTrimValveOpen(false, false)).toBe(false);
  });
});
