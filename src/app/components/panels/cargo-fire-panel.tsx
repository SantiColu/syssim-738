"use client";

import { useState, type KeyboardEvent } from "react";
import { useFire } from "../../simulation/fire/fire-context";
import type { CargoCompartment, LoopSelect } from "../../simulation/fire/fire-protection";
import { FireTestLens } from "./fire-protection-panel";
import { PointerKnob } from "./knobs";
import { Placard, Screw } from "./panel-parts";
import { AircraftPushButton } from "./switches";

const isPushKey = (e: KeyboardEvent) => e.key === "Enter" || e.key === " ";

const DET_SELECT_POSITIONS: LoopSelect[] = ["A", "NORMAL", "B"];
const DET_SELECT_ANGLE: Record<LoopSelect, number> = { A: -45, NORMAL: 0, B: 45 };
/** PointerKnob is drawn at 90 px; the DET SELECT knobs are smaller. */
const DET_SELECT_KNOB_SCALE = 0.42;

const COMPARTMENT_LABEL: Record<CargoCompartment, string> = { fwd: "FWD", aft: "AFT" };

/** DET SELECT rotary: A, NORM (both loops) or B. */
function DetectorSelect({
  compartment,
  select,
  onSelect,
}: {
  compartment: CargoCompartment;
  select: LoopSelect;
  onSelect: (select: LoopSelect) => void;
}) {
  const index = DET_SELECT_POSITIONS.indexOf(select);
  const step = (direction: number) => {
    const next = DET_SELECT_POSITIONS[index + direction];
    if (next) onSelect(next);
  };
  const name = `${COMPARTMENT_LABEL[compartment]} DET SELECT`;
  const positionLabel = (position: LoopSelect, text: string) => (
    <button
      type="button"
      className={`cf-pos-label ${position.toLowerCase()}${select === position ? " active" : ""}`}
      aria-label={`${name}: ${text}`}
      aria-pressed={select === position}
      onClick={() => onSelect(position)}
    >
      {text}
    </button>
  );

  return (
    <div className={`cf-det-select ${compartment}`}>
      {positionLabel("NORMAL", "NORM")}
      {positionLabel("A", "A")}
      {positionLabel("B", "B")}
      {/* Wheel up turns clockwise, like the other knobs */}
      <div className="cf-knob" onWheel={(e) => step(e.deltaY < 0 ? 1 : -1)}>
        <div style={{ transform: `scale(${DET_SELECT_KNOB_SCALE})`, transformOrigin: "0 0" }}>
          <PointerKnob angle={DET_SELECT_ANGLE[select]} />
        </div>
        {([-1, 1] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            className={`fp-hit ${direction < 0 ? "left" : "right"}`}
            aria-label={`${name}: turn toward ${direction < 0 ? "A" : "B"} (now ${select === "NORMAL" ? "NORM" : select})`}
            title={`${name}: clic a la izquierda o derecha para girar el selector`}
            onClick={() => step(direction)}
          />
        ))}
      </div>
      <span className="fp-label cf-knob-label">{COMPARTMENT_LABEL[compartment]}</span>
    </div>
  );
}

/** ARM push switch: ARMED (white) above, the compartment fire warning (red) below. */
function CargoArmSwitch({ compartment }: { compartment: CargoCompartment }) {
  const { indications, dispatch } = useFire();
  const { armed, lit } = indications.cargo[compartment];
  const label = COMPARTMENT_LABEL[compartment];

  return (
    <button
      type="button"
      className="cf-arm"
      aria-pressed={armed}
      aria-label={`Cargo fire ARM ${label}${armed ? ", armed" : ""}${lit ? ", fire warning" : ""}. Push to ${armed ? "disarm" : "arm"}`}
      title={`ARM ${label}: pulsar para ${armed ? "desarmar" : "armar"} la descarga hacia el compartimiento ${label}`}
      onClick={() => dispatch({ type: "toggleCargoArm", compartment })}
    >
      <span className={`cf-arm-armed${armed ? " lit" : ""}`}>ARMED</span>
      <span className={`cf-arm-warning${lit ? " lit" : ""}`}>{label}</span>
    </button>
  );
}

