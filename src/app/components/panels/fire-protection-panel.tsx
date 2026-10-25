"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useFire } from "../../simulation/fire/fire-context";
import type {
  FireSwitchId,
  FireSwitchRotation,
  LoopSelect,
} from "../../simulation/fire/fire-protection";
import { Placard, Screw } from "./panel-parts";
import { AircraftPushButton, AircraftToggleSwitch } from "./switches";

const isPushKey = (e: KeyboardEvent) => e.key === "Enter" || e.key === " ";

/** The rotated fire switch is held against its spring for about a second. */
const FIRE_SWITCH_ROTATION_MS = 1000;
/** A locked fire switch shakes, and its LOCK OVERRIDE button is pointed out. */
const LOCKED_FEEDBACK_MS = 900;

type SpringSide = "left" | "right";

/**
 * Toggle switch spring-loaded to center (TEST, EXT TEST): each half of the
 * switch holds it to that side while pressed and lets it return on release.
 */
export function SpringLoadedToggle({
  position,
  name,
  leftLabel,
  rightLabel,
  onHold,
  onRelease,
  size = 38,
}: {
  position: SpringSide | "center";
  name: string;
  leftLabel: string;
  rightLabel: string;
  onHold: (side: SpringSide) => void;
  onRelease: () => void;
  size?: number;
}) {
  const hitZone = (side: SpringSide) => {
    const label = side === "left" ? leftLabel : rightLabel;
    return (
      <button
        type="button"
        className={`fp-hit ${side}`}
        aria-label={`${name}: hold to ${label}`}
        title={`${name}: mantener presionado en ${label} (vuelve al centro al soltar)`}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onHold(side);
        }}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        onKeyDown={(e) => {
          if (isPushKey(e) && !e.repeat) onHold(side);
        }}
        onKeyUp={(e) => {
          if (isPushKey(e)) onRelease();
        }}
      />
    );
  };

  return (
    <div className="fp-switch-box" style={{ width: size, height: size }}>
      <AircraftToggleSwitch
        position={position === "left" ? "UP" : position === "right" ? "DOWN" : "CENTER"}
        orientation="horizontal"
        circleColor="red"
        size={size}
      />
      {hitZone("left")}
      {hitZone("right")}
    </div>
  );
}

const LOOP_POSITIONS: LoopSelect[] = ["A", "NORMAL", "B"];

/** OVHT DET switch: A (left), NORMAL (center), B (right). */
function OverheatDetectorSwitch({
  engine,
  select,
  onSelect,
}: {
  engine: 1 | 2;
  select: LoopSelect;
  onSelect: (select: LoopSelect) => void;
}) {
  const index = LOOP_POSITIONS.indexOf(select);
  const step = (direction: -1 | 1) => {
    const next = LOOP_POSITIONS[index + direction];
    if (next) onSelect(next);
  };
  const name = `ENG ${engine} OVHT DET`;
  const positionLabel = (position: LoopSelect) => (
    <button
      type="button"
      className={`fp-pos-label${select === position ? " active" : ""}`}
      aria-label={`${name}: ${position}`}
      aria-pressed={select === position}
      onClick={() => onSelect(position)}
    >
      {position}
    </button>
  );

  return (
    <div className={`fp-ovht-det eng${engine}`}>
      <span className="fp-label">OVHT DET</span>
      <div className="fp-ovht-row">
        {positionLabel("A")}
        <div
          className="fp-switch-box"
          style={{ width: 40, height: 40 }}
          onWheel={(e) => step(e.deltaY < 0 ? -1 : 1)}
        >
          <AircraftToggleSwitch
            position={select === "A" ? "UP" : select === "B" ? "DOWN" : "CENTER"}
            orientation="horizontal"
            size={40}
          />
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              className={`fp-hit ${direction < 0 ? "left" : "right"}`}
              aria-label={`${name}: move toward ${direction < 0 ? "A" : "B"} (now ${select})`}
              title={`${name} (${select}): clic a la izquierda o derecha, o rueda del ratón, para mover el selector`}
              onClick={() => step(direction)}
            />
          ))}
        </div>
        {positionLabel("B")}
      </div>
      {positionLabel("NORMAL")}
    </div>
  );
}

/** "DISCH" with the L / R rotation arrows printed on top of each fire switch. */
function DischargeLegend() {
  return (
    <span className="fp-disch-legend">
      <span>DISCH</span>
      <svg viewBox="0 0 40 16" aria-hidden="true">
        <path d="M10 9 Q20 2 30 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 10.5 L12.3 10.5 L9.4 6.4 Z M32 10.5 L27.7 10.5 L30.6 6.4 Z" fill="currentColor" />
        <text x="1" y="15" fontSize="7" fill="currentColor">L</text>
        <text x="34" y="15" fontSize="7" fill="currentColor">R</text>
      </svg>
    </span>
  );
}

/**
 * Engine / APU fire switch (T-handle). In: mechanically locked unless a fire
 * signal unlocks it or LOCK OVERRIDE is pressed. Up: rotates left or right to
 * discharge, and pushes back in.
 */
