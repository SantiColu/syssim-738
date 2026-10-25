import { describe, expect, it } from "vitest";
import {
  APU_FUEL_FLOW_KG_S,
  ENGINE_IDLE_FUEL_FLOW_KG_S,
  fuelCautions,
  fuelSystemReducer,
  getFuelIndications,
  INITIAL_FUEL_SYSTEM,
  REFUEL_FLOW_KG_S,
  SCAVENGE_FLOW_KG_S,
  TANK_CAPACITY_KG,
  type FuelSystemAction,
  type FuelSystemState,
  type PumpId,
} from "./fuel-system";

const run = (...actions: FuelSystemAction[]): FuelSystemState =>
  actions.reduce(fuelSystemReducer, INITIAL_FUEL_SYSTEM);

const from = (state: FuelSystemState, ...actions: FuelSystemAction[]) => actions.reduce(fuelSystemReducer, state);

const pumpsOff = (...pumps: PumpId[]): FuelSystemAction[] =>
  pumps.map((pump) => ({ type: "setPumpSwitch", pump, on: false }));

const valveTravel = (...valves: ("spar1" | "spar2" | "crossfeed" | "apu")[]): FuelSystemAction[] =>
  valves.map((valve) => ({ type: "completeValveTravel", valve }));

const noFire = INITIAL_FUEL_SYSTEM.fire;