/**
 * Cargo fire panel on the aft electronic panel (FCOM 8.10.5-6), single bottle
 * (YC496-YW164): detector loop selection, test, arming and discharge.
 */
export function CargoFirePanel() {
  const { state, indications, dispatch } = useFire();
  const [guardOpen, setGuardOpen] = useState(false);

  const pressTest = () => dispatch({ type: "setCargoTest", pressed: true });
  const releaseTest = () => dispatch({ type: "setCargoTest", pressed: false });

  return (
    <section className="aircraft-panel cargo-fire-panel" aria-label="Cargo fire panel">
      <span className="fp-label cf-side-label cargo">CARGO</span>
      <span className="fp-label cf-side-label fire">FIRE</span>

      {/* Squib continuity, lit while TEST is pushed */}
      <div className="cf-ext">
        <span className="fp-label">EXT</span>
        <div className="cf-ext-lenses">
          <span className="fp-label">FWD</span>
          <span className="fp-label">AFT</span>
          <FireTestLens lit={indications.cargo.fwd.extTestLit} label="Cargo EXT FWD light" />
          <FireTestLens lit={indications.cargo.aft.extTestLit} label="Cargo EXT AFT light" />
        </div>
      </div>

      <div
        className="cf-test"
        role="button"
        tabIndex={0}
        aria-label="Cargo fire TEST switch, hold to test"
        title="TEST: mantener presionado para probar detectores y squibs de carga"
        onKeyDown={(e) => {
          if (isPushKey(e) && !e.repeat) pressTest();
        }}
        onKeyUp={(e) => {
          if (isPushKey(e)) releaseTest();
        }}
      >
        <span className="fp-label">TEST</span>
        <AircraftPushButton size={30} onPressStart={pressTest} onPressEnd={releaseTest} />
      </div>

      <div className="cf-det-select-title">
        <span className="fp-label">DET SELECT</span>
      </div>
      <DetectorSelect
        compartment="fwd"
        select={state.cargoDetSelect.fwd}
        onSelect={(select) => dispatch({ type: "setCargoDetSelect", compartment: "fwd", select })}
      />
      <DetectorSelect
        compartment="aft"
        select={state.cargoDetSelect.aft}
        onSelect={(select) => dispatch({ type: "setCargoDetSelect", compartment: "aft", select })}
      />

      <div className="cf-detector-fault">
        <Placard lit={indications.cargoDetectorFault}>
          DETECTOR
          <br />
          FAULT
        </Placard>
      </div>

      <div className="cf-arm-title">
        <span className="fp-label">ARM</span>
      </div>
      <div className="cf-arm-row">
        <CargoArmSwitch compartment="fwd" />
        <CargoArmSwitch compartment="aft" />
      </div>

      {/* Guarded DISCH switch: open the guard, then push; the legend is the DISCH light */}
      <div className="cf-disch">
        <span className="fp-label">DISCH</span>
        <div className={`cf-disch-switch${guardOpen ? " open" : ""}`}>
          <button
            type="button"
            className={`cf-disch-button${indications.cargoDischLit ? " lit" : ""}`}
            aria-label={`Cargo fire DISCH switch${indications.cargoDischLit ? ", DISCH light on" : ""}. Push to discharge the armed compartments`}
            title="DISCH: descarga la botella hacia los compartimientos armados"
            disabled={!guardOpen}
            onClick={() => dispatch({ type: "cargoDischarge" })}
          >
            <span className="cf-disch-legend">DISCH</span>
          </button>
          <button
            type="button"
            className="cf-guard"
            aria-expanded={guardOpen}
            aria-label={`DISCH switch guard, ${guardOpen ? "open: click to close" : "closed: click to open"}`}
            title={guardOpen ? "Clic para cerrar la tapa" : "Tapa de protección: clic para abrirla"}
            onClick={() => setGuardOpen((open) => !open)}
          >
            <i className="cf-guard-hinge" />
            <i className="cf-guard-hinge" />
            <i className="cf-guard-stripe" />
          </button>
        </div>
      </div>

      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
