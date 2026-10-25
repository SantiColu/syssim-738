import { describe, expect, it } from "vitest";
import {
  engineDetection,
  fireProtectionReducer,
  getFireIndications,
  INITIAL_FIRE_PROTECTION,
  overheatDetectionCautions,
  SMOKE_DETECTORS,
  type FireProtectionAction,
  type FireProtectionState,
} from "./fire-protection";
import { computeRuntimeState, INITIAL_SOURCES, INITIAL_SWITCHES } from "../pneumatic/runtime-state";
import { PNEUMATIC_NODE } from "../pneumatic/main-network";

const run = (...actions: FireProtectionAction[]): FireProtectionState =>
  actions.reduce(fireProtectionReducer, INITIAL_FIRE_PROTECTION);

const engineFire = (engine: "eng1" | "eng2"): FireProtectionAction[] => [
  { type: "setEngineLoop", engine, loop: "A", state: "fire" },
  { type: "setEngineLoop", engine, loop: "B", state: "fire" },
];

const smoke = (compartment: "fwd" | "aft", loop: "A" | "B", position = 1): FireProtectionAction => ({
  type: "setSmokeDetector",
  id: `${compartment}-${loop}${position}`,
  state: "smoke",
});

describe("fire protection", () => {
  it("is quiet with nothing detected", () => {
    const lights = getFireIndications(INITIAL_FIRE_PROTECTION);
    expect(lights.fireWarnLit).toBe(false);
    expect(lights.bellSounding).toBe(false);
    expect(lights.faultLit).toBe(false);
    expect(overheatDetectionCautions(lights)).toEqual([]);
  });

  describe("engine detection (FCOM 8.20.1)", () => {
    it("needs both loops in NORMAL", () => {
      const single = engineDetection({ A: "fire", B: "normal" }, "NORMAL");
      expect(single.fire).toBe(false);
      expect(engineDetection({ A: "fire", B: "fire" }, "NORMAL").fire).toBe(true);
    });

    it("uses only the selected loop in A or B", () => {
      expect(engineDetection({ A: "fire", B: "normal" }, "A").fire).toBe(true);
      expect(engineDetection({ A: "fire", B: "normal" }, "B").fire).toBe(false);
    });

    it("deselects a failed loop in NORMAL with no indication", () => {
      const detection = engineDetection({ A: "failed", B: "overheat" }, "NORMAL");
      expect(detection.fault).toBe(false);
      expect(detection.overheat).toBe(true);
    });

    it("lights FAULT when no working loop is left", () => {
      expect(engineDetection({ A: "failed", B: "failed" }, "NORMAL").fault).toBe(true);
      expect(engineDetection({ A: "failed", B: "normal" }, "A").fault).toBe(true);
      const state = run(
        { type: "setEngineLoop", engine: "eng2", loop: "A", state: "failed" },
        { type: "setOvhtDet", engine: "eng2", select: "A" },
      );
      const lights = getFireIndications(state);
      expect(lights.faultLit).toBe(true);
      // FAULT does not light MASTER CAUTION
      expect(overheatDetectionCautions(lights)).toEqual([]);
    });

    it("lights ENG OVERHEAT and OVHT/DET on an overheat", () => {
      const state = run(
        { type: "setEngineLoop", engine: "eng1", loop: "A", state: "overheat" },
        { type: "setEngineLoop", engine: "eng1", loop: "B", state: "overheat" },
      );
      const lights = getFireIndications(state);
      expect(lights.engines.eng1.overheatLit).toBe(true);
      expect(lights.engines.eng1.fireSwitchLit).toBe(false);
      expect(lights.fireWarnLit).toBe(false);
      expect(overheatDetectionCautions(lights)).toEqual(["eng-overheat-eng1"]);
    });

    it("lights the fire switch, start lever, overheat light and FIRE WARN on a fire", () => {
      const lights = getFireIndications(run(...engineFire("eng2")));
      expect(lights.engines.eng2.fireSwitchLit).toBe(true);
      expect(lights.engines.eng2.startLeverLit).toBe(true);
      expect(lights.engines.eng2.overheatLit).toBe(true);
      expect(lights.engines.eng1.fireSwitchLit).toBe(false);
      expect(lights.fireWarnLit).toBe(true);
      expect(lights.bellSounding).toBe(true);
    });
  });

  describe("fire switches", () => {
    it("stay locked without a fire or overheat signal", () => {
      const state = run({ type: "pullFireSwitch", id: "eng1" });
      expect(state.fireSwitches.eng1).toBe(false);
    });

    it("unlock on ENG OVERHEAT and with the lock override", () => {
      const overheat = run(
        { type: "setEngineLoop", engine: "eng1", loop: "A", state: "overheat" },
        { type: "setEngineLoop", engine: "eng1", loop: "B", state: "overheat" },
        { type: "pullFireSwitch", id: "eng1" },
      );
      expect(overheat.fireSwitches.eng1).toBe(true);
      expect(run({ type: "pullFireSwitch", id: "apu", override: true }).fireSwitches.apu).toBe(true);
    });

    it("shut off the engine and arm one squib on each bottle when pulled", () => {
      const lights = getFireIndications(run(...engineFire("eng1"), { type: "pullFireSwitch", id: "eng1" }));
      expect(lights.engineShutoff).toEqual({ eng1: true, eng2: false });
      expect(lights.squibArmed("left", "eng1")).toBe(true);
      expect(lights.squibArmed("right", "eng1")).toBe(true);
      expect(lights.squibArmed("left", "eng2")).toBe(false);
    });

    it("do not discharge before being pulled", () => {
      const state = run(...engineFire("eng1"), { type: "rotateFireSwitch", id: "eng1", direction: "L" });
      expect(state.bottles.left.status).toBe("charged");
    });

    it("fire the left or right bottle into the related engine", () => {
      const state = run(
        ...engineFire("eng2"),
        { type: "pullFireSwitch", id: "eng2" },
        { type: "rotateFireSwitch", id: "eng2", direction: "R" },
      );
      expect(state.bottles.right).toEqual({
        status: "discharging",
        firedSquibs: ["eng2"],
        dischargedInto: ["eng2"],
      });
      expect(state.bottles.left.status).toBe("charged");
      // The BOTTLE DISCHARGE light waits for the agent to leave the bottle
      expect(getFireIndications(state).bottleDischargeLit.right).toBe(false);
      const discharged = fireProtectionReducer(state, { type: "completeDischarge", bottle: "right" });
      expect(getFireIndications(discharged).bottleDischargeLit.right).toBe(true);
    });

    it("let the second bottle go into the same engine", () => {
      const state = run(
        ...engineFire("eng1"),
        { type: "pullFireSwitch", id: "eng1" },
        { type: "rotateFireSwitch", id: "eng1", direction: "L" },
        { type: "completeDischarge", bottle: "left" },
        // Simulator choice: the agent put the fire out, so re-ignite it
        ...engineFire("eng1"),
        { type: "rotateFireSwitch", id: "eng1", direction: "R" },
      );
      expect(state.bottles.right.dischargedInto).toEqual(["eng1"]);
    });
  });

  describe("APU (FCOM 8.20.4)", () => {
    it("shuts down on a fire and sounds the wheel well horn", () => {
      const lights = getFireIndications(run({ type: "setApuLoop", state: "fire" }));
      expect(lights.apuFireSwitchLit).toBe(true);
      expect(lights.apuAutoShutdown).toBe(true);
      expect(lights.hornSounding).toBe(true);
      expect(lights.apuGroundLight).toBe("flashing");
    });

    it("lights APU DET INOP and OVHT/DET on a failed loop", () => {
      const lights = getFireIndications(run({ type: "setApuLoop", state: "failed" }));
      expect(lights.apuDetInopLit).toBe(true);
      expect(overheatDetectionCautions(lights)).toEqual(["apu-det-inop"]);
    });

    it("HORN CUTOUT silences bell and horn and steadies the light", () => {
      const lights = getFireIndications(
        run({ type: "setApuLoop", state: "fire" }, { type: "pushHornCutout" }),
      );
      expect(lights.hornSounding).toBe(false);
      expect(lights.bellSounding).toBe(false);
      expect(lights.apuGroundLight).toBe("steady");
      expect(lights.fireWarnLit).toBe(true);
    });

    it("can be discharged from the ground panel only with its handle down", () => {
      const fire = run({ type: "setApuLoop", state: "fire" });
      expect(fireProtectionReducer(fire, { type: "apuGroundDischarge" }).bottles.apu.status).toBe("charged");
      const state = run(
        { type: "setApuLoop", state: "fire" },
        { type: "setApuGroundHandle", pulled: true },
        { type: "apuGroundDischarge" },
      );
      expect(getFireIndications(state).apuShutoff).toBe(true);
      expect(state.bottles.apu.status).toBe("discharging");
    });
  });

  describe("FIRE WARN and BELL CUTOUT", () => {
    it("reset the warning until a new one comes", () => {
      const reset = run(...engineFire("eng1"), { type: "pushFireWarn" });
      expect(getFireIndications(reset).fireWarnLit).toBe(false);
      expect(getFireIndications(reset).engines.eng1.fireSwitchLit).toBe(true);

      const second = fireProtectionReducer(reset, { type: "setWheelWellLoop", state: "fire" });
      expect(getFireIndications(second).fireWarnLit).toBe(true);
    });

    it("light again when a reset warning comes back", () => {
      const reset = run(smoke("aft", "A"), smoke("aft", "B"), { type: "pushFireWarn" });
      const out = fireProtectionReducer(reset, { type: "setSmokeDetector", id: "aft-A1", state: "normal" });
      const back = fireProtectionReducer(out, smoke("aft", "A"));
      expect(getFireIndications(back).fireWarnLit).toBe(true);
    });
  });

  describe("tests (FCOM 8.20.8)", () => {
    it("FAULT/INOP lights FAULT, APU DET INOP and OVHT/DET", () => {
      const lights = getFireIndications(run({ type: "setFireTest", position: "FAULT/INOP" }));
      expect(lights.faultLit).toBe(true);
      expect(lights.apuDetInopLit).toBe(true);
      expect(overheatDetectionCautions(lights)).toEqual(["apu-det-inop"]);
    });

    it("OVHT/FIRE lights every fire and overheat indication", () => {
      const lights = getFireIndications(run({ type: "setFireTest", position: "OVHT/FIRE" }));
      expect(lights.engines.eng1.fireSwitchLit && lights.engines.eng2.fireSwitchLit).toBe(true);
      expect(lights.engines.eng1.startLeverLit && lights.engines.eng2.startLeverLit).toBe(true);
      expect(lights.engines.eng1.overheatLit && lights.engines.eng2.overheatLit).toBe(true);
      expect(lights.apuFireSwitchLit).toBe(true);
      expect(lights.wheelWellLit).toBe(true);
      expect(lights.fireWarnLit).toBe(true);
      expect(lights.hornSounding).toBe(true);
      expect(overheatDetectionCautions(lights)).toEqual(["eng-overheat-eng1", "eng-overheat-eng2"]);
      // The test does not shut the APU down
      expect(lights.apuAutoShutdown).toBe(false);
    });

    it("OVHT/FIRE does not get through an engine with a failed loop selected", () => {
      const state = run(
        { type: "setEngineLoop", engine: "eng1", loop: "B", state: "failed" },
        { type: "setFireTest", position: "OVHT/FIRE" },
      );
      expect(getFireIndications(state).engines.eng1.fireSwitchLit).toBe(false);
      expect(getFireIndications(state).engines.eng2.fireSwitchLit).toBe(true);
    });

    it("EXT TEST lights the three green lights while the squibs are intact", () => {
      const lights = getFireIndications(run({ type: "setExtTest", position: "1" }));
      expect(lights.extTestLit).toEqual({ left: true, right: true, apu: true });
      const fired = run(
        ...engineFire("eng1"),
        { type: "pullFireSwitch", id: "eng1" },
        { type: "rotateFireSwitch", id: "eng1", direction: "L" },
        { type: "setExtTest", position: "1" },
      );
      expect(getFireIndications(fired).extTestLit).toEqual({ left: false, right: true, apu: true });
      const other = fireProtectionReducer(fired, { type: "setExtTest", position: "2" });
      expect(getFireIndications(other).extTestLit.left).toBe(true);
    });
  });

  describe("cargo (FCOM 8.10.5, 8.20.5)", () => {
    it("has two detector pairs forward and three aft", () => {
      expect(SMOKE_DETECTORS.filter((d) => d.compartment === "fwd")).toHaveLength(4);
      expect(SMOKE_DETECTORS.filter((d) => d.compartment === "aft")).toHaveLength(6);
    });

    it("needs smoke on both loops in NORM", () => {
      const one = getFireIndications(run(smoke("fwd", "A")));
      expect(one.cargo.fwd.lit).toBe(false);
      const both = getFireIndications(run(smoke("fwd", "A"), smoke("fwd", "B", 2)));
      expect(both.cargo.fwd.lit).toBe(true);
      expect(both.cargo.aft.lit).toBe(false);
      expect(both.fireWarnLit).toBe(true);
    });

    it("works on one loop when selected or when the other loses power", () => {
      const selected = run(
        { type: "setCargoDetSelect", compartment: "aft", select: "B" },
        smoke("aft", "B", 3),
      );
      expect(getFireIndications(selected).cargo.aft.lit).toBe(true);
      const unpowered = run({ type: "setCargoLoopPowered", loop: "A", powered: false }, smoke("aft", "B"));
      const lights = getFireIndications(unpowered);
      expect(lights.cargo.aft.lit).toBe(true);
      expect(lights.cargoDetectorFault).toBe(true);
    });

    it("discharges the whole bottle into the armed compartment", () => {
      const notArmed = run(smoke("fwd", "A"), smoke("fwd", "B"), { type: "cargoDischarge" });
      expect(notArmed.bottles.cargo.status).toBe("charged");
      const state = run(
        smoke("fwd", "A"),
        smoke("fwd", "B"),
        { type: "toggleCargoArm", compartment: "fwd" },
        { type: "cargoDischarge" },
        { type: "completeDischarge", bottle: "cargo" },
      );
      expect(state.bottles.cargo.dischargedInto).toEqual(["fwd"]);
      expect(getFireIndications(state).cargoDischLit).toBe(true);
    });

    it("TEST lights FIRE WARN, EXT, FWD/AFT and DISCH", () => {
      const lights = getFireIndications(run({ type: "setCargoTest", pressed: true }));
      expect(lights.fireWarnLit).toBe(true);
      expect(lights.cargo.fwd.extTestLit && lights.cargo.aft.extTestLit).toBe(true);
      expect(lights.cargo.fwd.lit && lights.cargo.aft.lit).toBe(true);
      expect(lights.cargoDischLit).toBe(true);
      expect(lights.cargoDetectorFault).toBe(false);
    });

    it("TEST finds a failed detector", () => {
      const failed = run({ type: "setSmokeDetector", id: "aft-A2", state: "failed" });
      expect(getFireIndications(failed).cargoDetectorFault).toBe(false);
      const lights = getFireIndications(fireProtectionReducer(failed, { type: "setCargoTest", pressed: true }));
      expect(lights.cargoDetectorFault).toBe(true);
      expect(lights.cargo.aft.lit).toBe(false);
      expect(lights.cargo.fwd.lit).toBe(true);
    });
  });

  describe("lavatories (FCOM 8.20.7-8)", () => {
    it("discharge the extinguisher by heat and blacken the placard", () => {
      const burning = run({ type: "setLavatoryFire", lavatory: "D", fire: true });
      expect(burning.lavatories.D).toEqual({
        smoke: true,
        fire: true,
        extinguisherDischarged: false,
        placardBlack: true,
      });
      const state = fireProtectionReducer(burning, { type: "lavatoryHeatDischarge", lavatory: "D" });
      expect(state.lavatories.D.fire).toBe(false);
      expect(state.lavatories.D.extinguisherDischarged).toBe(true);
      // No flight deck indication
      expect(getFireIndications(state).fireWarnLit).toBe(false);
    });

    it("keep burning once the extinguisher is empty", () => {
      const state = run(
        { type: "setLavatoryFire", lavatory: "A", fire: true },
        { type: "lavatoryHeatDischarge", lavatory: "A" },
        { type: "setLavatoryFire", lavatory: "A", fire: true },
        { type: "lavatoryHeatDischarge", lavatory: "A" },
      );
      expect(state.lavatories.A.fire).toBe(true);
    });
  });

  describe("shutoffs in the pneumatic system", () => {
    it("close the engine and APU bleed valves whatever the BLEED switches say", () => {
      const switches = { ...INITIAL_SWITCHES, apuBleed: true };
      const open = computeRuntimeState(switches, INITIAL_SOURCES);
      expect(open.accessories[PNEUMATIC_NODE.eng1BleedValve]?.open).toBe(true);
      const runtime = computeRuntimeState(switches, INITIAL_SOURCES, undefined, undefined, undefined, {
        eng1: true,
        eng2: false,
        apu: true,
      });
      expect(runtime.accessories[PNEUMATIC_NODE.eng1BleedValve]?.open).toBe(false);
      expect(runtime.accessories[PNEUMATIC_NODE.eng2BleedValve]?.open).toBe(true);
      expect(runtime.accessories[PNEUMATIC_NODE.apuBleedValve]?.open).toBe(false);
    });
  });
});
