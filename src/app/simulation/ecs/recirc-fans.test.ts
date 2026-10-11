import { describe, expect, it } from "vitest";
import { recircFansRunning, type RecircFanInputs } from "./recirc-fans";

const base: RecircFanInputs = {
  lSwitchAuto: true,
  rSwitchAuto: true,
  lPack: "AUTO",
  rPack: "AUTO",
  lPackOperating: true,
  rPackOperating: true,
  inFlight: false,
};

const run = (inputs: Partial<RecircFanInputs>) => recircFansRunning({ ...base, ...inputs });

describe("recirculation fans", () => {
  it("stop when their switch is OFF", () => {
    expect(run({ lSwitchAuto: false })).toEqual({ left: false, right: true });
    expect(run({ rSwitchAuto: false, inFlight: true })).toEqual({ left: true, right: false });
  });

  describe("on the ground", () => {
    it("both run with the packs in AUTO", () => {
      expect(run({})).toEqual({ left: true, right: true });
    });

    it("both run even with the packs off", () => {
      expect(run({ lPack: "OFF", rPack: "OFF", lPackOperating: false, rPackOperating: false })).toEqual({
        left: true,
        right: true,
      });
    });

    it("left runs with one PACK switch in HIGH", () => {
      expect(run({ lPack: "HIGH" })).toEqual({ left: true, right: true });
    });

    it("left stops with both PACK switches in HIGH; right keeps running", () => {
      expect(run({ lPack: "HIGH", rPack: "HIGH" })).toEqual({ left: false, right: true });
    });
  });

  describe("in flight", () => {
    it("both run with both packs operating in AUTO", () => {
      expect(run({ inFlight: true })).toEqual({ left: true, right: true });
    });

    it("both stop unless both packs are operating", () => {
      expect(run({ inFlight: true, rPackOperating: false })).toEqual({ left: false, right: false });
    });

    it("left stops with either PACK switch in HIGH", () => {
      expect(run({ inFlight: true, rPack: "HIGH" })).toEqual({ left: false, right: true });
    });

    it("right stops only with both PACK switches in HIGH", () => {
      expect(run({ inFlight: true, lPack: "HIGH", rPack: "HIGH" })).toEqual({ left: false, right: false });
    });
  });
});
