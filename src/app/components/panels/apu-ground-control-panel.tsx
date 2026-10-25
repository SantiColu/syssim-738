"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useFire } from "../../simulation/fire/fire-context";
import { Screw } from "./panel-parts";

const isPushKey = (e: KeyboardEvent) => e.key === "Enter" || e.key === " ";

/** Intrinsic size, for hosts that place the panel in a popover. */
export const APU_GROUND_CONTROL_PANEL_SIZE = { width: 300, height: 220 } as const;

/** How long the "not armed" hint stays up after moving an unarmed switch. */
const UNARMED_HINT_MS = 1600;

/**
 * APU ground control panel (P28) in the right main wheel well (FCOM 8.10.8).
 * The handle shuts the APU down from the ground and arms the BOTTLE DISCHARGE
 * switch; the horn has no audio, so its grille animates while it sounds.
 */
export function ApuGroundControlPanel() {
  const { state, indications, dispatch } = useFire();
  const handlePulled = state.apuGroundHandlePulled;
  const { apuGroundLight, hornSounding } = indications;

  // Spring-loaded to the right: held left only while pressed
  const [dischargeHeld, setDischargeHeld] = useState(false);
  // The safety wire breaks the first time the switch is moved
  const [wireBroken, setWireBroken] = useState(false);
  const [showUnarmedHint, setShowUnarmedHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const pressDischarge = () => {
    setDischargeHeld(true);
    setWireBroken(true);
    // Armed only with the handle pulled at this panel; the reducer ignores it otherwise
    dispatch({ type: "apuGroundDischarge" });
    if (!handlePulled) {
      setShowUnarmedHint(true);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setShowUnarmedHint(false), UNARMED_HINT_MS);
    }
  };
  const releaseDischarge = () => setDischargeHeld(false);

  const handleDischargePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pressDischarge();
  };

  return (
    <section
      className="aircraft-panel apu-ground-panel"
      aria-label="APU ground control panel (right main wheel well)"
    >
      {/* Remote APU fire warning horn: no audio, the grille shows it sounding */}
      <div
        className={`agp-horn${hornSounding ? " sounding" : ""}`}
        role="status"
        aria-label={hornSounding ? "APU fire warning horn sounding" : "APU fire warning horn silent"}
        title="Bocina de fuego del APU (sin audio: las ondas indican que suena)"
      >
        <span className="agp-horn-grille" />
        <span className="agp-horn-waves">
          <i />
          <i />
        </span>
        <span className="agp-horn-label">HORN</span>
      </div>

      {/* APU fire control handle: up normal, down pulled */}
      <div className="agp-handle-track" aria-hidden="true" />
      <button
        type="button"
        className={`agp-handle${handlePulled ? " pulled" : ""}`}
        aria-pressed={handlePulled}
        aria-label={`APU fire control handle, ${handlePulled ? "down (pulled)" : "up (normal)"}. Click to ${handlePulled ? "push it back up" : "pull it down"}`}
        title={
          handlePulled
            ? "Manija abajo: APU cortado y BOTTLE DISCHARGE armado. Clic para subirla"
            : "Manija arriba (normal). Clic para tirarla hacia abajo"
        }
        onClick={() => dispatch({ type: "setApuGroundHandle", pulled: !handlePulled })}
      >
        <span className="agp-handle-grip" />
        <span className="agp-placard">
          <b>A.P.U.</b>
          <b>FIRE</b>
          <b>CONTROL</b>
          <small>1.PULL HANDLE DOWN</small>
          <small>2.DISCHARGE BOTTLE</small>
          <small className="agp-placard-arrow">◀ BOTTLE DISCHARGE</small>
        </span>
      </button>
      <span className={`agp-cable${handlePulled ? " pulled" : ""}`} aria-hidden="true" />

      {/* BOTTLE DISCHARGE: spring-loaded right and safety wired, left discharges */}
      <div className="agp-discharge">
        <button
          type="button"
          className={`agp-discharge-switch${dischargeHeld ? " held" : ""}${handlePulled ? " armed" : ""}`}
          aria-label={`APU BOTTLE DISCHARGE switch, hold to move left and discharge. ${handlePulled ? "Armed" : "Not armed: pull the handle down first"}`}
          title={
            handlePulled
              ? "Mantener presionado: mueve el interruptor a la izquierda y descarga la botella del APU"
              : "Sin armar: no hace nada hasta tirar la manija hacia abajo"
          }
          onPointerDown={handleDischargePointerDown}
          onPointerUp={releaseDischarge}
          onPointerCancel={releaseDischarge}
          onKeyDown={(e) => {
            if (isPushKey(e) && !e.repeat) pressDischarge();
          }}
          onKeyUp={(e) => {
            if (isPushKey(e)) releaseDischarge();
          }}
        >
          <span className="agp-switch-slot" />
          <span className="agp-switch-bat" />
          {!wireBroken && <span className="agp-safety-wire" />}
        </button>
        <span className="agp-red-tag">
          BOTTLE
          <br />
          DISCHARGE
        </span>
        {showUnarmedHint && (
          <span className="agp-hint" role="status">
            NOT ARMED
            <br />
            PULL HANDLE
          </span>
        )}
      </div>

      {/* HORN CUTOUT: silences bell and horn, the light stops flashing */}
      <div className="agp-cutout">
        <button
          type="button"
          className="agp-cutout-button"
          aria-label="APU fire warning HORN CUTOUT"
          title="HORN CUTOUT: silencia la campana y la bocina; la luz queda fija"
          onClick={() => dispatch({ type: "pushHornCutout" })}
        />
        <span className="agp-white-tag">
          HORN
          <br />
          CUTOUT
        </span>
      </div>

      {/* APU fire warning light: flashing on an APU fire, steady after HORN CUTOUT */}
      <span
        className={`agp-warning-light ${apuGroundLight}`}
        role="status"
        aria-label={`APU fire warning light ${apuGroundLight === "off" ? "off" : apuGroundLight}`}
        title="Luz de fuego del APU: destella con fuego, fija tras HORN CUTOUT"
      />

      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
