"use client";

import { useFire } from "../../simulation/fire/fire-context";
import type { EngineId } from "../../simulation/fire/fire-protection";

/**
 * Engine start lever with the red fire light in its handle (-800 YW001-YW164,
 * FCOM 8.10.3). Engine start is not simulated, so it stays at IDLE.
 */
function StartLever({ engine, lit }: { engine: 1 | 2; lit: boolean }) {
  return (
    <div
      className={`esl-lever eng${engine}${lit ? " lit" : ""}`}
      role="img"
      aria-label={`Engine ${engine} start lever, IDLE${lit ? ", fire light on" : ""}`}
      title={`Palanca de arranque ${engine} (IDLE). Luz roja: fuego en el motor o test OVHT/FIRE`}
    >
      <svg viewBox="0 0 50 66" aria-hidden="true">
        {/* Grip loop */}
        <path
          d="M13 30 V16 A12 12 0 0 1 37 16 V30"
          fill="none"
          stroke="#d4d8da"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M13 30 V16 A12 12 0 0 1 37 16 V30"
          fill="none"
          stroke="#7d8285"
          strokeWidth="1"
        />
        {/* Knob */}
        <ellipse cx="25" cy="43" rx="19" ry="20" fill="#1c1c1c" stroke="#050505" strokeWidth="1.5" />
        <ellipse cx="21" cy="36" rx="8" ry="5" fill="#ffffff" opacity="0.12" />
        {/* Red fire light segments */}
        <g className="esl-light">
          <path d="M9 36 Q8 43 10 50" />
          <path d="M41 36 Q42 43 40 50" />
          <path d="M15 56 L20 60" />
          <path d="M35 56 L30 60" />
        </g>
      </svg>
    </div>
  );
}

/** The two engine start levers (IDLE / CUTOFF) on the control stand. */
export function EngineStartLevers() {
  const { indications } = useFire();
  const isLit = (engine: EngineId) => indications.engines[engine].startLeverLit;

  return (
    <section className="aircraft-panel engine-start-levers" aria-label="Engine start levers">
      <span className="fp-label esl-number eng1">1</span>
      <span className="fp-label esl-number eng2">2</span>
      <span className="fp-label esl-position idle">IDLE</span>
      <span className="fp-label esl-position cutoff">CUTOFF</span>
      <i className="esl-slot eng1" />
      <i className="esl-slot eng2" />
      <StartLever engine={1} lit={isLit("eng1")} />
      <StartLever engine={2} lit={isLit("eng2")} />
    </section>
  );
}
