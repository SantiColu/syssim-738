import { describe, expect, it } from "vitest";
import { OUTFLOW_VALVE_FULL_TRAVEL_S, stepOutflowValve } from "./outflow-valve";

const quarter = OUTFLOW_VALVE_FULL_TRAVEL_S / 4;

describe("outflow valve", () => {
  describe("in MAN", () => {
    it("opens while the switch is held OPEN", () => {
      expect(stepOutflowValve(0.5, { mode: "MAN", switchPosition: "OPEN" }, quarter)).toBeCloseTo(0.75);
    });

    it("closes while the switch is held CLOSE", () => {
      expect(stepOutflowValve(0.5, { mode: "MAN", switchPosition: "CLOSE" }, quarter)).toBeCloseTo(0.25);
    });

    it("stays where it is with the switch released", () => {
      expect(stepOutflowValve(0.3, { mode: "MAN", switchPosition: "OFF" }, quarter)).toBe(0.3);
    });

    it("stops at the ends of its travel", () => {
      expect(stepOutflowValve(0.9, { mode: "MAN", switchPosition: "OPEN" }, quarter)).toBe(1);
      expect(stepOutflowValve(0.1, { mode: "MAN", switchPosition: "CLOSE" }, quarter)).toBe(0);
    });

    it("takes the full travel time from closed to open", () => {
      expect(stepOutflowValve(0, { mode: "MAN", switchPosition: "OPEN" }, OUTFLOW_VALVE_FULL_TRAVEL_S)).toBe(1);
    });
  });

  it.each(["AUTO", "ALTN"] as const)("in %s drives fully open on the ground, ignoring the switch", (mode) => {
    expect(stepOutflowValve(0.5, { mode, switchPosition: "CLOSE" }, quarter)).toBeCloseTo(0.75);
    expect(stepOutflowValve(1, { mode, switchPosition: "OFF" }, quarter)).toBe(1);
  });
});