describe("fuel system", () => {
  it("starts ready for taxi: no lights, engines fed from the center tank", () => {
    const lights = getFuelIndications(INITIAL_FUEL_SYSTEM);
    expect(Object.values(lights.pumps).some((p) => p.lowPressureLit)).toBe(false);
    expect(lights.engines.eng1.engineValveLight).toBe("off");
    expect(lights.engines.eng1.sparValveLight).toBe("off");
    expect(lights.crossfeedLight).toBe("off");
    expect(lights.engines.eng1.feed).toMatchObject({ kind: "pressure", tanks: ["center"] });
    expect(lights.engines.eng2.feed).toMatchObject({ kind: "pressure", tanks: ["center"] });
    expect(fuelCautions(INITIAL_FUEL_SYSTEM)).toEqual([]);
    expect(lights.totalKg).toBe(3915 + 3000 + 3915);
  });

  describe("pumps and feed (FCOM 12.20.1-2)", () => {
    it("uses center tank fuel first even with all pumps on", () => {
      const state = from(INITIAL_FUEL_SYSTEM, { type: "tick", seconds: 100 });
      expect(state.quantityKg.center).toBeCloseTo(3000 - 2 * ENGINE_IDLE_FUEL_FLOW_KG_S * 100);
      expect(state.quantityKg.tank1).toBe(3915);
      expect(state.quantityKg.tank2).toBe(3915);
    });

    it("feeds each engine from its main tank once the center pumps are off", () => {
      const state = run(...pumpsOff("ctrL", "ctrR"), { type: "tick", seconds: 100 });
      const burn = ENGINE_IDLE_FUEL_FLOW_KG_S * 100;
      expect(state.quantityKg.tank1).toBeCloseTo(3915 - burn);
      expect(state.quantityKg.tank2).toBeCloseTo(3915 - burn);
      expect(state.quantityKg.center).toBe(3000);
    });

    it("lights a main tank LOW PRESSURE with its switch OFF, a center one only with it ON", () => {
      const state = run(...pumpsOff("fwd1", "ctrL"));
      const lights = getFuelIndications(state);
      expect(lights.pumps.fwd1.lowPressureLit).toBe(true);
      expect(lights.pumps.ctrL.lowPressureLit).toBe(false);
      // A center pump ON with an empty tank: low pressure
      const empty = from(INITIAL_FUEL_SYSTEM, { type: "setQuantity", tank: "center", kg: 0 });
      expect(getFuelIndications(empty).pumps.ctrR.lowPressureLit).toBe(true);
    });

    it("suction feeds an engine from its own tank without pump pressure", () => {
      const state = run(...pumpsOff("aft1", "fwd1", "ctrL", "ctrR", "fwd2", "aft2"));
      const lights = getFuelIndications(state);
      expect(lights.engines.eng1.feed).toMatchObject({ kind: "suction", tanks: ["tank1"] });
      expect(state.running.eng1).toBe(true);
      expect(lights.engines.eng2.feed).toMatchObject({ kind: "suction", tanks: ["tank2"] });
    });

    it("stops an engine with no fuel in its manifold", () => {
      const state = run(
        ...pumpsOff("ctrL", "ctrR", "fwd2", "aft2"),
        { type: "setQuantity", tank: "tank2", kg: 0 },
      );
      expect(state.running.eng2).toBe(false);
      expect(state.running.eng1).toBe(true);
      expect(getFuelIndications(state).engines.eng2.fuelCut).toMatch(/sin combustible/);
    });

    it("gives the center tank no suction feed", () => {
      const state = run(
        ...pumpsOff("aft1", "fwd1", "ctrL", "ctrR", "fwd2", "aft2"),
        { type: "tick", seconds: 60 },
      );
      expect(state.quantityKg.center).toBe(3000);
    });
  });

  describe("crossfeed (FCOM 12.20.2, SP.12.2)", () => {
    it("shows bright while the valve travels, then dim open", () => {
      const moving = run({ type: "setCrossfeed", open: true });
      expect(getFuelIndications(moving).crossfeedLight).toBe("bright");
      const open = from(moving, ...valveTravel("crossfeed"));
      expect(getFuelIndications(open).crossfeedLight).toBe("dim");
      const closing = from(open, { type: "setCrossfeed", open: false });
      expect(getFuelIndications(closing).crossfeedLight).toBe("bright");
      expect(getFuelIndications(from(closing, ...valveTravel("crossfeed"))).crossfeedLight).toBe("off");
    });

    it("stays bright when the valve is stuck", () => {
      const state = run(
        { type: "setValveStuck", valve: "crossfeed", stuck: true },
        { type: "setCrossfeed", open: true },
        ...valveTravel("crossfeed"),
      );
      expect(state.valveOpen.crossfeed).toBe(false);
      expect(getFuelIndications(state).crossfeedLight).toBe("bright");
    });

    it("balances the tanks: crossfeed open and the low tank pumps off", () => {
      const state = run(
        { type: "setQuantity", tank: "center", kg: 0 },
        ...pumpsOff("ctrL", "ctrR"),
        { type: "setCrossfeed", open: true },
        ...valveTravel("crossfeed"),
        ...pumpsOff("fwd2", "aft2"),
        { type: "tick", seconds: 100 },
      );
      expect(state.quantityKg.tank1).toBeCloseTo(3915 - 2 * ENGINE_IDLE_FUEL_FLOW_KG_S * 100);
      expect(state.quantityKg.tank2).toBe(3915);
    });
  });

  describe("spar and engine fuel shutoff valves (FCOM 12.20.3, 7.20.7)", () => {
    it("closes both with the start lever at CUTOFF and stops the engine", () => {
      const state = run({ type: "setStartLever", engine: "eng1", position: "CUTOFF" });
      const lights = getFuelIndications(state);
      expect(state.running.eng1).toBe(false);
      expect(lights.engines.eng1.engineValveLight).toBe("dim");
      expect(lights.engines.eng1.sparValveLight).toBe("bright");
      expect(getFuelIndications(from(state, ...valveTravel("spar1"))).engines.eng1.sparValveLight).toBe("dim");
    });

    it("leaves ENG VALVE CLOSED bright at IDLE with the engine stopped (SP.12.1)", () => {
      const stopped = run({ type: "stopEngine", engine: "eng1" }, ...valveTravel("spar1"));
      const idle = from(stopped, { type: "setStartLever", engine: "eng1", position: "IDLE" }, ...valveTravel("spar1"));
      const lights = getFuelIndications(idle);
      expect(idle.running.eng1).toBe(false);
      expect(lights.engines.eng1.engineValveLight).toBe("bright");
      expect(lights.engines.eng1.sparValveLight).toBe("off");
    });

    it("closes both when the fire switch is pulled", () => {
      const state = run({ type: "syncFire", fire: { ...noFire, engineFireSwitch: { eng1: false, eng2: true } } });
      expect(state.running.eng2).toBe(false);
      expect(getFuelIndications(state).engines.eng2.fuelCut).toMatch(/fire switch/);
      // It cannot be started while the switch is out
      expect(from(state, { type: "startEngine", engine: "eng2" }).running.eng2).toBe(false);
    });

    it("starts an engine with the start sequence (start lever to IDLE)", () => {
      const stopped = run({ type: "stopEngine", engine: "eng2" }, ...valveTravel("spar2"));
      const started = from(stopped, { type: "startEngine", engine: "eng2" });
      expect(started.startLevers.eng2).toBe("IDLE");
      expect(started.running.eng2).toBe(true);
    });

    it("cannot start an engine whose spar valve is stuck closed", () => {
      const state = run(
        { type: "stopEngine", engine: "eng1" },
        ...valveTravel("spar1"),
        { type: "setValveStuck", valve: "spar1", stuck: true },
        { type: "startEngine", engine: "eng1" },
      );
      expect(state.running.eng1).toBe(false);
      expect(getFuelIndications(state).engines.eng1.sparValveLight).toBe("bright");
    });
  });

  describe("center tank pumps", () => {
    const emptyCenter = () => run({ type: "setQuantity", tank: "center", kg: 0 });

    it("lights MASTER CAUTION after 10 s of one LOW PRESSURE light (FCOM 12.10.2)", () => {
      const state = emptyCenter();
      expect(fuelCautions(state)).toEqual([]);
      const late = from(state, { type: "centerLowPressureTimeout", pump: "ctrL", kind: "caution" });
      expect(fuelCautions(late)).toEqual([{ id: "fuel-low-pressure-ctrL" }]);
      // Switching the pump OFF puts the light out
      expect(fuelCautions(from(late, ...pumpsOff("ctrL")))).toEqual([]);
    });

    it("shuts a pump off on low pressure until its switch is cycled (FCOM 12.10.2)", () => {
      const state = from(emptyCenter(), { type: "centerLowPressureTimeout", pump: "ctrR", kind: "autoOff" });
      expect(state.centerPumpAutoOff.ctrR).toBe(true);
      const refilled = from(state, { type: "setQuantity", tank: "center", kg: 2000 });
      expect(getFuelIndications(refilled).pumps.ctrR.operating).toBe(false);
      const cycled = from(refilled, ...pumpsOff("ctrR"), { type: "setPumpSwitch", pump: "ctrR", on: true });
      expect(getFuelIndications(cycled).pumps.ctrR.operating).toBe(true);
    });
  });

  describe("main tank LOW PRESSURE cautions (FCOM 12.10.3)", () => {
    it("needs both lights of a tank for MASTER CAUTION; one shows on recall", () => {
      expect(fuelCautions(run(...pumpsOff("fwd2")))).toEqual([
        { id: "fuel-low-pressure-fwd2", recallOnly: true },
      ]);
      expect(fuelCautions(run(...pumpsOff("fwd2", "aft2")))).toEqual([{ id: "fuel-low-pressure-tank2" }]);
    });

    it("lights FILTER BYPASS on a contaminated filter", () => {
      const state = run({ type: "setFilterClogged", engine: "eng1", clogged: true });
      expect(getFuelIndications(state).engines.eng1.filterBypassLit).toBe(true);
      expect(fuelCautions(state)).toEqual([{ id: "fuel-filter-bypass-eng1" }]);
    });
  });

  describe("display alerts (FCOM 12.10.5-6)", () => {
    it("shows LOW below 453 kg until back above 567 kg", () => {
      const low = run({ type: "setQuantity", tank: "tank1", kg: 450 }, { type: "setQuantity", tank: "tank2", kg: 450 });
      expect(getFuelIndications(low).lowAlert.tank1).toBe(true);
      const partly = from(low, { type: "setQuantity", tank: "tank1", kg: 500 });
      expect(getFuelIndications(partly).lowAlert.tank1).toBe(true);
      expect(getFuelIndications(from(partly, { type: "setQuantity", tank: "tank1", kg: 570 })).lowAlert.tank1).toBe(false);
    });

    it("shows CONFIG with an engine running, center fuel and both center pumps OFF", () => {
      const state = run(...pumpsOff("ctrL", "ctrR"));
      expect(getFuelIndications(state).configAlert).toBe(true);
      expect(getFuelIndications(from(state, { type: "setQuantity", tank: "center", kg: 500 })).configAlert).toBe(true);
      expect(getFuelIndications(from(state, { type: "setQuantity", tank: "center", kg: 300 })).configAlert).toBe(false);
      expect(getFuelIndications(from(state, { type: "setPumpSwitch", pump: "ctrL", on: true })).configAlert).toBe(false);
    });

    it("shows IMBAL below the lower tank past 453 kg until down to 91 kg", () => {
      const state = run({ type: "setQuantity", tank: "tank2", kg: 3400 });
      expect(getFuelIndications(state).imbalAlert).toBe("tank2");
      expect(getFuelIndications(from(state, { type: "setQuantity", tank: "tank2", kg: 3800 })).imbalAlert).toBe("tank2");
      expect(getFuelIndications(from(state, { type: "setQuantity", tank: "tank2", kg: 3850 })).imbalAlert).toBe(null);
    });

    it("inhibits IMBAL while a LOW alert shows", () => {
      const state = run({ type: "setQuantity", tank: "tank2", kg: 400 });
      const lights = getFuelIndications(state);
      expect(lights.lowAlert.tank2).toBe(true);
      expect(lights.imbalAlert).toBe(null);
    });
  });

  describe("APU fuel feed (FCOM 12.20.3)", () => {
    it("takes fuel from the left manifold with the pumps running", () => {
      const state = run({ type: "startApu" }, { type: "tick", seconds: 100 });
      expect(state.running.apu).toBe(true);
      expect(state.quantityKg.center).toBeCloseTo(3000 - (2 * ENGINE_IDLE_FUEL_FLOW_KG_S + APU_FUEL_FLOW_KG_S) * 100);
    });

    it("suction feeds from main tank No. 1 without pumps", () => {
      const state = run(...pumpsOff("aft1", "fwd1", "ctrL", "ctrR"), { type: "startApu" });
      expect(getFuelIndications(state).apu.feed).toMatchObject({ kind: "suction", tanks: ["tank1"] });
    });

    it("shuts down on the APU fire shutoff", () => {
      const state = run({ type: "startApu" }, { type: "syncFire", fire: { ...noFire, apuShutoff: true } });
      expect(state.running.apu).toBe(false);
      expect(from(state, { type: "startApu" }).running.apu).toBe(false);
    });
  });

  describe("center tank scavenge jet pump (FCOM 12.20.3)", () => {
    it("starts at about half main tank No. 1 and keeps going", () => {
      const half = run({ type: "setQuantity", tank: "tank1", kg: 1900 }, ...pumpsOff("ctrL", "ctrR"));
      expect(getFuelIndications(half).scavengeActive).toBe(true);
      const later = from(half, { type: "tick", seconds: 100 });
      expect(later.quantityKg.center).toBeCloseTo(3000 - SCAVENGE_FLOW_KG_S * 100);
      // Main tank No. 1 above half again: it does not stop
      expect(getFuelIndications(from(later, { type: "setQuantity", tank: "tank1", kg: 2500 })).scavengeActive).toBe(true);
    });

    it("stops while main tank No. 1 is full, so no fuel is lost", () => {
      const half = run({ type: "setQuantity", tank: "tank1", kg: 1900 }, ...pumpsOff("ctrL", "ctrR"));
      const full = from(half, { type: "setQuantity", tank: "tank1", kg: TANK_CAPACITY_KG.tank1 });
      expect(getFuelIndications(full).scavengeActive).toBe(false);
      expect(from(full, { type: "tick", seconds: 100 }).quantityKg.center).toBe(3000);
    });

    it("needs the No. 1 FWD pump", () => {
      const state = run({ type: "setQuantity", tank: "tank1", kg: 1900 }, ...pumpsOff("fwd1"));
      expect(getFuelIndications(state).scavengeActive).toBe(false);
    });
  });

  describe("fueling station (FCOM 12.10.7-9, SP.12.4-5)", () => {
    const openDoor: FuelSystemAction = { type: "setFuelingDoor", open: true };

    it("refuels through the open fueling valves and stops each when full", () => {
      const state = run(
        { type: "setQuantity", tank: "tank1", kg: 3900 },
        openDoor,
        { type: "setFuelTruck", connected: true },
        { type: "setFuelingValveSwitch", tank: "tank1", open: true },
        { type: "setFuelingValveSwitch", tank: "center", open: true },
      );
      const lights = getFuelIndications(state);
      expect(lights.fueling.valveLightLit.tank1).toBe(true);
      const filled = from(state, { type: "tick", seconds: 10 });
      expect(filled.quantityKg.tank1).toBe(TANK_CAPACITY_KG.tank1);
      // The running engines burn center fuel meanwhile
      expect(filled.quantityKg.center).toBeCloseTo(
        3000 + (REFUEL_FLOW_KG_S * 10) / 2 - 2 * ENGINE_IDLE_FUEL_FLOW_KG_S * 10,
      );
      // Tank full: valve closed, light out
      expect(getFuelIndications(filled).fueling.valveLightLit.tank1).toBe(false);
    });

    it("needs the panel powered: door open or door switch bypassed", () => {
      const state = run({ type: "setFuelTruck", connected: true }, { type: "setFuelingValveSwitch", tank: "center", open: true });
      expect(getFuelIndications(state).fueling.valveOpen.center).toBe(false);
      const bypass = from(state, { type: "setFuelingTest", position: "FUEL DOOR SWITCH BYPASS" });
      expect(getFuelIndications(bypass).fueling.valveOpen.center).toBe(true);
    });

    it("transfers fuel from the main tanks to the center tank on the ground", () => {
      const state = run(
        { type: "stopEngine", engine: "eng1" },
        { type: "stopEngine", engine: "eng2" },
        ...pumpsOff("ctrL", "ctrR"),
        { type: "setCrossfeed", open: true },
        ...valveTravel("crossfeed"),
        { type: "setManualDefuelValve", open: true },
        openDoor,
        { type: "setFuelingValveSwitch", tank: "center", open: true },
        { type: "tick", seconds: 60 },
      );
      expect(state.quantityKg.center).toBeGreaterThan(3000);
      expect(state.quantityKg.tank1 + state.quantityKg.tank2 + state.quantityKg.center).toBeCloseTo(3915 * 2 + 3000);
      expect(state.quantityKg.tank1).toBeCloseTo(state.quantityKg.tank2);
    });
  });
});
