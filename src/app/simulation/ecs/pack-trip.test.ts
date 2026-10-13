import { describe, expect, it } from "vitest";
import { INITIAL_PACK_TRIP_SENSORS, PACK_TRIP_SENSORS, isPackTripped, packTripSensorId } from "./pack-trip";
import { computeRuntimeState, INITIAL_SOURCES, INITIAL_SWITCHES } from "../pneumatic/runtime-state";
import { PNEUMATIC_NODE } from "../pneumatic/main-network";

describe("pack trip", () => {
  it("has three sensors per pack", () => {
    expect(PACK_TRIP_SENSORS.filter((s) => s.side === "L")).toHaveLength(3);
    expect(PACK_TRIP_SENSORS.filter((s) => s.side === "R")).toHaveLength(3);
  });

  it("trips only the pack whose sensor detects an overheat", () => {
    expect(isPackTripped(INITIAL_PACK_TRIP_SENSORS, "L")).toBe(false);
    const sensors = { ...INITIAL_PACK_TRIP_SENSORS, [packTripSensorId("L", "turbineInlet")]: true };
    expect(isPackTripped(sensors, "L")).toBe(true);
    expect(isPackTripped(sensors, "R")).toBe(false);
  });

  it("closes the pack valve of the tripped pack", () => {
    const sensors = { ...INITIAL_PACK_TRIP_SENSORS, [packTripSensorId("R", "packDischarge")]: true };
    const runtime = computeRuntimeState(INITIAL_SWITCHES, INITIAL_SOURCES, undefined, undefined, sensors);
    expect(runtime.accessories[PNEUMATIC_NODE.lPackValve]?.open).toBe(true);
    expect(runtime.accessories[PNEUMATIC_NODE.rPackValve]?.open).toBe(false);
  });
});
