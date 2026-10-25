"use client";

import { type KeyboardEvent, type PointerEvent } from "react";
import { useFuel } from "../../simulation/fuel/fuel-context";
import type { FuelingTestPosition, TankId } from "../../simulation/fuel/fuel-system";
import { Screw } from "./panel-parts";
import { AircraftToggleSwitch } from "./switches";

const isPushKey = (e: KeyboardEvent) => e.key === "Enter" || e.key === " ";

/** Intrinsic size, for hosts that place the panel in a popover. */
export const FUELING_PANEL_SIZE = { width: 400, height: 210 } as const;

// Left to right as seen under the right wing leading edge (FCOM 12.10.9)
const PANEL_TANKS: { tank: TankId; label: string; mark: string }[] = [
  { tank: "tank2", label: "TANK 2", mark: "2" },
  { tank: "center", label: "CENTER TANK", mark: "C" },
  { tank: "tank1", label: "TANK 1", mark: "1" },
];

/** FUELING INDICATION TEST switch: spring-loaded to OFF, held up or down. */
function FuelingTestSwitch() {
  const { state, dispatch } = useFuel();
  const position = state.fuelingTest;
  const hold = (next: FuelingTestPosition) => dispatch({ type: "setFuelingTest", position: next });
  const release = () => dispatch({ type: "setFuelingTest", position: "OFF" });
  const hit = (side: "top" | "bottom", target: FuelingTestPosition, text: string) => (
    <button
      type="button"
      className={`fueling-hit ${side}`}
      aria-label={`Fueling indication test: hold to ${target}`}
      title={`${text} (mantener presionado; vuelve a OFF al soltar)`}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        hold(target);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if (isPushKey(e) && !e.repeat) hold(target);
      }}
      onKeyUp={(e) => {
        if (isPushKey(e)) release();
      }}
    />
  );
  return (
    <div className="fueling-test">
      <span className="fp-label fueling-small">TEST</span>
      <span className="fp-label fueling-small">GAGES</span>
      <div className="fueling-test-switch">
        <AircraftToggleSwitch
          position={position === "TEST GAGES" ? "UP" : position === "OFF" ? "CENTER" : "DOWN"}
          size={34}
        />
        {hit("top", "TEST GAGES", "TEST GAGES: prueba los indicadores de cantidad del panel")}
        {hit("bottom", "FUEL DOOR SWITCH BYPASS", "FUEL DOOR SWITCH BYPASS: energiza el panel aunque falle el relé de la puerta")}
        <span className="fp-label fueling-off">OFF</span>
      </div>
      <span className="fp-label fueling-small">FUEL</span>
      <span className="fp-label fueling-small">DOOR</span>
      <span className="fp-label fueling-small">SWITCH</span>
      <span className="fp-label fueling-small">BYPASS</span>
    </div>
  );
}

function TankColumn({ tank, label, mark }: { tank: TankId; label: string; mark: string }) {
  const { state, indications, dispatch } = useFuel();
  const { fueling } = indications;
  const open = state.fuelingValveSwitches[tank];
  const lit = fueling.valveLightLit[tank];
  const set = (next: boolean) => {
    if (next !== open) dispatch({ type: "setFuelingValveSwitch", tank, open: next });
  };
  const kg = Math.round(indications.quantityKg[tank]);
  const shown = !fueling.panelPowered ? "" : fueling.testGages ? "8888" : String(kg);
  return (
    <div className="fueling-column">
      <span
        className={`fueling-valve-light${lit ? " lit" : ""}`}
        role="status"
        title={`VALVE POSITION · ${label}: ${
          lit ? "ENCENDIDA (válvula energizada y el tanque no está lleno)" : "apagada (switch CLOSED, tanque lleno o panel sin energía)"
        }${fueling.valveOpen[tank] ? " · cargando" : ""}`}
      />
      <span className="fp-label fueling-small">OPEN</span>
      <div title={`Fueling valve ${label}: ${open ? "OPEN" : "CLOSED"} (clic o rueda)`}>
        <AircraftToggleSwitch
          position={open ? "UP" : "DOWN"}
          onClick={() => set(!open)}
          onWheelStep={(direction) => set(direction < 0)}
          size={30}
        />
      </div>
      <span className="fp-label fueling-small">CLOSED</span>
      <div
        className="fueling-gage"
        role="status"
        title={`FUEL QTY ${label}: ${fueling.panelPowered ? `${kg} kg` : "panel sin energía (puerta cerrada)"}`}
      >
        <span className="fueling-gage-title">FUEL QTY</span>
        <span className="fueling-gage-value">{shown}</span>
        <span className="fueling-gage-unit">KG</span>
        <span className="fueling-gage-mark">{mark}</span>
      </div>
      <span className="fp-label fueling-tank">{label}</span>
    </div>
  );
}

/**
 * Test gages and fueling panel (P15) at the fueling station under the right
 * wing leading edge (FCOM 12.10.9). Opening its door powers it; the fueling
 * valves open with fuel pressure (truck, or the pumps through the manual
 * defueling valve for a ground transfer) until their tank is full.
 */
export function FuelingPanel() {
  const { indications } = useFuel();
  return (
    <section
      className={`aircraft-panel fueling-panel${indications.fueling.panelPowered ? " powered" : ""}`}
      aria-label="Test gages and fueling panel"
    >
      <div className="fueling-title">
        <span className="fp-label">VALVE&nbsp;&nbsp;POSITION&nbsp;&nbsp;LIGHTS</span>
      </div>
      <FuelingTestSwitch />
      <div className="fueling-tanks">
        {PANEL_TANKS.map((props) => (
          <TankColumn key={props.tank} {...props} />
        ))}
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