function FireSwitch({
  id,
  label,
  lit,
  unlocked,
  pulled,
}: {
  id: FireSwitchId;
  label: string;
  lit: boolean;
  unlocked: boolean;
  pulled: boolean;
}) {
  const { dispatch } = useFire();
  const [rotation, setRotation] = useState<FireSwitchRotation | null>(null);
  const [lockedFeedback, setLockedFeedback] = useState(false);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
      if (lockedTimerRef.current) clearTimeout(lockedTimerRef.current);
    };
  }, []);

  const name = id === "apu" ? "APU fire switch" : `Engine ${label} fire switch`;

  const handleClick = () => {
    if (pulled) {
      dispatch({ type: "stowFireSwitch", id });
      return;
    }
    if (unlocked) {
      dispatch({ type: "pullFireSwitch", id });
      return;
    }
    // Locked: it does not move
    setLockedFeedback(true);
    if (lockedTimerRef.current) clearTimeout(lockedTimerRef.current);
    lockedTimerRef.current = setTimeout(() => setLockedFeedback(false), LOCKED_FEEDBACK_MS);
  };

  const rotate = (direction: FireSwitchRotation) => {
    dispatch({ type: "rotateFireSwitch", id, direction });
    setRotation(direction);
    if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
    rotationTimerRef.current = setTimeout(() => setRotation(null), FIRE_SWITCH_ROTATION_MS);
  };

  const status = pulled ? "up (pulled)" : unlocked ? "in, unlocked" : "in, locked";
  const title = pulled
    ? "Manija arriba: girar con las flechas laterales para descargar la botella; clic para empujarla adentro"
    : unlocked
      ? "Desbloqueada: clic para tirar de la manija"
      : "Bloqueada mecánicamente (sin señal de fuego). Usar LOCK OVERRIDE debajo de la manija";

  return (
    <div className={`fp-fire-switch ${id}`}>
      <span className="fp-handle-well" aria-hidden="true" />
      <span className={`fp-handle-shaft${pulled ? " visible" : ""}`} aria-hidden="true" />
      <button
        type="button"
        className={[
          "fp-handle",
          lit && "lit",
          pulled && "pulled",
          rotation && `rotated-${rotation}`,
          lockedFeedback && "locked",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={pulled}
        aria-label={`${name}${lit ? ", illuminated" : ""}, ${status}. ${pulled ? "Click to push it in" : unlocked ? "Click to pull" : "Locked"}`}
        title={title}
        onClick={handleClick}
      >
        <DischargeLegend />
        <span className={`fp-handle-number${label.length > 1 ? " stacked" : ""}`}>
          {label.split("").map((char) => (
            <span key={char}>{char}</span>
          ))}
        </span>
      </button>

      {pulled && (
        <>
          <button
            type="button"
            className="fp-rotate left"
            aria-label={`${name}: rotate left (discharge)`}
            title="Girar a la izquierda (L): descarga"
            onClick={() => rotate("L")}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M15 14 A6 6 0 1 0 5 9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M2 6 L5 10 L8.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>L</span>
          </button>
          <button
            type="button"
            className="fp-rotate right"
            aria-label={`${name}: rotate right (discharge)`}
            title="Girar a la derecha (R): descarga"
            onClick={() => rotate("R")}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 14 A6 6 0 1 1 15 9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M18 6 L15 10 L11.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>R</span>
          </button>
        </>
      )}

      {/* LOCK OVERRIDE: the button under the handle releases the lock */}
      <button
        type="button"
        className={`fp-override${lockedFeedback ? " hint" : ""}`}
        aria-label={`${name}: LOCK OVERRIDE, press to pull the handle without a fire signal`}
        title="LOCK OVERRIDE: pulsar para desbloquear y tirar de la manija"
        disabled={pulled}
        onClick={() => dispatch({ type: "pullFireSwitch", id, override: true })}
      >
        OVRD
      </button>
    </div>
  );
}

/** Round green EXT TEST lens. */
export function FireTestLens({
  lit,
  label,
  className = "",
}: {
  lit: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`fp-lens ${className}${lit ? " lit" : ""}`}
      role="status"
      aria-label={`${label} ${lit ? "on" : "off"}`}
      title={label}
    />
  );
}

/**
 * Overheat/fire protection panel on the aft electronic panel (FCOM 8.10.1-4):
 * detector loop selection, tests, the three fire switches and their lights.
 */
