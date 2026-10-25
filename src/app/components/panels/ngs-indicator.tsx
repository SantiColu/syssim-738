"use client";

import { useFuel } from "../../simulation/fuel/fuel-context";
import type { NgsStatus } from "../../simulation/fuel/fuel-system";
import { Screw } from "./panel-parts";

/** Intrinsic size, for hosts that place the panel in a popover. */
export const NGS_INDICATOR_SIZE = { width: 250, height: 170 } as const;

const NGS_LIGHTS: { status: NgsStatus; color: string; label: string; sub: string; meaning: string }[] = [
  { status: "operational", color: "green", label: "OPERATIONAL", sub: "Serviceable", meaning: "NGS totalmente operativo" },
  { status: "degraded", color: "blue", label: "DEGRADED", sub: "Temporarily Serviceable", meaning: "NGS operativo pero degradado" },
  { status: "inoperative", color: "amber", label: "INOPERATIVE", sub: "Unserviceable", meaning: "NGS inoperativo" },
];

/**
 * Nitrogen generation system operability indicator, in the right main wheel
 * well next to the APU ground control panel (FCOM 12.10.10). No lights also
 * means NGS inoperative.
 */
export function NgsIndicator() {
  const { state } = useFuel();
  return (
    <section className="aircraft-panel ngs-indicator" aria-label="Nitrogen generation system indicator">
      <span className="fp-label ngs-title">Nitrogen Generation System</span>
      {NGS_LIGHTS.map(({ status, color, label, sub, meaning }) => {
        const lit = state.ngsStatus === status;
        return (
          <div key={status} className="ngs-row">
            <span
              className={`ngs-light ${color}${lit ? " lit" : ""}`}
              role="status"
              title={`${label}: ${lit ? `ENCENDIDA (${meaning})` : "apagada"}`}
            />
            <span className="ngs-text">
              <b>{label}</b>
              <small>{sub}</small>
            </span>
          </div>
        );
      })}
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
