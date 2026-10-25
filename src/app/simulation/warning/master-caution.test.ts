import { describe, expect, it } from "vitest";
import {
  getMasterCautionLights,
  pruneAcknowledged,
  SYSTEM_ANNUNCIATORS,
  updateAcknowledged,
  type CautionSource,
} from "./master-caution";

const PACK_L: CautionSource = { id: "pack-l", annunciator: "AIR COND" };
const DUAL_BLEED: CautionSource = { id: "dual-bleed", annunciator: "AIR COND" };
const WINDOW_OVHT: CautionSource = { id: "window-ovht-fwdL", annunciator: "ANTI-ICE" };

describe("master caution", () => {
  it("has the twelve system annunciators of FCOM 15.10.1", () => {
    expect([...SYSTEM_ANNUNCIATORS.capt, ...SYSTEM_ANNUNCIATORS.fo]).toHaveLength(12);
  });

  it("is dark with no amber light on", () => {
    const lights = getMasterCautionLights([], []);
    expect(lights.masterCaution).toBe(false);
    expect(lights.annunciators.size).toBe(0);
  });

  it("lights MASTER CAUTION and the related annunciators", () => {
    const lights = getMasterCautionLights([PACK_L, WINDOW_OVHT], []);
    expect(lights.masterCaution).toBe(true);
    expect([...lights.annunciators].sort()).toEqual(["AIR COND", "ANTI-ICE"]);
  });

  it("goes dark once every active caution is reset", () => {
    const lights = getMasterCautionLights([PACK_L, WINDOW_OVHT], ["pack-l", "window-ovht-fwdL"]);
    expect(lights.masterCaution).toBe(false);
    expect(lights.annunciators.size).toBe(0);
  });

  it("lights again for an additional caution after a reset", () => {
    const lights = getMasterCautionLights([PACK_L, DUAL_BLEED], ["pack-l"]);
    expect(lights.masterCaution).toBe(true);
    expect([...lights.annunciators]).toEqual(["AIR COND"]);
  });

  it("forgets a reset caution once its light goes out", () => {
    expect(pruneAcknowledged(["pack-l", "dual-bleed"], [DUAL_BLEED])).toEqual(["dual-bleed"]);
    // the PACK light coming back on is a new caution
    const lights = getMasterCautionLights([PACK_L, DUAL_BLEED], ["dual-bleed"]);
    expect(lights.masterCaution).toBe(true);
  });

  it("keeps a recall-only light dark until recall", () => {
    const fwd2: CautionSource = { id: "fuel-low-pressure-fwd2", annunciator: "FUEL", recallOnly: true };
    const acknowledged = updateAcknowledged([], [], [fwd2]);
    expect(getMasterCautionLights([fwd2], acknowledged).masterCaution).toBe(false);
    // Recall forgets every reset: the light comes on with MASTER CAUTION
    expect(getMasterCautionLights([fwd2], []).masterCaution).toBe(true);
    // Still on, and not new: it stays as the recall left it
    expect(updateAcknowledged([], [fwd2.id], [fwd2])).toEqual([]);
  });
});