export function FireProtectionPanel() {
  const { state, indications, dispatch } = useFire();
  const { engines } = indications;

  const fireTestSide =
    state.fireTest === "FAULT/INOP" ? "left" : state.fireTest === "OVHT/FIRE" ? "right" : "center";
  const extTestSide = state.extTest === "1" ? "left" : state.extTest === "2" ? "right" : "center";

  return (
    <section
      className="aircraft-panel fire-protection-panel"
      aria-label="Overheat and fire protection panel"
    >
      {/* Engine 1 detection */}
      <OverheatDetectorSwitch
        engine={1}
        select={state.ovhtDet.eng1}
        onSelect={(select) => dispatch({ type: "setOvhtDet", engine: "eng1", select })}
      />
      <div className="fp-overheat eng1">
        <Placard lit={engines.eng1.overheatLit}>
          ENG 1
          <br />
          OVERHEAT
        </Placard>
      </div>

      {/* FAULT/INOP – OVHT/FIRE TEST, spring-loaded to center */}
      <div className="fp-test">
        <span className="fp-label">TEST</span>
        <div className="fp-test-row">
          <span className="fp-vertical">FAULT</span>
          <span className="fp-vertical">INOP</span>
          <SpringLoadedToggle
            position={fireTestSide}
            name="Fire TEST switch"
            leftLabel="FAULT/INOP"
            rightLabel="OVHT/FIRE"
            onHold={(side) =>
              dispatch({
                type: "setFireTest",
                position: side === "left" ? "FAULT/INOP" : "OVHT/FIRE",
              })
            }
            onRelease={() => dispatch({ type: "setFireTest", position: "CENTER" })}
          />
          <span className="fp-vertical">OVHT</span>
          <span className="fp-vertical">FIRE</span>
        </div>
      </div>

      <FireSwitch
        id="eng1"
        label="1"
        lit={engines.eng1.fireSwitchLit}
        unlocked={engines.eng1.unlocked}
        pulled={state.fireSwitches.eng1}
      />

      {/* Center lights */}
      <div className="fp-center-lights">
        <Placard color="red" lit={indications.wheelWellLit}>
          WHEEL
          <br />
          WELL
        </Placard>
        <Placard lit={indications.faultLit}>FAULT</Placard>
        <Placard lit={indications.apuDetInopLit}>
          APU DET
          <br />
          INOP
        </Placard>
        <Placard lit={indications.bottleDischargeLit.apu}>
          APU BOTTLE
          <br />
          DISCHARGE
        </Placard>
      </div>

      {/* BELL CUTOUT: same as pushing either FIRE WARN light */}
      <span className="fp-bell-label">BELL CUTOUT</span>
      <div
        className="fp-bell-cutout"
        role="button"
        tabIndex={0}
        aria-label="Fire warning BELL CUTOUT"
        title="BELL CUTOUT: apaga FIRE WARN, silencia la campana y rearma el sistema"
        onKeyDown={(e) => {
          if (isPushKey(e)) dispatch({ type: "pushFireWarn" });
        }}
      >
        <AircraftPushButton size={26} onClick={() => dispatch({ type: "pushFireWarn" })} />
      </div>

      <FireSwitch
        id="apu"
        label="APU"
        lit={indications.apuFireSwitchLit}
        unlocked={indications.apuFireSwitchUnlocked}
        pulled={state.fireSwitches.apu}
      />

      {/* Engine 2 detection */}
      <OverheatDetectorSwitch
        engine={2}
        select={state.ovhtDet.eng2}
        onSelect={(select) => dispatch({ type: "setOvhtDet", engine: "eng2", select })}
      />
      <div className="fp-overheat eng2">
        <Placard lit={engines.eng2.overheatLit}>
          ENG 2
          <br />
          OVERHEAT
        </Placard>
      </div>

      <div className="fp-instructions">
        <u>FIRE SWITCHES</u>
        <span>(FUEL SHUTOFF)</span>
        <span>PULL WHEN ILLUMINATED</span>
        <span>LOCK OVERRIDE: PRESS</span>
        <span>BUTTON UNDER HANDLE</span>
      </div>

      <FireSwitch
        id="eng2"
        label="2"
        lit={engines.eng2.fireSwitchLit}
        unlocked={engines.eng2.unlocked}
        pulled={state.fireSwitches.eng2}
      />

      {/* Engine bottles and extinguisher test */}
      <div className="fp-bottle-lights">
        <Placard lit={indications.bottleDischargeLit.left}>
          L BOTTLE
          <br />
          DISCHARGE
        </Placard>
        <Placard lit={indications.bottleDischargeLit.right}>
          R BOTTLE
          <br />
          DISCHARGE
        </Placard>
      </div>
      <span className="fp-label fp-engines-label">ENGINES</span>
      <div className="fp-ext-test-label">
        <span className="fp-vertical">EXT</span>
        <span className="fp-vertical">TEST</span>
      </div>
      <div className="fp-ext-test">
        <span className="fp-label">1</span>
        <SpringLoadedToggle
          position={extTestSide}
          name="EXT TEST switch"
          leftLabel="1"
          rightLabel="2"
          size={34}
          onHold={(side) =>
            dispatch({ type: "setExtTest", position: side === "left" ? "1" : "2" })
          }
          onRelease={() => dispatch({ type: "setExtTest", position: "CENTER" })}
        />
        <span className="fp-label">2</span>
      </div>
      <div className="fp-ext-lenses">
        <span className="fp-label fp-lens-label l">L</span>
        <span className="fp-label fp-lens-label r">R</span>
        <span className="fp-label fp-lens-label apu">APU</span>
        <FireTestLens className="l" lit={indications.extTestLit.left} label="Left bottle EXT TEST light" />
        <FireTestLens className="r" lit={indications.extTestLit.right} label="Right bottle EXT TEST light" />
        <FireTestLens className="apu" lit={indications.extTestLit.apu} label="APU bottle EXT TEST light" />
      </div>

      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
